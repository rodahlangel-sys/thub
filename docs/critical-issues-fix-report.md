# THub 关键问题修复报告

更新时间：2026-06-17

本报告只记录本阶段指定的五个严重问题修复情况。其他 P1/P2 暂未处理。

## 1. 修改前检查

- `npx prisma validate`：通过。
- `npx prisma generate`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- 当前分支：`master`。
- 工作区状态：进入本阶段前已有大量未提交/未跟踪文件，本次未执行 `git reset`、`git clean`，未丢弃既有修改。

## 2. 预约金额安全修复

### 原因

家长创建预约时，`hourlyPrice` 来自表单字段。用户可以通过浏览器开发工具修改该字段，导致订单金额、支付金额和退款上限基于被篡改价格生成。

### 修复方式

- 新增 `calculateServerHourlyPrice`，由服务端根据需求预算和老师资料中的价格区间计算本次订单单价。
- 创建预约的 Server Action 不再读取或信任 `FormData.hourlyPrice`。
- 预约页面中的价格只作为只读展示，不再带 `name="hourlyPrice"` 提交。
- Payment 写入金额时使用 `Order.totalAmount`，并拒绝与订单金额不一致的支付结果。

### 修改文件

- `src/lib/orders.ts`
- `src/app/parent/demands/[id]/book/[tutorId]/actions.ts`
- `src/app/parent/demands/[id]/book/[tutorId]/page.tsx`
- `src/app/parent/orders/[id]/pay/actions.ts`

### 剩余风险

金额字段当前仍以 Int 表示“元”。真实支付接入前建议统一为“分”，减少金额精度与单位歧义。

## 3. 历史认证材料一致性修复

### 原因

证明材料功能是后续新增的，历史已认证或待审核家教资料中存在缺少必填在校证明的记录。

### 修复方式

- 新增 `scripts/check-tutor-verification-consistency.ts`。
- 新增 `npm run check:tutor-verification` 只读检查。
- 新增 `npm run repair:tutor-verification -- --apply` 显式修复。
- 当前本地库发现 21 个缺少有效在校证明的已认证/待审核家教资料，已降级为 `REJECTED`。
- 修复备注统一为：`请补充有效的学生证、校园卡或在读证明后重新提交审核。`
- 未删除用户、文字资料、订单、支付、退款、反馈或评价。

### 修改文件

- `scripts/check-tutor-verification-consistency.ts`
- `package.json`

### 验证

修复后 `npm run check:tutor-verification` 输出：

- Approved/pending profiles missing required proof: 0
- Documents with missing files: 0
- Orphan document records: 0
- Profiles with multiple current school proofs: 0

## 4. 管理员审核状态约束修复

### 原因

管理员审核通过/驳回 Action 没有强制要求资料仍处于 `PENDING`，可能重复审核或把已通过资料重新驳回。

### 修复方式

- 通过/驳回前先检查 `TutorProfile.certificationStatus === PENDING`。
- 事务内使用带状态条件的 `updateMany` 原子更新，防止重复点击和并发覆盖。
- 证明材料状态和审核结果通知在同一事务内处理。
- 非待审核状态返回：`该资料已被处理，请刷新页面查看最新状态。`

### 修改文件

- `src/app/admin/tutors/[id]/actions.ts`

### 剩余风险

当前没有专门并发自动化测试；通过数据库条件更新降低并发重复审核风险。

## 5. 重复预约修复

### 原因

同一需求和同一大学生家教之间没有服务端去重和数据库唯一约束，重复提交表单可创建多个预约订单。

### 修复方式

- 新增 `scripts/check-duplicate-bookings.ts` 检查重复组合。
- 创建预约前服务端检查同一 `demandId + tutorId` 是否已有订单。
- 数据库增加 `@@unique([demandId, tutorId])`。
- 捕获 Prisma `P2002`，返回用户友好提示：`该预约已经存在，请勿重复提交。`

