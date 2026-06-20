# CloudBase 测试环境准备记录

## 范围与结论

- 记录日期：2026-06-20
- 用途：THub 从 SQLite 迁移到 MySQL 前的测试环境准备
- 本阶段未修改 Prisma provider、schema 或 migration，未运行 seed、migration 或 `db push`。
- 本阶段未部署 Next.js、未创建云托管服务、未导入业务数据。

## CloudBase 环境

| 项目 | 结果 |
| --- | --- |
| CloudBase CLI | 官方 `@cloudbase/cli` 3.5.7（全局开发工具） |
| CLI 登录 | 成功，使用设备码浏览器授权 |
| 环境名称 | `thub-test` |
| 环境 ID | `thub-test-d2gtl1mcfd13d8b31` |
| 地域 | 上海 `ap-shanghai` |
| 套餐 | 体验版 |
| 环境状态 | 正常 |
| 云托管服务 | 无 |

用户在 CloudBase 控制台确认 MySQL 开通页面未显示单独收费金额，并使用体验版环境完成初始化。本次操作未确认购买、升级套餐、按量付费开通或其他付费资源。CloudBase MySQL 按计算资源和存储量计量，后续使用仍应关注体验额度与资源点消耗，不能将本记录视为永久零费用承诺。

## MySQL 测试实例

| 项目 | 结果 |
| --- | --- |
| 数据库类型/版本 | MySQL `8.0.30-cynos-3.1.16.006` |
| 运行模式 | Serverless |
| 实例状态 | Running |
| 可用区 | `ap-shanghai-5` |
| CCU 范围 | 0.25–0.5 |
| VPC/子网 | CloudBase 初始化时选择的默认 VPC 和默认子网 |
| 表名大小写敏感 | 否（初始化时由用户确认） |
| 测试数据库 | `thub_test` |
| 字符集 | `utf8mb4` |
| 排序规则 | `utf8mb4_0900_ai_ci` |
| 当前表数量 | 12（全部为 0 行） |

官方 CLI 管理通道执行只读 `SELECT 1` 成功。创建 `thub_test` 后，通过 `information_schema` 确认数据库存在且没有业务表。开启直连后，本地通过平台生成的外网连接再次执行 `SELECT 1`、`SELECT VERSION()`、`SELECT DATABASE()` 和表数量查询，结果均符合预期。

## 连接状态

- 公网连接：已开启；外网 Host 和 Port 已由平台生成，本地只读连接测试成功。
- CloudRun 内网：内网 Host 和 Port 已获得；当前没有 CloudRun 服务，因此仍标记为“待 CloudBase Run 部署后验证”。
- 数据库账号：已创建 `thub_app` 专用账号并用于 `thub_test`；文档和 Git 中均未保存密码或完整连接串。
- SSL：服务端 `require_secure_transport` 为关闭状态，测试会话未使用 TLS；当前直连配置不强制 SSL。
- 白名单：控制台没有提供单独的 IP 白名单入口；未配置 `0.0.0.0/0`。
- 本地配置：`.env.cloudbase.local` 保存真实内外网连接信息，且由 Git 忽略、未被跟踪；当前应用 `.env` 和 `DATABASE_URL` 未修改。

## 免费资源与限制

- 当前环境为 CloudBase 体验版。
- MySQL 为 Serverless，当前实例范围为 0.25–0.5 CCU，平台按计算资源使用量和存储量计量。
- 直连配置过程中控制台未显示单独现金收费金额；MySQL 使用仍可能消耗体验版资源点。
- 本阶段未开启付费备份、扩容、公网带宽或生产规格资源。
- 体验额度、资源点余额、到期策略及超额后的处理方式需要在 CloudBase 控制台持续确认。

## 后续迁移条件

本地迁移通道已经具备以下条件：

1. `thub_test` 专用账号和真实外网连接已配置。
2. 外网连接测试成功，目标库为 `thub_test`；独立初始化 SQL 已创建 12 张空业务表。
3. 内外网连接 URL 仅保存在被 Git 忽略的本地环境文件中。
4. MySQL 版本、SSL 状态和连接目标已经确认。

MySQL 兼容性审计和空库表结构初始化已完成，可以进入 SQLite 数据 dry-run 迁移设计阶段。独立 MySQL schema 与初始化 SQL 位于 `prisma-mysql/`；不得复用或修改当前 8 条 SQLite migration。CloudBase Run 内网连接仍需在部署后验证。
