# THub 完整产品功能审计报告

更新时间：2026-06-17

本次审计只检查当前代码、配置和本地 SQLite 数据，不新增功能、不重构页面、不修改数据库结构、不清空数据、不部署。除创建本报告外，没有修改业务代码。

## 1. 当前技术结构

- 技术栈：Next.js App Router、React、TypeScript、Tailwind CSS、Prisma、SQLite。
- Next.js 版本：16.2.7。
- React 版本：19.2.4。
- Prisma 版本：6.19.3。
- 当前 Node：v25.0.0；package.json 未声明 engines。
- 数据库：SQLite，`DATABASE_URL` 来自环境变量。
- 认证方式：bcryptjs 密码哈希、jose JWT、HTTP-only Cookie，Cookie 名称为 `wuhan_tutor_session`。
- 支付方式：当前真实可用方式为 `MOCK` 模拟支付；支付宝和微信支付 Provider 为占位准备。
- 文件存储：证明材料保存在私有本地目录 `.data/tutor-verification/`，数据库只保存 `storageKey` 和元信息。
- 测试代码：未发现专门的自动化测试脚本，当前主要依赖 lint/build 和手工流程验证。

## 2. 工程检查结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx prisma validate` | 通过 | schema 有效。 |
| `npx prisma generate` | 通过 | 首次遇到 Windows `EPERM rename query_engine...dll.node`，停止占用 3000 端口的 dev server 后通过。 |
| `npm run lint` | 通过 | ESLint 通过。 |
| `npm run build` | 通过 | 停止 dev server 后构建通过。 |

`EPERM` 属于 Windows 下 Prisma engine 文件被 dev server 占用的环境锁定问题，不是业务代码错误。

## 3. 当前完整功能清单

- 账号：注册、登录、退出、禁用账号拦截、家长/大学生家教/管理员角色跳转。
- 家长：资料维护、需求发布、需求管理、匹配推荐、预约创建、订单查看、模拟支付、课后确认、评价、退款申请、消息通知。
- 大学生家教：资料维护、证明材料上传、提交审核、查看驳回原因、预约确认/拒绝、开始服务、课后反馈、查看评价、消息通知。
- 管理员：用户管理、家教审核、证明材料查看、需求管理、订单管理、支付记录、退款审核、评价和课后反馈查看、支付配置检查。
- 规则页面：用户协议、隐私政策、服务规则、退款规则、安全提示、关于平台。

## 4. 当前模型和状态

用户状态：`ACTIVE`、`DISABLED`。

家教审核状态：`PENDING`、`APPROVED`、`REJECTED`。

证明材料类型：`STUDENT_CARD`、`ENROLLMENT_PROOF`、`CERTIFICATE`、`OTHER`。

证明材料状态：`DRAFT`、`SUBMITTED`、`APPROVED`、`REJECTED`。

订单状态：

- `PENDING_TUTOR_CONFIRM`
- `PENDING_PAYMENT`
- `ESCROWED`
- `IN_PROGRESS`
- `PENDING_PARENT_CONFIRM`
- `COMPLETED`
- `REFUND_REQUESTED`
- `REFUNDED`
- `CANCELLED`

## 5. 认证与权限结果

总体结论：页面和 Server Action 大多都有服务端角色校验；证明材料读取 API 有本人/管理员权限校验；通知已读操作按 `userId` 限制；管理员禁用自己有服务端拦截。

发现的主要风险：

- 金额创建时存在客户端改价风险，影响支付和退款链路。
- 管理员家教审核 Action 缺少当前审核状态约束，可能重复或逆向改变审核状态。
- 当前 `.env.example` 被 `.env*` 规则忽略，不利于配置文件纳入版本管理；`prisma/dev.db` 未被 `.gitignore` 忽略。

## 6. 家长端流程结果

可走通部分：

- 家长注册、登录、退出、资料维护、发布需求、查看自己的需求、推荐老师、创建预约、支付、确认完成、评价、退款申请、消息已读等路径均有对应页面和 Action。
- 家长页面普遍用 `parentId: user.id` 做归属过滤。
- 退款申请限制在 `ESCROWED`、`IN_PROGRESS`、`PENDING_PARENT_CONFIRM` 且要求已支付记录。

关键风险：

