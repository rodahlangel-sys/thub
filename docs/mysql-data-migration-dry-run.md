# THub SQLite 到 MySQL 数据迁移 Dry-run 报告

更新时间：2026-06-20

## 1. 范围与安全结论

本阶段只设计迁移脚本并执行只读 dry-run。没有向 `thub_test` 写入业务数据，没有运行 `--apply`、seed、Prisma migration、`db push` 或应用部署，也没有修改默认 `.env`、`DATABASE_URL`、SQLite schema 和 SQLite 数据库。

迁移脚本：`scripts/migrate-sqlite-to-mysql.ts`

- 默认无参数为 dry-run。
- 只有唯一参数 `--apply` 才进入写入路径；未知参数会被拒绝。
- SQLite 来源固定校验为当前 `.env` 中的 `file:./dev.db`。
- MySQL URL 只从本地环境变量或被忽略的 `.env.cloudbase.local` 读取，并严格校验数据库名为 `thub_test`。
- dry-run 前后比较 SQLite SHA-256，结果一致。
- MySQL 目标必须精确包含 12 张预期业务表、结构完整且逐表为 0 行，否则阻断。

独立只读检查脚本：`scripts/check-mysql-migration-readiness.ts`。

## 2. 外键安全迁移顺序

顺序由 `TABLE_SPECS` 中明确记录的 schema 外键依赖通过拓扑排序生成，并由单元测试固定：

1. `User`
2. `ParentProfile`
3. `TutorProfile`
4. `TutorVerificationDocument`
5. `Demand`
6. `Order`
7. `Payment`
8. `Refund`
9. `LessonFeedback`
10. `Review`
11. `Settlement`
12. `Notification`

每个子表都排在其父表之后；可空外键按 MySQL 的 `NULL` 语义处理。

## 3. SQLite 记录数量

| 表 | SQLite 记录数 | 预计写入 | 跳过 | 错误 | 外键异常 | 唯一冲突 | 转换警告 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| User | 33 | 33 | 0 | 0 | 0 | 0 | 0 |
| ParentProfile | 8 | 8 | 0 | 0 | 0 | 0 | 0 |
| TutorProfile | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| TutorVerificationDocument | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| Demand | 16 | 16 | 0 | 0 | 0 | 0 | 0 |
| Order | 19 | 19 | 0 | 0 | 0 | 0 | 17 |
| Payment | 14 | 14 | 0 | 0 | 0 | 0 | 0 |
| Refund | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| LessonFeedback | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| Review | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| Settlement | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| Notification | 18 | 18 | 0 | 0 | 0 | 0 | 0 |
| **合计** | **154** | **154** | **0** | **0** | **0** | **0** | **17** |

报告只输出聚合计数，没有输出邮箱、密码哈希、用户内容、订单 ID、材料路径、存储键或连接信息。

## 4. 数据转换规则

- 主键和外键 ID 原样保留。
- 336 个非空 DateTime 值统一转换为 UTC `YYYY-MM-DD HH:mm:ss.SSS`，写入 MySQL `DATETIME(3)`。
- 当前 12 个模型没有 Boolean 字段；转换器仍将未来 Boolean 明确映射为 `1/0`。
- Prisma 枚举按 MySQL schema 的允许集合逐值检查并原样迁移。
- Float 必须为有限数；整数和整数分字段必须为安全整数并满足字段范围。
- `VARCHAR` 按 schema 的字符长度检查；`TEXT` 按 65,535 UTF-8 字节检查。
- 必填字段禁止 `null`/`undefined`，可空字段保留 `NULL`。
- 用户密码只迁移现有哈希字符串，不重新加密、不解密、不记录到输出。
- 证明材料只迁移 2 条数据库元数据，包括业务类型、状态和私有存储标识；不读取或搬运材料文件内容。

## 5. 外键、唯一性与证明材料检查

