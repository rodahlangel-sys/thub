# THub 默认 MySQL 切换与 SQLite 回滚方案

切换日期：2026-06-22

## 1. 默认数据库结构

应用默认 Prisma schema 已切换为 `prisma/schema.prisma`，datasource provider 为 `mysql`，统一读取 `DATABASE_URL`。默认 `prisma/migrations/` 只包含已在 CloudBase MySQL `thub_test` 标记为成功的 `20260620_mysql_baseline`，没有混入 SQLite migration，也没有重新执行 baseline SQL。

原独立 `prisma-mysql/` 目录在内容核对完成后删除，避免存在两套可能漂移的 MySQL schema。默认 schema 除正式变量名改为 `DATABASE_URL` 外，与已完成结构和数据回归的 MySQL schema 保持一致。

## 2. SQLite 归档

SQLite 仅作为紧急回滚和历史归档，不再是默认生产数据库：

- schema：`prisma-sqlite/schema.prisma`
- migrations：`prisma-sqlite/migrations/`
- Prisma 配置：`prisma-sqlite/prisma.config.ts`
- 历史数据库文件：`prisma/dev.db`
- 本地安全备份：`local-backups/pre-history-cleanup/`

归档 schema 的 SHA-256 为 `08436ABE54489438029649C0E6161700DBC02BEC96C5E087D474114B64B7E60C`。原 8 条 SQLite migration 及 `migration_lock.toml` 的哈希均与切换前一致；SQLite 数据库 SHA-256 仍为 `583D79EAFE4517C9748B2A57C87C13DF5DAEAA77657FB078FA9AF72807390C41`。数据库、归档 migration 和 13 个本地备份文件均未删除。

## 3. 本地默认 MySQL

本地默认命令从被 Git 忽略的 `.env.cloudbase.local` 读取 `CLOUDBASE_MYSQL_EXTERNAL_URL`，校验协议和目标数据库严格为 `thub_test`，再仅在子进程环境中映射为 `DATABASE_URL`。连接串不会写入源码、文档或被跟踪文件，也不会由启动脚本输出。

- `npm run dev`：生成默认 MySQL Client 并启动开发服务器。
- `npm run build`：生成默认 MySQL Client 并构建应用。
- `npx prisma generate`：通过根目录 `prisma.config.ts` 使用默认 MySQL schema。
- `npx prisma validate`：验证默认 MySQL schema。
- `npx prisma migrate status`：检查默认 MySQL baseline 状态。

`.env.example` 只保留 `mysql://USER:PASSWORD@HOST:PORT/DATABASE` 安全占位。当前被忽略的 `.env` 仍保存原 SQLite 本地信息供迁移审计脚本使用，但默认启动脚本不会采用该值。

## 4. CloudBase Run 变量

后续部署到 CloudBase Run 时，由平台直接注入使用内网地址的 `DATABASE_URL`。生产 launcher 不读取 `.env.cloudbase.local`，缺少 `DATABASE_URL` 会明确失败；`file:` SQLite URL 在生产环境也会被拒绝，不会自动回退 SQLite。

本阶段没有部署 CloudBase Run，也没有验证内网连接、连接池或平台变量注入。

## 5. SQLite 紧急回滚

只有在 MySQL 不可用、切换后出现阻断性兼容问题，且维护负责人明确决定回滚时，才执行：

```text
npm run prisma:generate:sqlite
npm run build:sqlite
npm run dev:sqlite
```

这些命令使用归档 schema，并将运行时 `DATABASE_URL` 明确指向现有 `prisma/dev.db` 的绝对路径。SQLite 回滚不要求手工复制或修改 schema；`THUB_SQLITE_ROLLBACK=1` 只存在于回滚子进程，用于允许显式的本地 SQLite build，不构成生产自动降级。

回滚测试结束后必须恢复默认状态：

```text
npx prisma generate
npm run check:mysql-runtime-reads
```

本轮已实际完成 SQLite Client 生成、schema validate、build、dev 和公共页面读取；SQLite 哈希未变化。随后已恢复默认 MySQL Client，并确认 MySQL 12 张业务表仍为 154 条记录。

## 6. 数据保护与验证结果

- 没有运行 seed、数据重新导入、`db push`、force reset 或新的 migration。
- 没有修改或删除 SQLite/MySQL 历史业务数据。
- MySQL migration baseline 记录正确，数据库结构为最新。
- MySQL 与 SQLite 的逐表数量、主键集合、全字段摘要、密码哈希摘要、材料存储键、通知去重键和财务字段一致。
- 默认 MySQL build/dev 通过，首页、登录页和注册页返回 200；未提交任何写入表单。
- 三角色登录及受控写入流程沿用 2026-06-21 已通过并清理的完整 MySQL 回归证据，本轮没有创建账号或重置密码。

## 7. 尚未完成事项

数据库结构、数据、默认 Client、默认本地运行和 SQLite 回滚方案已经完成。正式云端运行仍需验证：

1. CloudBase Run 内网 MySQL 地址和生产环境变量注入。
2. 生产连接池、健康检查、维护窗口和故障回滚演练。
3. 持久私有证明材料存储卷、绝对路径及权限校验。
4. 正式切换窗口前的最终增量数据冻结和校验。

这些运行环境事项未在本轮伪装为已完成。