- 创建预约时 `hourlyPrice` 来自表单，服务端没有重新按老师资料价格区间和需求预算校验。
- 同一需求同一老师没有重复预约限制。
- 发布需求没有幂等或重复提交保护。

## 7. 大学生端流程结果

可走通部分：

- 大学生注册、登录、资料填写、上传证明材料、提交审核、查看驳回原因、预约确认/拒绝、开始服务、提交反馈、查看评价、消息已读等路径存在。
- 大学生资料和订单操作均按当前用户 `user.id` 过滤。
- 证明材料上传、删除、读取均在服务端做角色和归属检查。

关键风险：

- 新增证明材料功能后，历史已认证/待审核老师中存在无必填证明材料的数据。
- 课后反馈允许订单从 `ESCROWED` 直接提交，绕过 `IN_PROGRESS`。
- 证明材料数量和“当前有效在校证明唯一性”主要靠业务代码控制，没有数据库层唯一约束，极端并发下可能出现重复。

## 8. 管理员端流程结果

可走通部分：

- 管理员页面普遍有服务端 `ADMIN` 校验。
- 用户禁用/恢复、防止禁用自己、家教审核、证明材料查看、退款处理、订单/支付/评价/反馈查看均有页面和 Action。
- 退款审核要求退款状态为 `PENDING`。

关键风险：

- 家教审核通过/驳回 Action 缺少“仅能审核 `PENDING` 资料”的服务端限制。
- 驳回家教审核会直接把资料设为 `REJECTED`，即使资料并非待审核状态。
- 管理员关闭/重开需求属于后台管理操作，但会直接修改家长需求状态，需要谨慎留痕。

## 9. 订单状态机结果

当前主要状态流转：

| 当前状态 | 触发角色 | Action | 下一状态 | 服务端检查 |
| --- | --- | --- | --- | --- |
| `PENDING_TUTOR_CONFIRM` | 大学生 | `confirmTutorOrderAction` | `PENDING_PAYMENT` | 有 |
| `PENDING_TUTOR_CONFIRM` | 大学生/家长 | `rejectTutorOrderAction` / `cancelParentOrderAction` | `CANCELLED` | 有 |
| `PENDING_PAYMENT` | 家长 | `payOrderAction` | `ESCROWED` | 有 |
| `ESCROWED` | 大学生 | `startTutorOrderAction` | `IN_PROGRESS` | 有 |
| `ESCROWED` 或 `IN_PROGRESS` | 大学生 | `submitLessonFeedbackAction` | `PENDING_PARENT_CONFIRM` | 有，但允许跳过开始服务 |
| `PENDING_PARENT_CONFIRM` | 家长 | `confirmParentOrderCompletedAction` | `COMPLETED` | 有 |
| `COMPLETED` | 家长 | `submitReviewAction` | 状态不变，创建评价 | 有 |
| `ESCROWED`/`IN_PROGRESS`/`PENDING_PARENT_CONFIRM` | 家长 | `submitRefundRequestAction` | `REFUND_REQUESTED` | 有 |
| `REFUND_REQUESTED` | 管理员 | `approveRefundAction` | `REFUNDED` | 有 |
| `REFUND_REQUESTED` | 管理员 | `rejectRefundAction` | 推断恢复 | 有，但恢复状态不精确 |

未发现支付和订单状态在当前数据库中不一致；未发现重复支付记录和重复评价。

## 10. 金额审计结果

金额相关字段：

- `TutorProfile.priceMin` / `priceMax`：Int，按“元/小时”展示。
- `Order.hourlyPrice` / `totalAmount` / `serviceFee`：Int。
- `Order.hours`：Float。
- `Payment.amount`：Int。
- `Refund.refundAmount`：Int。

当前数据库中 `Order.totalAmount === Math.round(hours * hourlyPrice)`，未发现现有记录内部计算不一致。

关键风险：

- 预约创建时 `hourlyPrice` 可由表单提交，服务端没有重新从老师资料或价格区间校验。
- 金额字段没有明确“元”或“分”的统一约定；历史 seed 曾有按分存储的痕迹，界面曾出现 `￥30,000` 这类异常展示。
- 退款金额限制不超过 `Payment.amount`，但如果订单创建金额被篡改，支付和退款都会继承错误金额。

## 11. 证明材料安全审计结果

上传：

