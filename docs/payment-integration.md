# 支付宝 / 微信支付接入准备说明

## 当前状态

- 当前项目默认使用 `MOCK` 模拟支付。
- 支付宝和微信支付 Provider 已预留，但未启用真实接口。
- 本阶段不会调用支付宝或微信支付生产环境，也不会产生真实扣款。

## 支付宝接入准备

后续真实接入支付宝通常需要准备：

- 支付宝开放平台账号
- 已创建网页支付应用或相关支付产品
- `APP_ID`
- 应用私钥
- 支付宝公钥或证书模式配置
- 支付宝网关
- 异步通知地址
- 同步返回地址
- 沙箱环境参数

建议先使用支付宝沙箱环境验证下单、异步通知验签、交易查询和退款，再切换正式环境。

## 微信支付接入准备

后续真实接入微信支付通常需要准备：

- 微信支付商户号
- 关联的 AppID
- APIv3 密钥
- 商户 API 私钥
- 商户证书序列号
- 支付通知地址
- 退款通知地址，后续可选
- 可访问公网的回调地址
- 如果使用 H5 支付，后续可能需要域名和场景配置

建议先明确使用 Native 支付还是 H5 支付，再补充对应的下单参数和前端展示方式。

## 本项目支付流程

- 家长订单状态为 `PENDING_PAYMENT` 时，可以进入支付页。
- `MOCK` 支付成功后，`Order.status` 变为 `ESCROWED`。
- `Payment.status` 变为 `PAID`。
- 后续真实支付成功应在异步通知中验签确认后，再更新 `Payment` 和 `Order`。

## 安全要求

- 不要提交 `.env`。
- 不要提交私钥和证书。
- 不要在前端暴露商户密钥。
- 不要通过同步返回页直接确认支付成功。
- 真实支付必须以后端回调验签为准。

## 后续接入顺序建议

1. 先接支付宝沙箱。
2. 再接支付宝正式环境。
3. 再接微信 Native 或 H5。
4. 最后接真实退款。

## 相关文件

- `src/lib/payments/types.ts`
- `src/lib/payments/config.ts`
- `src/lib/payments/mockProvider.ts`
- `src/lib/payments/alipayProvider.ts`
- `src/lib/payments/wechatProvider.ts`
- `src/lib/payments/index.ts`
- `src/app/api/payments/alipay/notify/route.ts`
- `src/app/api/payments/wechat/notify/route.ts`
- `src/app/payment/alipay/return/page.tsx`