- 12 张表所有主键均非空且无重复。
- 19 类外键引用均能找到父记录，孤立外键为 0。
- email、profile userId、storageKey、Order demand+tutor、Payment/Review/LessonFeedback/Settlement orderId、Settlement transactionNo 和 Notification dedupeKey 均无冲突。
- 可空唯一字段只对非 `NULL` 值检查，和 MySQL 唯一索引语义一致。
- 2 条证明材料没有违反“同一家教最多一份 DRAFT/SUBMITTED/APPROVED 在校证明”约束。
- SQLite 与 MySQL schema 的 12 个模型一一对应。

## 6. 金额与结算检查

- Order 总额与课时、单价关系通过。
- 19 条 Order 的 500 基点、平台费和大学生净额权威快照均通过 5%/95%整数分公式。
- Payment 与 Order 金额关系通过。
- Refund 金额未超过对应订单金额。
- 5 条 Settlement 与 Order、PAID Payment、退款状态、MOCK provider、模拟流水号和费用快照关系全部通过。
- 没有 NaN、负数或非法金额。

有 17 条历史 Order 的旧 `serviceFee` 冗余字段与后来新增的 `platformFeeAmountFen` 不同。历史收口没有改写该字段，当前业务和结算以 `platformFeeRateBps`、`platformFeeAmountFen`、`tutorNetAmountFen` 为权威快照。迁移会原样保留旧 `serviceFee`，因此记录为非阻断警告，不转换、不跳过，也不改变 5%/95%规则。

## 7. MySQL 目标检查

- 当前连接数据库：`thub_test`。
- MySQL：`8.0.30-cynos-3.1.16.006`。
- 业务表数量：12。
- 12 张业务表逐表记录数：0。
- 结构门禁：12 主键、19 外键和关键唯一约束完整。
- 环境 ID 命名的默认数据库表数量：0，未被修改。
- dry-run 前后 MySQL 仍为空，没有执行 INSERT。

## 8. Prisma MySQL baseline

正式基线文件：

```text
prisma-mysql/migrations/20260620_mysql_baseline/migration.sql
prisma-mysql/migrations/migration_lock.toml
```

baseline `migration.sql` 与 `prisma-mysql/initial.sql` 字节一致，SHA-256 均为：

```text
1F7E5F08D728FB0CAC535FE0094F66B3E7BE50316C76AEDE36E9823FAF65F86D
```

SQL 不含密码、连接地址或 SQLite 语法。本阶段没有重新执行 baseline，没有运行 `prisma migrate resolve`，也没有创建 `_prisma_migrations` 表。该目录只为下一阶段建立可审计的 MySQL schema 基线。

## 9. 正式导入事务与回滚

未来只有显式运行 `npm run migrate:mysql:apply` 才可能写入。apply 在写入前重新执行完整审计和空库结构门禁，然后：

1. 使用 `SERIALIZABLE` 隔离级别开始单个 MySQL 事务。
2. 按外键拓扑顺序使用参数化 INSERT 写入 154 条记录。
3. 不关闭外键检查，不写环境默认数据库，不写 SQLite。
4. 提交前逐表核对 MySQL 数量与 SQLite 快照数量。
5. 任意 INSERT、唯一约束、外键或数量校验失败时执行事务 rollback。
6. 成功提交后再次运行结构、数量、金额和业务一致性验证。

SQLite 文件在 apply 前后继续进行 SHA-256 比较。正式执行前还应创建当时点的新备份，并避免本地应用同时写入 SQLite，以获得一致快照。

## 10. Dry-run 结论

- 可以安全迁移：是。
- 预计写入：154。
- 跳过：0。
- 阻断问题：0。
- 正常转换：336 个 DateTime；Boolean 字段 0。
- 非阻断警告：17 条历史 `serviceFee` 差异，原样保留。
- MySQL 写入：0。

当前已具备进入单独授权的正式 `--apply` 数据迁移阶段的条件，但尚未执行迁移，也尚未具备切换网站数据库的条件。