- 服务端限制 JPEG/PNG/WebP。
- 服务端限制单张最大 5MB。
- 检查 MIME、扩展名和文件头。
- 拒绝空文件、SVG、GIF、PDF、伪装文件。
- 使用随机 UUID 文件名，不使用原始文件名作为存储路径。
- 文件保存在 `.data/tutor-verification/`，不在 `public` 目录。

读取：

- API：`/api/tutor-documents/[documentId]`。
- 未登录、家长、其他大学生均返回 404。
- 大学生本人只能看自己的材料。
- 管理员可以看全部审核材料。
- 响应头包含 `Cache-Control: private, no-store` 和 `X-Content-Type-Options: nosniff`。
- 不暴露 `storageKey` 和服务器真实路径。

审核：

- 管理员通过前会检查存在已提交的在校证明，并检查文件可读取。
- 驳回原因必填。
- 审核结果复用现有通知系统。

主要问题：

- 历史已认证老师大量没有证明材料。
- 审核 Action 缺少当前资料状态校验。
- 数据库层没有限制每个 TutorProfile 只能有一份当前有效在校证明。

## 12. 通知审计结果

可用部分：

- 创建通知前会检查目标用户为 `ACTIVE`。
- 管理员通知只发给 `ACTIVE ADMIN`。
- 单条已读和全部已读都按当前用户 `userId` 过滤。
- 通知内容未发现包含证明材料路径或 `storageKey`。

数据检查结果：

- 当前数据库存在重复通知 payload，例如同一用户多次收到相同“审核通过”通知。

## 13. 数据一致性结果

只读检查结果：

- 用户：33。
- 家长资料：8。
- 家教资料：24。
- 需求：16。
- 订单：19。
- 支付：14。
- 退款：4。
- 评价：5。
- 课后反馈：6。
- 通知：18。
- 证明材料：2。

未发现：

- Payment 和 Order 状态不一致。
- 订单重复支付记录。
- 订单重复评价。
- 材料记录指向缺失文件。
- 多个退款记录挂在同一订单。

发现：

- 15 个已认证老师没有已通过的必填在校证明。
- 6 个待审核老师没有已提交的必填在校证明。
- 存在重复通知 payload。
- 有测试用户姓名为 `????`，前端已有安全显示兜底，但后台数据仍不干净。

## 14. P0 问题清单

### P0-01 预约金额可被客户端改价

- 优先级：P0
- 涉及文件：
  - `src/app/parent/demands/[id]/book/[tutorId]/page.tsx`
  - `src/app/parent/demands/[id]/book/[tutorId]/actions.ts`
  - `src/lib/orders.ts`
  - `src/app/parent/orders/[id]/pay/actions.ts`
- 复现方式：家长进入发起预约页，修改表单中的 `hourlyPrice` 为任意正整数后提交。
- 实际影响：订单总额、支付金额、退款上限均基于被提交的价格生成，存在低价预约、高价异常订单和退款金额异常风险。
- 根本原因：服务端只校验 `hourlyPrice >= 1`，没有重新读取老师价格区间、需求预算或平台定价规则。
- 建议修复方式：在 `createOrderAction` 中重新读取 `TutorProfile.priceMin/priceMax` 和 `Demand.budgetMin/budgetMax`，限制价格必须在允许区间；必要时改为由服务端按规则生成价格，不接受客户端直接定价。
- 修复工作量：中。
- 是否建议立即修复：是。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

## 15. P1 问题清单

### P1-01 历史已认证/待审核老师缺少必填证明材料

- 优先级：P1
- 涉及文件：`prisma/seed.ts`、`src/app/tutor/profile/actions.ts`、`src/app/admin/tutors/[id]/actions.ts`
- 复现方式：只读数据库检查发现 15 个 `APPROVED` TutorProfile 没有已通过的在校证明，6 个 `PENDING` TutorProfile 没有已提交的在校证明。
- 实际影响：新增证明材料审核规则后，历史数据仍能以“已认证”身份参与展示或推荐，认证含义不一致。
- 根本原因：证明材料功能是后加的，历史数据没有迁移或补录材料状态。
- 建议修复方式：增加一次非破坏性补录/标记流程；或在推荐和公开展示中区分“旧认证数据”；正式上线前要求历史老师重新提交证明。
- 修复工作量：中。
- 是否建议立即修复：是。
- 是否涉及数据库修改：可能涉及数据迁移，但不一定修改 schema。
- 是否涉及业务状态修改：可能涉及家教审核状态。

