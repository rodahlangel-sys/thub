# THub CloudBase MySQL 本地只读运行验证

验证时间：2026-06-20

## 1. 本地代码检查点

- 提交：`b49f685` (`chore: add cloudbase mysql migration baseline`)
- 提交前已检查候选文件，不含 `.env.cloudbase.local`、数据库文件、上传材料、密码、密钥或完整连接串。
- checkpoint 仅为本地提交，没有推送远程。

## 2. Prisma Client 切换策略

业务代码继续统一引用 `@prisma/client`，数据库实例继续由 `src/lib/prisma.ts` 提供，没有复制业务逻辑或批量修改 import。

- `npm run prisma:generate:sqlite`：由 `prisma/schema.prisma` 生成 SQLite Client。
- `npm run prisma:generate:mysql`：安全读取被忽略的 `.env.cloudbase.local`，由 `prisma-mysql/schema.prisma` 生成 MySQL Client。
- `npm run dev:mysql`：仅在子进程环境中将外网 MySQL URL 提供给 Prisma 和 Next.js，生成 MySQL Client 后启动绑定 `127.0.0.1` 的开发服务器。
- `npm run build:mysql`：使用相同的隔离环境生成 MySQL Client 并运行 Next.js build。
- 普通 `npm run dev` 和 `npm run build` 显式重新生成 SQLite Client。

磁盘 `.env` 和默认 `DATABASE_URL` 从未修改。任一时刻只使用最近一次生成的一套 Prisma Client，不同时混用两个 provider。

## 3. 启动前门禁

- 当前 MySQL 数据库严格为 `thub_test`。
- 12 张业务表合计 154 条，逐表数量和全字段摘要与 SQLite 一致。
- Prisma baseline migration 状态正常。
- 环境 ID 命名的默认数据库仍为 0 表。
- SQLite SHA-256 为 `583D79EAFE4517C9748B2A57C87C13DF5DAEAA77657FB078FA9AF72807390C41`。

## 4. MySQL build 与服务启动

- MySQL Prisma Client 生成成功。
- MySQL 模式 Next.js 16.2.7 build 通过，38 个静态生成步骤完成。
- `npm run dev:mysql` 成功启动，绑定 `127.0.0.1:3000`。
- 未发生 Prisma provider、schema 或 MySQL 查询兼容错误。
- 初版启动器使用 Windows `.cmd` 子进程时被 Node 25 拒绝；已改为当前 Node 直接执行项目内 Prisma/Next CLI，并增加回归测试。
- 运行中的 Prisma 引擎不允许重复生成 Client；只读查询命令已改为复用当前 MySQL Client，避免替换被占用的引擎文件。

## 5. 只读页面与数据查询

以下页面仅执行 HTTP GET，没有提交表单：

| 页面 | 结果 |
| --- | --- |
| 首页 `/` | 200 |
| 登录页 `/login` | 200 |
| 注册页 `/register` | 200，未提交注册 |
| 家长工作台 `/parent` | 未登录时 307 到 `/login` |
| 大学生工作台 `/tutor` | 未登录时 307 到 `/login` |
| 管理员后台 `/admin` | 未登录时 307 到 `/login` |

当前本地环境没有可用的测试账号密码，只有空的 seed 密码占位。因此没有重置密码、创建账号或执行三角色登录。家长、大学生和管理员登录后的页面读取仍待提供既有测试凭据后验证。

通过项目统一 `src/lib/prisma.ts` 和生成的 MySQL Client 对全部 12 个模型执行了只读计数查询，User、ParentProfile、TutorProfile、TutorVerificationDocument、Demand、Order、Payment、Refund、LessonFeedback、Review、Settlement、Notification 均读取成功，总数 154。

## 6. 数据无变化与 SQLite 恢复

- 测试后 MySQL 仍为 12 张业务表、154 条记录。
- 各表主键集合、全字段摘要、密码哈希摘要、财务字段、证明材料存储键和 Notification `dedupeKey` 均未变化。
- 环境默认数据库仍为 0 表。
- SQLite 测试前后 SHA-256 一致。
- 未执行注册、需求、订单、支付、退款、反馈、评价、资料、材料、审核、结算或通知已读写操作。
- MySQL 开发服务器已停止，端口不再监听。
- SQLite Prisma Client 已重新生成；普通 `npm run dev` 启动成功，首页返回 200 后已停止。

## 7. 正式切换前事项

数据和本地 MySQL 运行兼容性已经通过，但尚不应直接执行正式切换。仍需：

1. 使用现有测试凭据完成家长、大学生和管理员登录后的只读页面验证。
2. 在 CloudBase Run 中验证内网数据库连接、SSL/网络策略与连接池行为。
3. 验证生产持久私有文件存储挂载及材料读取权限。
4. 设计正式环境变量切换、健康检查、维护窗口和回滚到 SQLite/备份的操作方案。
5. 在正式切换前再次冻结写入并执行增量差异检查。
