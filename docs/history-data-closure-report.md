# THub 当前版本安全归档与历史数据收口报告

更新时间：2026-06-18

## 1. 操作范围

本阶段只进行本地安全归档、Git 基线准备、历史通知审查和历史 MOCK Settlement 补建。未新增产品功能，未修改前端、数据库 provider、订单状态规则、Payment 金额、5% 信息服务费率或 95% 大学生净结算规则，未处理 P2，也未配置云平台。

## 2. 修改前检查

- 初始分支为 `master`，仅有 Create Next App 初始提交。
- 初始未跟踪文件为 201 个；产品代码、migration、测试、脚本和文档大多尚未纳入 Git。
- Git 用户名和邮箱均已配置；仓库没有远程地址，本阶段不推送。
- `prisma validate`、`prisma generate`、15 项单元测试、lint、build 和 `prisma migrate status` 均以退出码 0 完成。
- 已跟踪文件中没有 `.env`、SQLite 数据库、上传材料、备份、PEM/KEY 文件或其他敏感路径。

## 3. 本地备份

- 备份时间：`2026-06-18 19:05:12 +08:00`。
- 备份目录：`local-backups/pre-history-cleanup/20260618-190512/`，该目录已由 `.gitignore` 排除。
- SQLite：已备份 `prisma/dev.db`，大小 290,816 字节，并完成 SHA-256 校验。
- SQLite sidecar：操作时没有 journal、WAL 或 SHM 文件。
- 证明材料：源目录与备份目录均为 2 个文件，未在日志或报告中公开文件名或内容。
- Prisma：`schema.prisma` 已备份；migration 源目录与备份目录均为 9 个文件。
- 备份总文件数：13。备份未加入 Git，也未上传远程。

## 4. Git 忽略与敏感检查

- `.env*` 被忽略，`.env.example` 通过反向规则允许提交。
- SQLite、`.data/`、`local-backups/`、日志、测试输出、构建目录和依赖目录均被忽略。
- schema、migrations、scripts、docs、正式品牌资源及 package 文件未被忽略。
- 候选文件敏感扫描未发现私钥头、Token、API key、数据库口令 URL、支付密钥或完整银行卡号。数字规则命中均为 migration 时间戳误报。
- `prisma/seed.ts` 原有两个硬编码演示密码，虽未被 Git 跟踪，但在建立基线前已改为强制读取 `SEED_ADMIN_PASSWORD` 和 `SEED_DEMO_PASSWORD`；示例环境文件只包含空占位。

## 5. 历史相同通知审查

- 只读脚本：`npm run check:duplicate-notifications`。
- 修复脚本：`npm run repair:duplicate-notifications`，默认 dry-run；只有 `--apply` 才可能写入。
- 发现 2 组相同 payload，共 5 条通知，均为历史 `AUDIT` 通知，`dedupeKey` 均为空。
- 第一组跨越多个日期，链接为通用家教资料页；数据库没有审核周期或具体事件实例 ID。
- 第二组发送给管理员，链接为通用家教列表页；数据库没有具体资料提交事件 ID。
- 两组都只能确认接收人、类型、文案和链接相同，不能证明属于同一业务事件。根据“不仅依靠标题和正文”的规则，两组均标记为 `REVIEW_REQUIRED`。
- 修复 dry-run：确认重复组 0，保留组 2，删除计划为空。
- 实际结果：删除 0 条、补 dedupeKey 0 条、保留 5 条；未执行通知 `--apply`，未发送新通知。

## 6. 历史 Settlement 检查与补建

### 执行顺序说明

原 `package.json` 将 `npm run repair:settlement-history` 直接定义为带 `--apply`。在按任务中的 dry-run 示例运行该命令时，旧脚本实际提前创建了 5 条 Settlement。数据写入前已经完成本地备份，但这一步的执行顺序不符合“先完整 dry-run”的要求，因此在此明确记录。

发现后立即停止继续写入，并完成以下补救验证：

- 修正 package 脚本，使 `npm run repair:settlement-history` 默认为 dry-run，只有追加 `-- --apply` 才写入。
- 增强候选检查：订单状态、参与者角色、Payment 状态和金额、退款状态、已有 Settlement、订单费率与金额快照、5%/95% 加总、正整数金额及 MOCK 流水号。
- 使用写入前备份数据库重放增强版 dry-run：缺少 Settlement 5，符合条件 5，跳过 0，既有异常 0。
- 当前数据库复查：缺少 Settlement 0，既有 Settlement 异常 0。

### 补建结果

- 补建数量：5；跳过数量：0。
- 总订单金额：135,000 分；平台信息服务费：6,750 分；大学生净结算额：128,250 分；两者之和等于订单总额。
- 每条费率快照均为 500 基点，Provider 为 `MOCK`，状态为 `SETTLED`，流水号以 `MOCK-` 开头。
- `settledAt` 使用订单 `updatedAt` 作为历史完成时间近似值，不代表第三方到账时间。
- 补建脚本不发送历史结算通知。
- `Settlement.orderId` 唯一约束继续防止重复记录。

## 7. 数据未被破坏的证据

备份与当前数据库比较结果：

- 用户 33、需求 16、订单 19、支付 14、退款 4、评价 5、反馈 6、证明材料 2、通知 18，数量全部不变。
- Order、Payment、Notification 的结构化 SHA-256 摘要前后一致。
- 唯一数量变化是 Settlement 从 0 增加到 5。
- 未修改 Order 或 Payment 金额、状态及其他字段；未删除任何用户、需求、订单、支付、退款、评价、反馈、材料、通知或正常财务数据。

## 8. 生产持久存储

- 生产环境使用 `LOCAL` 会明确失败。
- `PERSISTENT_FILESYSTEM` 必须配置绝对路径。
- 证明材料读取接口仍要求登录，并仅允许管理员或材料所属大学生访问；响应保持 `private, no-store` 和 `nosniff`。
- 真实持久卷的权限、持久性、备份及多实例共享仍是运行环境验证项。本阶段没有伪造挂载或声称已完成真实环境验证。

## 9. Git 基线

Git 身份已配置。完成本报告、最终验证和暂存敏感扫描后，使用提交消息 `chore: checkpoint stable product before data migration` 创建本地基线；不配置或推送远程。提交哈希以最终反馈和 Git 历史为准。

## 10. 剩余事项

- 2 组历史相同通知缺少事件实例证据，继续保留。
- 正式环境持久私有存储仍需真实运行环境验证。
- Prisma 7 前需迁移已弃用的 `package.json#prisma` 配置；当前 Prisma 6.19.3 不受影响。