### P1-02 管理员家教审核缺少当前状态约束

- 优先级：P1
- 涉及文件：`src/app/admin/tutors/[id]/actions.ts`
- 复现方式：直接构造审核表单请求，对非 `PENDING` 资料调用通过或驳回 Action。
- 实际影响：管理员可能重复审核，甚至把已通过资料重新驳回，导致审核状态和材料状态不同步。
- 根本原因：Action 校验了角色、材料和驳回原因，但没有校验 `tutorProfile.certificationStatus === PENDING`。
- 建议修复方式：通过和驳回前统一检查资料必须处于待审核；非待审核状态直接返回错误。
- 修复工作量：小。
- 是否建议立即修复：是。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：是，收紧审核状态流转。

### P1-03 同一需求和同一老师可重复创建预约订单

- 优先级：P1
- 涉及文件：`src/app/parent/demands/[id]/book/[tutorId]/actions.ts`
- 复现方式：同一家长、同一需求、同一老师重复提交预约表单。
- 实际影响：产生重复待确认订单，通知重复，家长和老师端状态混乱。
- 根本原因：创建订单前没有查询是否已存在未结束订单，也没有数据库唯一约束或幂等 token。
- 建议修复方式：创建前检查同一 `parentId + demandId + tutorId` 是否已有未结束订单；前端按钮防重复只是辅助，必须服务端兜底。
- 修复工作量：小到中。
- 是否建议立即修复：是。
- 是否涉及数据库修改：可不修改；若要强约束可能需要新增索引。
- 是否涉及业务状态修改：否。

### P1-04 退款驳回后恢复状态不精确

- 优先级：P1
- 涉及文件：`src/app/admin/refunds/[id]/actions.ts`
- 复现方式：在 `IN_PROGRESS` 状态申请退款，管理员驳回。
- 实际影响：代码根据是否有课后反馈和是否已支付推断恢复状态，可能把原本 `IN_PROGRESS` 的订单恢复为 `ESCROWED`。
- 根本原因：Refund 模型没有保存申请前订单状态，驳回时只能用间接条件推断。
- 建议修复方式：退款申请时记录 `previousOrderStatus`，驳回时恢复该状态；若不改 schema，则在 Refund 描述或 adminNote 中无法可靠恢复，不推荐。
- 修复工作量：中。
- 是否建议立即修复：是。
- 是否涉及数据库修改：建议涉及。
- 是否涉及业务状态修改：是。

### P1-05 课后反馈可以跳过“开始服务”

- 优先级：P1
- 涉及文件：`src/app/tutor/orders/[id]/feedback/actions.ts`
- 复现方式：订单支付后处于 `ESCROWED`，老师直接访问反馈提交入口并提交。
- 实际影响：订单可从已担保直接变为待家长确认，绕过 `IN_PROGRESS`。
- 根本原因：`submitLessonFeedbackAction` 明确允许 `ESCROWED` 和 `IN_PROGRESS` 两种状态提交反馈。
- 建议修复方式：若业务要求必须开始服务，则只允许 `IN_PROGRESS` 提交反馈；若允许简化流程，则页面文案和状态机说明应统一。
- 修复工作量：小。
- 是否建议立即修复：是。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：是。

### P1-06 `.env.example` 被忽略，`prisma/dev.db` 未被忽略

- 优先级：P1
- 涉及文件：`.gitignore`、`.env.example`、`prisma/dev.db`
- 复现方式：`git check-ignore -v .env.example` 显示被 `.env*` 忽略；`git status --short prisma/dev.db` 显示数据库文件未忽略。
- 实际影响：示例环境变量文件可能不会被提交；本地 SQLite 数据库可能被误提交，造成测试用户、订单或材料元信息泄漏。
- 根本原因：`.gitignore` 使用 `.env*` 但没有反向包含 `.env.example`，也没有忽略 `prisma/*.db`。
- 建议修复方式：添加 `!.env.example`，并忽略 `prisma/*.db`、`prisma/*.db-journal`、`prisma/*.db-wal`、`prisma/*.db-shm`。
- 修复工作量：小。
- 是否建议立即修复：是。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P1-07 本地文件存储不适合无状态部署环境

