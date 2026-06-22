# CloudBase 私有云存储接入与证明材料迁移准备报告

日期：2026-06-22

## 范围与基线

- CloudBase 环境为 `thub-test-d2gtl1mcfd13d8b31`，地域为上海 `ap-shanghai`。
- 操作前 MySQL 迁移后校验仍为 12 张业务表、154 条历史记录。
- 两条证明材料数据库记录和两份本地文件均存在；记录大小与文件大小一致。
- 两份本地文件均记录了大小与 SHA-256。报告不记录材料内容、物理路径或存储键。
- 本阶段未修改订单、支付、退款、结算、Prisma schema 或 migration。

## 权限与费用

- 云存储已启用，未执行套餐升级、按量付费或资源包购买。
- 当前体验版按统一资源点计量；本次未发现单独现金收费项目。
- 存储权限已设置为 `ADMINONLY`，对应客户端 `read: false`、`write: false`。
- 普通客户端不能读取、上传或删除对象；控制台及受信任服务端身份可以操作。
- 两份对象均通过无签名匿名请求验证，访问被拒绝。

## Storage Provider

- 新增 CloudBase 服务端 Provider，基于官方 `@cloudbase/node-sdk`。
- Provider 实现 `save`、`read`、`delete`、`exists`，并延迟初始化云 SDK。
- 云端对象路径为 `private/tutor-verification/<tutorProfileId>/<uuid>.<ext>`；不包含原文件名、邮箱、姓名或学号。
- 统一解析层根据 storageKey 路由本地键和 `cloud://` fileID，业务权限检查没有复制。
- 本地开发默认使用 `LOCAL`；生产默认要求 `CLOUDBASE`，不会静默回退到本地存储。
- CloudBase Run 后续使用运行环境身份，并提供 `STORAGE_PROVIDER`、`CLOUDBASE_ENV_ID`、`CLOUDBASE_REGION`。真实凭据不进入代码或 Git。

## 受保护读取与写入可靠性

- 家教只能读取自己的材料，管理员可以读取，家长与其他家教被拒绝。
- 文件始终由服务端读取后返回，不向前端暴露永久公开 URL 或直接 fileID。
- 成功响应继续使用正确的内容类型及 `Cache-Control: private, no-store`。
- 未登录、记录不存在、无权限、文件不存在和存储暂不可用使用不同的安全响应，不泄露内部路径或异常。
- 上传失败不会创建数据库记录；数据库提交失败会清理新对象；替换后的旧对象清理由提交后尽力执行，失败时新文件仍可用。

## 两份云端副本

- 已将两份现有本地证明文件上传至完全私有目录。
- 使用管理员 CloudBase CLI 重新下载两份对象，文件大小和 SHA-256 均与本地源文件一致。
- 管理员级下载成功；匿名无签名读取均被拒绝。
- 本地文件未删除，数据库 `storageKey` 未修改，材料审核状态未修改。
- 非敏感运行结果为：上传 2、下载校验 2、哈希一致 2、匿名拒绝 2。
- 含材料记录 ID、旧键摘要、新 fileID 与哈希的映射仅保存在被 Git 忽略的 `.tmp/tutor-storage-migration-map.json`。

## 原子切换方案

- `scripts/migrate-verification-files-to-cloudbase.ts` 默认只执行 dry-run。
- 只有显式 `--apply` 才允许修改数据库；本阶段未运行 `--apply`。
- dry-run 会重新核对材料记录、旧键摘要、本地文件大小与哈希、云上传验证状态。
- apply 还会由服务端重新下载云对象并校验大小与哈希，然后在单一数据库事务内切换两条 storageKey。
- 任意不一致、并发修改或已迁移状态都会使整个操作停止；脚本不会删除本地文件，也不会改变审核状态、文件类型或时间。
- 当前 dry-run 结果：2 条记录可切换，0 条数据库变更。

## 回滚与待验证事项

- 在数据库正式切换前，回滚只需继续使用 `LOCAL` Provider；旧键和本地文件均保持原状。
- 正式切换后仍保留本地文件作为受控回滚依据，不在迁移脚本中自动删除。
- CloudBase Run 尚未部署，因此运行环境身份、内网运行时 SDK 访问和生产环境变量仍需部署阶段验证。
- 在上述运行环境验证完成前，不执行数据库 storageKey 的正式切换。

## 工程与数据验证

- `prisma validate` 与 `prisma generate` 通过。
- 65 项单元测试全部通过，包含 LOCAL/CloudBase Provider、权限、上传补偿和 dry-run 参数测试。
- lint 与 MySQL 模式 production build 通过。
- 综合数据一致性阻断项为 0；原有 2 组历史相同通知仍作为人工复核警告保留。
- MySQL 迁移后校验通过：12 张业务表共 154 条记录，材料 storageKey 与 SQLite 基线一致。
- SQLite 文件哈希保持不变；两份本地材料仍存在。
- 云迁移脚本最终 dry-run 通过，结果为 2 条可迁移、0 条数据库写入。
