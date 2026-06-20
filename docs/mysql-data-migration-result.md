# THub SQLite 到 CloudBase MySQL 数据迁移结果

迁移时间：2026-06-20 23:46:42 +08:00

## 1. 范围与安全结论

本阶段仅将本地 SQLite 的 12 张业务表导入 CloudBase MySQL 测试数据库 `thub_test`。未切换网站数据库，未修改 `.env`、默认 `DATABASE_URL` 或默认 SQLite Prisma schema，未运行 seed、部署或数据清理，也未迁移证明材料文件内容。

正式导入仅执行一次，使用 SERIALIZABLE 隔离级别的单个 MySQL transaction。导入成功提交，没有发生业务数据失败、回滚或重试。

## 2. Prisma MySQL baseline

- baseline：`20260620_mysql_baseline`
- baseline migration SQL 与 `prisma-mysql/initial.sql` 的 SHA-256 一致。
- 使用 Prisma 6.19.3 `migrate resolve --applied` 标记已有表结构，未重新执行建表 SQL。
- `_prisma_migrations` 只有 1 条记录，名称、checksum、完成状态和 applied steps 均符合 baseline 规则。
- `prisma migrate status` 显示数据库结构为最新状态。

## 3. 迁移数量

| 表 | SQLite | MySQL | 主键集合一致 | 全字段摘要一致 |
| --- | ---: | ---: | --- | --- |
| User | 33 | 33 | 是 | 是 |
| ParentProfile | 8 | 8 | 是 | 是 |
| TutorProfile | 24 | 24 | 是 | 是 |
| TutorVerificationDocument | 2 | 2 | 是 | 是 |
| Demand | 16 | 16 | 是 | 是 |
| Order | 19 | 19 | 是 | 是 |
| Payment | 14 | 14 | 是 | 是 |
| Refund | 4 | 4 | 是 | 是 |
| LessonFeedback | 6 | 6 | 是 | 是 |
| Review | 5 | 5 | 是 | 是 |
| Settlement | 5 | 5 | 是 | 是 |
| Notification | 18 | 18 | 是 | 是 |
| **合计** | **154** | **154** | **是** | **是** |

实际写入 154 条，跳过 0 条，未修改源记录。

## 4. 一致性核对

- 12 张表的记录数、主键集合和逐行全字段确定性摘要均一致。
- 外键异常、唯一约束冲突、非法枚举、非法时间、非法金额和超长字符串均为 0。
- 用户密码哈希逐条一致；检查只输出一致性结果，不输出哈希内容。
- Payment、Refund、Settlement 的金额和状态摘要一致。
- 5 条 Settlement 均存在，5% 平台信息费与 95% 模拟结算关系通过。
- 2 条证明材料元数据及其私有存储键一致，未搬运证明材料文件。
- 18 条 Notification 及其 `dedupeKey` 一致。
- 17 条历史 `Order.serviceFee` 口径差异在源端和目标端均保留为相同的非阻断警告；没有转换、重算或改写。
- 环境 ID 命名的默认数据库仍为 0 表，未被修改。

## 5. SQLite 保护

迁移前后 SQLite SHA-256 均为：

```text
583D79EAFE4517C9748B2A57C87C13DF5DAEAA77657FB078FA9AF72807390C41
```

本地 SQLite 数据库、现有 8 条 SQLite migration 和本地备份均保留。当前网站继续使用 SQLite。

## 6. 应用切换条件

MySQL 已具备数据层面的应用切换条件：结构已建立 baseline，154 条业务记录完整导入，逐表全字段摘要和业务审计通过。

本阶段没有执行应用切换。正式切换前仍需单独完成 MySQL 版 Prisma Client/默认 schema 策略、运行环境连接变量、CloudBase Run 内网连接、持久私有文件存储和切换回滚方案验证。