- 优先级：P1
- 涉及文件：`src/lib/storage/local-storage.ts`、`next.config.ts`
- 复现方式：部署到无持久磁盘的环境后上传证明材料，实例重启或重新部署可能丢失 `.data/tutor-verification` 文件。
- 实际影响：数据库保留材料记录，但原图丢失，管理员无法审核；用户需重新上传。
- 根本原因：当前只实现本地私有文件系统存储，没有对象存储或持久卷配置。
- 建议修复方式：上线前接入私有对象存储，或明确部署环境必须提供持久私有磁盘。
- 修复工作量：中到大。
- 是否建议立即修复：正式部署前必须修复。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P1-08 证明材料“唯一在校证明”和“最多 5 张能力证明”缺少数据库层并发保护

- 优先级：P1
- 涉及文件：`prisma/schema.prisma`、`src/app/tutor/profile/actions.ts`
- 复现方式：极端并发同时上传多份在校证明或多份能力证明。
- 实际影响：可能出现多个当前有效在校证明，或能力证明数量超过预期。
- 根本原因：限制主要依赖 Action 查询后的业务判断，数据库没有部分唯一索引或事务锁。
- 建议修复方式：在服务端事务内重新计数；如技术允许，增加更强的数据约束。
- 修复工作量：中。
- 是否建议立即修复：建议修复。
- 是否涉及数据库修改：可能涉及。
- 是否涉及业务状态修改：否。

### P1-09 通知存在重复创建

- 优先级：P1
- 涉及文件：`src/lib/notifications.ts` 及各业务 Action。
- 复现方式：当前数据库已有相同用户、标题、内容、链接的重复通知。
- 实际影响：消息中心重复提醒，用户误以为同一事项多次发生。
- 根本原因：通知创建没有业务去重键或幂等策略。
- 建议修复方式：为审核结果、预约状态、退款处理等关键通知增加业务去重条件，或引入 `dedupeKey`。
- 修复工作量：中。
- 是否建议立即修复：建议修复。
- 是否涉及数据库修改：可不修改；若加 `dedupeKey` 则需要 schema。
- 是否涉及业务状态修改：否。

## 16. P2 问题清单

### P2-01 支付事务竞争错误没有友好捕获

- 优先级：P2
- 涉及文件：`src/app/parent/orders/[id]/pay/actions.ts`
- 复现方式：两个请求几乎同时支付同一订单，事务内抛错。
- 实际影响：可能出现 500 或不友好错误，而不是回到支付页显示提示。
- 根本原因：事务外层没有 `try/catch` 转换为 `redirectWithError`。
- 建议修复方式：包裹事务并将错误转换为用户可读提示。
- 修复工作量：小。
- 是否建议立即修复：可以排在 P1 后。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P2-02 AppChrome 依赖 proxy 注入 `x-pathname`

- 优先级：P2
- 涉及文件：`src/proxy.ts`、`src/components/AppChrome.tsx`
- 复现方式：如果 `proxy.ts` 未被框架执行或 matcher 被改坏，`AppChrome` 会把路径默认为 `/`，导致业务页导航和 Footer 不显示。
- 实际影响：当前构建通过且页面设计依赖该机制，但它是一个容易被后续改坏的隐性耦合点。
- 根本原因：Root layout 服务端组件无法直接使用 `usePathname`，改用自定义请求头传递路径。
- 建议修复方式：保留 `proxy.ts` 并补充注释；或改为 route group layout 分离认证页和业务页。
- 修复工作量：中。
- 是否建议立即修复：可暂缓。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P2-03 文件缺失时图片区域缺少自然占位

- 优先级：P2
- 涉及文件：`src/app/tutor/profile/page.tsx`、`src/app/admin/tutors/[id]/page.tsx`
- 复现方式：删除 `.data/tutor-verification` 中某个文件但保留数据库记录。
- 实际影响：API 安全返回 404，页面不会泄漏路径，但图片区域可能只是加载失败。
- 根本原因：页面无法预先知道每张图片的实际可读性。
- 建议修复方式：服务端页面可批量检查 `documentFileExists` 并显示“证明图片暂时无法加载”。
- 修复工作量：小。
- 是否建议立即修复：可暂缓。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P2-04 seed 会清空数据，不适合在已有业务数据环境误运行