### 历史数据处理

- 检查发现 1 组重复预约。
- 保留状态最完整的已完成订单。
- 2 条未支付、未开始的重复预约已标记为 `CANCELLED` 并清空 `demandId`，以便数据库唯一约束安全生效。
- 未删除任何订单、支付、退款、反馈或评价。

### 修改文件

- `prisma/schema.prisma`
- `prisma/migrations/20260617123000_fix_critical_business_rules/migration.sql`
- `src/app/parent/demands/[id]/book/[tutorId]/actions.ts`
- `scripts/check-duplicate-bookings.ts`
- `package.json`

### 验证

修复后 `npm run check:duplicate-bookings` 输出重复组合为 0。

## 6. 退款状态恢复修复

### 原因

退款申请会把订单状态改为 `REFUND_REQUESTED`，管理员驳回时只能根据是否有反馈、是否支付来推断原状态，无法精确恢复。

### 修复方式

- `Refund` 新增 `previousOrderStatus OrderStatus?`。
- 家长申请退款时，在事务中保存申请前订单状态。
- 管理员拒绝退款时，只恢复 `Refund.previousOrderStatus` 中保存的合法状态。
- 如果原状态缺失或非法，阻止驳回并提示：`该退款记录缺少原订单状态，请先处理数据异常。`
- 管理员通过退款时继续进入 `REFUNDED`，不改变原有退款通过语义。

### 修改文件

- `prisma/schema.prisma`
- `prisma/migrations/20260617123000_fix_critical_business_rules/migration.sql`
- `src/app/parent/orders/[id]/refund/actions.ts`
- `src/app/admin/refunds/[id]/actions.ts`

### 历史数据

当前关键规则检查未发现 `PENDING` 且订单处于 `REFUND_REQUESTED` 但缺少 `previousOrderStatus` 的退款记录。

## 7. Prisma migration

新增 migration：

```text
prisma/migrations/20260617123000_fix_critical_business_rules/migration.sql
```

内容：

- `Refund` 增加 `previousOrderStatus` 字段。
- `Order` 增加 `demandId + tutorId` 唯一索引。

执行方式：

- `npx prisma migrate deploy`

## 8. 数据检查脚本

新增/更新：

- `npm run check:duplicate-bookings`
- `npm run check:tutor-verification`
- `npm run repair:tutor-verification -- --apply`
- `npm run check:critical-business-rules`

`check:critical-business-rules` 当前检查：

- 已认证/待审核家教是否缺少必填在校证明。
- 是否存在重复 `demandId + tutorId` 预约。
- 是否存在待处理退款缺少 `previousOrderStatus`。
- `Payment.amount` 是否等于 `Order.totalAmount`。
- `Refund.refundAmount` 是否超过支付金额。

## 9. 验证结果

- `npm run check:duplicate-bookings`：通过，重复组合为 0。
- `npm run check:tutor-verification`：通过，缺失证明数量为 0。
- `npm run check:critical-business-rules`：通过，关键规则问题为 0。
- `npm run lint`：通过。
- `npm run build`：通过。

最终收尾验证还需运行：

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npm run build`

## 10. 未处理事项

本阶段未处理审计报告中的其他 P1/P2，包括但不限于：

- 课后反馈是否必须经过开始服务状态。
- 通知重复创建。
- 本地文件存储不适合无状态部署。
- `.env.example` 与 SQLite 数据库忽略规则。
- 自动化业务测试体系不足。

## 11. 后续剩余 P1 处理（2026-06-18）

上述“未处理事项”中的课后反馈状态、通知幂等、环境文件/SQLite 忽略规则和证明材料并发约束已在后续阶段处理。生产文件存储已增加持久卷配置与生产禁用本地临时目录的保护，但仍需真实部署环境验收。详细变更、migration、数据检查与剩余人工验证见 `docs/remaining-p1-remediation-report.md`。
