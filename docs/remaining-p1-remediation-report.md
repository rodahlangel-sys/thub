# THub 剩余 P1 修复报告

更新时间：2026-06-18

## 1. 中断恢复结论

- 恢复时仓库只有 Create Next App 初始提交，产品代码大多为未跟踪文件，因此无法仅凭 `git diff` 精确归因上一线程。
- 已确认并保护既有实现：服务端订单金额计算、重复预约保护、证明材料审核、退款驳回恢复、5% 平台信息服务费、95% 大学生模拟结算、Settlement 唯一性及三端现有页面。
- 恢复时 `src/lib/env.ts`、通知业务幂等、综合一致性脚本和本报告均不存在；课后反馈 Action 仍允许 `ESCROWED`。
- 恢复前基线 `prisma validate`、`prisma generate`、lint、build 均通过。

## 2. 已修复 P1

### P1-05 课后反馈越过开始服务

- 新增 `src/lib/order-status.ts`，页面和 Server Action 共用 `canSubmitLessonFeedback`。
- 现在只有 `IN_PROGRESS` 可以提交反馈，`ESCROWED` 在服务端也会被拒绝。

### P1-06 环境文件与本地数据库忽略规则

- `.gitignore` 新增 `!.env.example`。
- 忽略 `prisma/*.db`、journal、WAL 和 SHM 文件。
- 新增 `src/lib/env.ts` 集中解析服务端关键配置。

### P1-08 证明材料并发保护

- 上传事务内先处理替换记录，再重新统计能力证明数量，超过 5 张时回滚。
- migration `20260618060000_remaining_p1_constraints` 增加 SQLite 部分唯一索引，限制每个家教资料最多一份 `DRAFT`、`SUBMITTED` 或 `APPROVED` 的在校证明。
- migration 应用前检查确认现有多份有效在校证明为 0。

### P1-09 通知重复创建

- `Notification` 新增 nullable unique `dedupeKey`。
- 订单、支付、反馈、评价、退款、审核、结算、需求等关键通知均使用业务实体、事件和接收人组成的稳定去重键。
- 单用户通知使用 upsert；管理员批量通知为每位接收人派生独立键。
- 既有通知没有被删除。检查发现 2 组历史相同 payload，需人工判断是否确为重复业务事件。

## 3. P1-07 生产文件存储

- 新增 `LOCAL` 与 `PERSISTENT_FILESYSTEM` 配置。
- 开发环境默认继续使用 `.data/tutor-verification`，不影响现有流程。
- 生产环境拒绝 `LOCAL`，必须显式配置 `PERSISTENT_FILESYSTEM` 和绝对路径 `PRIVATE_FILE_STORAGE_ROOT`。
- 代码层误部署保护已完成；正式部署仍需验证挂载目录是私有、持久、可备份且多实例共享。未提供对象存储供应商与凭据，因此本轮没有虚构远程后端。

## 4. 数据与 migration

- 新增 migration：`prisma/migrations/20260618060000_remaining_p1_constraints/migration.sql`。
- `npx prisma migrate deploy` 成功，当前共 8 条 migration，`prisma migrate status` 显示数据库已是最新。
- 新增 `npm run check:data-consistency`，默认只读；阻断项均为 0。
- `check:settlement-consistency` 发现 5 个历史已完成、已付款且可补建结算的订单。本轮未运行 `repair:settlement-history`，避免未经确认修改历史财务记录。

## 5. 最终验证

以下命令均以退出码 0 完成：

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npm run test:unit`：15/15 通过
- `npm run check:duplicate-bookings`：重复组合 0
- `npm run check:tutor-verification`：四类异常均为 0
- `npm run check:critical-business-rules`：问题 0
- `npm run check:settlement-consistency`：结构/金额异常 0，历史缺少结算 5
- `npm run check:data-consistency`：阻断项 0，历史相同通知 payload 2 组警告
- `npm run lint`
- `npm run build`
- `npx prisma migrate status`

Prisma 仍提示 `package.json#prisma` 将在 Prisma 7 移除；这是后续升级项，不影响当前 Prisma 6.19.3 验证。

## 6. 仍需验证

- 在正式部署环境验证持久私有卷的权限、持久性、备份和多实例共享。
- 人工复核 2 组历史相同通知 payload；未确认前不应自动删除。
- 人工确认后再决定是否为 5 个历史完成订单执行 `npm run repair:settlement-history`。
- 材料约束已有事务与数据库保护，但尚未进行专门的高并发压力测试。

## 7. 历史数据收口（2026-06-18）

- 已在任何历史数据写入前备份 SQLite、2 个证明材料文件、Prisma schema 和完整 migrations；备份目录由 Git 忽略。
- 2 组历史相同通知均缺少具体事件实例证据，不能安全认定为同一事件；删除 0 条，5 条全部保留。
- 5 个历史完成订单经增强规则在写入前备份数据库上重放 dry-run，全部满足 Payment、退款、角色、费率和金额快照条件；已存在 5 条对应 MOCK Settlement，复查异常 0。
- 备份与当前数据库的 Order、Payment、Notification 摘要一致，未修改这些历史记录；只新增 5 条 Settlement。
- `repair:settlement-history` 已修正为默认 dry-run，显式追加 `-- --apply` 才允许写入本地开发数据库。
- 详细操作、执行顺序说明、金额汇总与验证证据见 `docs/history-data-closure-report.md`。