- 优先级：P2
- 涉及文件：`prisma/seed.ts`
- 复现方式：运行 `npx prisma db seed`。
- 实际影响：删除现有用户、需求、订单等数据并重建演示数据。
- 根本原因：seed 设计为重置演示库。
- 建议修复方式：文档中明确 seed 仅用于重置本地演示库；正式数据环境禁用。
- 修复工作量：小。
- 是否建议立即修复：可暂缓。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

### P2-05 当前没有自动化业务测试

- 优先级：P2
- 涉及文件：`package.json`
- 复现方式：未发现 `test` 脚本或 Playwright/单元测试脚本。
- 实际影响：后续修改订单、审核、支付流程时只能靠人工回归，风险较高。
- 根本原因：项目以阶段开发和手工验证为主。
- 建议修复方式：补充最小的 Playwright 关键路径测试和 Server Action 单元测试。
- 修复工作量：中。
- 是否建议立即修复：可排在 P0/P1 后。
- 是否涉及数据库修改：否。
- 是否涉及业务状态修改：否。

## 17. 推荐修复顺序

1. 修复预约金额客户端改价问题。
2. 修复管理员审核状态约束。
3. 处理历史老师证明材料缺失问题。
4. 修复退款驳回恢复状态不精确问题。
5. 修复 `.gitignore`，确保 `.env.example` 可提交、SQLite 数据库不可误提交。
6. 增加重复预约服务端校验。
7. 统一课后反馈是否必须经过“开始服务”。
8. 为关键通知增加去重策略。
9. 部署前替换本地材料存储方案。

## 18. 建议修改文件范围

优先修复会涉及：

- `src/app/parent/demands/[id]/book/[tutorId]/actions.ts`
- `src/app/admin/tutors/[id]/actions.ts`
- `src/app/admin/refunds/[id]/actions.ts`
- `src/app/tutor/orders/[id]/feedback/actions.ts`
- `.gitignore`
- `src/lib/notifications.ts`
- `src/lib/storage/*`
- 可能的 `prisma/schema.prisma`，仅当决定增加退款前状态、通知去重键或材料约束时需要。

## 19. 预计工作量

- P0 修复：0.5 天以内。
- P1 第一批修复：1-2 天。
- 证明材料存储生产化：1-2 天，取决于最终存储服务。
- 自动化测试补充：1-2 天。

## 20. 总结

三种角色的核心页面和 Server Action 基本齐全，当前工程可以 lint/build。证明材料读取接口权限保护较好，未发现家长或其他学生可直接读取材料原图的明显漏洞。最需要立即处理的是预约金额由客户端决定的问题，其次是审核状态约束、历史证明材料缺失、退款驳回恢复状态和配置忽略规则。
## 21. 关键问题修复记录（2026-06-17）

本次只处理审计报告中指定的五个严重问题，未处理其他 P1/P2。

### P0-01 预约金额可被客户端改价

- 修复状态：已修复。
- 修改文件：`src/lib/orders.ts`、`src/app/parent/demands/[id]/book/[tutorId]/actions.ts`、`src/app/parent/demands/[id]/book/[tutorId]/page.tsx`、`src/app/parent/orders/[id]/pay/actions.ts`。
- 修复方式：创建预约时服务端重新读取需求预算和老师价格区间，通过 `calculateServerHourlyPrice` 计算单价；表单中的 `hourlyPrice` 不再作为可信字段；支付记录金额写入 `Order.totalAmount`。
- 验证方式：`npm run check:critical-business-rules`、`npm run lint`、`npm run build`。
- 剩余风险：金额字段仍使用 Int 表示“元”，后续若接入真实支付建议统一为“分”。

### P1-01 历史已认证/待审核家教缺少必填证明

- 修复状态：已修复当前本地数据，并新增检查/修复脚本。
- 修改文件：`scripts/check-tutor-verification-consistency.ts`、`package.json`。
- 修复方式：新增 `npm run check:tutor-verification` dry-run 检查；新增 `npm run repair:tutor-verification -- --apply` 显式修复。当前本地库中 21 个缺少有效在校证明的已认证/待审核家教已降级为 `REJECTED`，审核备注为“请补充有效的学生证、校园卡或在读证明后重新提交审核。”
- 验证方式：修复后 `npm run check:tutor-verification` 输出缺失数量为 0。
- 剩余风险：正式环境需要先 dry-run，再人工确认后执行 `--apply`。

### P1-02 管理员家教审核缺少待审核状态约束

