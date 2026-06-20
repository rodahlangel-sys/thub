# THub MySQL 表结构迁移设计

更新时间：2026-06-20

## 1. 本阶段范围

本阶段只完成 SQLite 到 CloudBase MySQL 的兼容性审计、独立 MySQL datamodel、初始化 SQL 和空库结构初始化。未修改默认 `prisma/schema.prisma`、当前 `.env` 或 `DATABASE_URL`，未修改现有 8 条 SQLite migration，未导入 SQLite 数据，未运行 seed，也未部署应用。

项目实际使用 Prisma 6.19.3。MySQL 目标为 `thub_test`，数据库版本为 `8.0.30-cynos-3.1.16.006`。

## 2. 独立设计文件

- MySQL datamodel：`prisma-mysql/schema.prisma`
- 初始化 SQL：`prisma-mysql/initial.sql`
- 默认 SQLite datamodel：仍为 `prisma/schema.prisma`

MySQL datasource 只读取 `CLOUDBASE_MYSQL_EXTERNAL_URL`。真实连接信息仅保存在被 Git 忽略的 `.env.cloudbase.local`，没有进入 schema、SQL 或文档。

## 3. 为什么不能复用 SQLite migration

现有 8 条 migration 是 SQLite 历史演进记录，包含：

- `PRAGMA foreign_keys`、`PRAGMA defer_foreign_keys` 等 SQLite 专用语法。
- 通过 `new_*` 临时表、复制数据、删除旧表和重命名实现字段变更。
- 针对既有 SQLite 数据的金额单位修复 `UPDATE`。
- SQLite `TEXT`、`DATETIME`、`REAL` 和字符串枚举存储方式。
- `20260618060000_remaining_p1_constraints` 中的 SQLite 部分唯一索引。

这些操作既不能直接在 MySQL 执行，也不适合空库初始化。MySQL SQL 因此由当前完整 datamodel 从空结构一次性生成，再补充 Prisma 无法表达的原生约束。

生成命令：

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma-mysql/schema.prisma --script --output prisma-mysql/initial.sql
```

## 4. SQLite 与 MySQL 差异

### 字符串与索引长度

MySQL schema 为 ID 和普通短字符串保留有界 `VARCHAR`。email 为 `VARCHAR(320)`；storage key 和 notification dedupe key 为 `VARCHAR(512)`，在 `utf8mb4` 下仍低于 InnoDB 3072 字节索引键限制。地址、说明、反馈、通知正文等自由文本显式使用 `TEXT`，避免 Prisma 默认 `VARCHAR(191)` 导致长度收窄。

所有 THub 表使用 `utf8mb4_bin`，保持 SQLite 默认二进制、区分大小写的唯一键语义。该选择尤其影响 storage key、dedupe key 和模拟流水号。

### 数值与金额

- `hours`、`rating`、`overallScore` 保留 Prisma `Float`，在 MySQL 中为 `DOUBLE`。
- 订单、支付、退款和结算金额继续使用整数分，实际 12 个关键金额或费率列均为 MySQL `INT`。
- 未引入 `Decimal`，未改变 5% 信息服务费和 95% 模拟结算计算规则。

### 时间与枚举

- Prisma `DateTime` 映射为 `DATETIME(3)`。
- `@default(now())` 映射为 `CURRENT_TIMESTAMP(3)`。
- `@updatedAt` 仍由 Prisma Client 写入，不依赖 MySQL `ON UPDATE`。
- Prisma 枚举映射为各表的原生 MySQL `ENUM` 列。

### ID、表名和空值唯一性

- ID 继续由 Prisma `cuid()` 在客户端生成，没有增加自增列。
- SQL 使用反引号和 schema 中的精确表名，包括保留字 `Order`。
- MySQL 与 SQLite 的唯一索引都允许多个 `NULL`；因此可空的 `Order.demandId`、`Settlement.transactionNo` 和 `Notification.dedupeKey` 保持原语义。

### 外键和级联

19 个外键全部创建，`CASCADE`、`SET NULL` 和 `RESTRICT` 行为与 Prisma schema 一致。Order、Payment、Refund、Settlement、Review、LessonFeedback 和证明材料关系均已通过 `information_schema` 核对。

## 5. 部分唯一索引的等价实现

SQLite 原约束：同一 `tutorProfileId` 对 `STUDENT_CARD` 或 `ENROLLMENT_PROOF` 类型，在 `DRAFT`、`SUBMITTED`、`APPROVED` 状态中最多存在一条记录；`REJECTED` 历史记录可保留多条。

MySQL 使用可空虚拟生成列：

```sql
ALTER TABLE `TutorVerificationDocument`
    ADD COLUMN `activeSchoolProofTutorId` VARCHAR(191)
        GENERATED ALWAYS AS (
            CASE
                WHEN `type` IN ('STUDENT_CARD', 'ENROLLMENT_PROOF')
                 AND `status` IN ('DRAFT', 'SUBMITTED', 'APPROVED')
                THEN `tutorProfileId`
                ELSE NULL
            END
        ) VIRTUAL,
    ADD UNIQUE INDEX `TutorVerificationDocument_one_active_school_proof`
        (`activeSchoolProofTutorId`);
```

活跃记录生成家教 ID，唯一索引阻止并发重复；非活跃记录生成 `NULL`，利用 MySQL 唯一索引允许多个 `NULL` 的规则保留历史。该数据库保护继续与现有事务校验共同生效，不依赖前端。

最初使用 `STORED` 生成列时，CynosDB 在添加 `TutorVerificationDocument_tutorProfileId_fkey` 的 `ON UPDATE CASCADE` 时返回 `ER_CANNOT_ADD_FOREIGN`。原因是 MySQL 不允许 STORED 生成列的基列使用该级联组合。执行过程在首个错误处停止；确认本轮创建的 12 张表全部为 0 行且对象集合完全匹配后，仅删除这些空表。改为可索引的 `VIRTUAL` 生成列、再次确认目标库为空后，33 条 DDL 全部成功。

Prisma datamodel 当前无法声明该生成列。只读 `migrate diff` 确认实际数据库相对 datamodel 仅多出 `activeSchoolProofTutorId` 和对应唯一索引。以后生成 MySQL migration 时必须保留这两个原生对象，不得让 Prisma 自动删除。

## 6. 初始化 SQL 安全审查

`initial.sql` 明确以 `USE thub_test` 选择目标库，包含：

- 12 个 THub 业务表和 12 个主键。
- 19 个外键。
- 12 个业务唯一索引，包括 Order 防重复、Payment/Review/LessonFeedback/Settlement 的订单唯一性、Notification dedupe key 和有效证明材料保护。
- 23 个普通索引。
- 1 个虚拟生成列。

SQL 不包含 DROP、业务数据 INSERT/UPDATE/DELETE、SQLite 语法、数据库账号、授权、密码、连接 URL 或系统数据库修改。

## 7. 实际结构验证

- 实际表数量：12。
- 精确表集合与 12 个 Prisma 模型一致。
- 主键 12、外键 19、关键唯一索引 12、普通索引 23。
- `Order_demandId_tutorId_key` 已存在。
- `Payment_orderId_key`、`Review_orderId_key`、`LessonFeedback_orderId_key`、`Settlement_orderId_key` 已存在。
- `Notification_dedupeKey_key` 已存在。
- `TutorVerificationDocument_one_active_school_proof` 已存在，列为 `VIRTUAL GENERATED`。
- 12 个关键金额或费率列均为 `INT`。
- 12 张业务表记录数全部为 0。
- 环境 ID 命名的默认数据库操作前后均为 0 表，没有被修改。

初始化 SQL 是一次性基线，没有创建 Prisma `_prisma_migrations` 表。后续正式迁移方案需要明确基线策略，不能把现有 SQLite migration 标记为 MySQL 已执行。

## 8. 尚未迁移的数据

本阶段没有迁移任何 SQLite 数据。当前 SQLite 中的用户、需求、订单、支付、退款、评价、反馈、证明材料、通知和 5 条 MOCK Settlement 均仍只存在于本地 SQLite 及其备份中。没有运行 seed，也没有创建演示用户。

## 9. 下一阶段数据迁移方案

1. 冻结并再次备份 SQLite，记录各表数量和结构化摘要。
2. 编写只读提取、显式字段转换和 MySQL 写入脚本，连接变量与默认应用环境隔离。
3. 按外键拓扑导入：User/Profile，再 Demand/Order，最后 Payment、Refund、Feedback、Review、Settlement、Notification 和证明材料元数据。
4. 保留原 ID、金额分值、费率快照、枚举、时间和业务关联；明确 SQLite DateTime 到 MySQL `DATETIME(3)` 的时区规则。
5. 写入前 dry-run；写入后核对逐表数量、金额合计、关系完整性、唯一约束和现有一致性脚本。
6. 在单独阶段设计 Prisma MySQL migration 基线和应用切换；本地 SQLite 应用在切换前保持不变。

## 10. 当前风险

- 原生虚拟生成列不在 Prisma datamodel 中，未来 schema diff 必须人工审查。
- MySQL 目前没有 Prisma migration 历史表，下一阶段需选择可审计的基线方案。
- SQLite 与 MySQL 的时间、浮点和排序规则差异需要在数据迁移 dry-run 中验证。
- 外网数据库连接不强制 TLS；生产连接策略仍应在部署阶段重新评估。
- CloudBase Serverless MySQL 会消耗体验资源点，需持续关注额度。
- CloudBase Run 内网连接仍待部署环境验证。

当前已经具备进入 SQLite 数据 dry-run 迁移设计阶段的表结构条件，但尚未具备直接切换应用到 MySQL 的条件。