- 修复状态：已修复。
- 修改文件：`src/app/admin/tutors/[id]/actions.ts`。
- 修复方式：通过/驳回前校验 `certificationStatus === PENDING`；事务内使用带状态条件的 `updateMany` 原子更新，重复点击或并发处理时只会有第一次生效；材料状态和通知在同一事务中处理。
- 验证方式：`npm run lint`、`npm run build`。
- 剩余风险：当前没有完整自动化并发测试，已通过原子条件降低重复审核风险。

### P1-03 同一需求和同一大学生家教可重复预约

- 修复状态：已修复。
- 修改文件：`prisma/schema.prisma`、`prisma/migrations/20260617123000_fix_critical_business_rules/migration.sql`、`src/app/parent/demands/[id]/book/[tutorId]/actions.ts`、`scripts/check-duplicate-bookings.ts`、`package.json`。
- 修复方式：创建订单前服务端检查同一 `demandId + tutorId` 是否已有订单；数据库增加 `@@unique([demandId, tutorId])`；捕获 `P2002` 返回用户友好提示。
- 历史数据处理：发现 1 组重复预约，保留已完成订单，2 条未支付未开始的重复预约标记为 `CANCELLED` 并清空 `demandId`，未删除任何订单、支付、退款、反馈或评价数据。
- 验证方式：`npm run check:duplicate-bookings` 输出重复组合为 0。
- 剩余风险：历史取消订单已脱离原需求关系，仅用于满足唯一约束且保留订单记录。

### P1-04 退款驳回后恢复状态不精确

- 修复状态：已修复。
- 修改文件：`prisma/schema.prisma`、`prisma/migrations/20260617123000_fix_critical_business_rules/migration.sql`、`src/app/parent/orders/[id]/refund/actions.ts`、`src/app/admin/refunds/[id]/actions.ts`。
- 修复方式：`Refund` 新增 `previousOrderStatus`；家长申请退款时保存申请前订单状态；管理员驳回时只恢复该字段记录的合法状态；缺失或非法时阻止驳回并提示数据异常。
- 验证方式：`npm run check:critical-business-rules` 检查待处理退款缺少原状态数量为 0。
- 剩余风险：历史已处理退款不会反推原状态；当前逻辑只阻止未来待处理异常记录。
# 信息服务费与结算功能补充记录（2026-06-18）

- 新增订单费率与金额快照：固定 500 基点，金额统一按整数分保存。
- 新增 Settlement 模型与订单唯一约束，家长确认完成时通过事务创建 MOCK 结算。
- Payment 继续记录家长支付的完整订单总额，5% 信息服务费从大学生结算侧扣取。
- 家长、大学生和管理员页面已补充费用说明与结算记录。
- 已结算订单不能直接进入普通退款流程，当前需要管理员人工售后处理。
- 新增 `npm run check:settlement-consistency` 只读检查；历史已完成订单不会自动补建结算。

## 22. 剩余 P1 修复记录（2026-06-18）

- P1-05 已修复：课后反馈页面和 Server Action 统一只接受 `IN_PROGRESS`，不能再从 `ESCROWED` 跳过“开始服务”。
- P1-06 已修复：`.env.example` 已解除忽略，SQLite 本地数据库及其 journal/WAL/SHM 文件已加入忽略规则；新增服务端环境配置解析。
- P1-07 代码保护已完成、部署验证待完成：生产环境禁止 `LOCAL` 私有文件存储，必须配置绝对路径的持久私有卷；仍需在真实部署环境验证持久性、权限、备份和多实例共享。
- P1-08 已修复：上传事务内重新计数能力证明，SQLite 部分唯一索引限制每份资料只有一份当前有效在校证明。
- P1-09 新写入路径已修复：关键通知使用 nullable unique `dedupeKey` 和 upsert 防止重试重复。历史 2 组相同 payload 未自动删除，需人工复核。
- 新增 migration：`20260618060000_remaining_p1_constraints`，已成功应用；当前数据库 8 条 migration 均为最新。
- 新增 `npm run check:data-consistency`。最终检查阻断项为 0；5 个历史完成订单缺少 Settlement，仍按既有规则等待管理员确认后显式补建。
- 完整记录见 `docs/remaining-p1-remediation-report.md`。
- 详细设计、边界与限制见 `docs/platform-fee-and-settlement.md`。
