import type { PaymentProviderName } from "@/lib/payments/types";

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function readBooleanEnv(name: string) {
  return readEnv(name).toLowerCase() === "true";
}

function normalizeProvider(value: string): PaymentProviderName {
  if (value === "ALIPAY" || value === "WECHAT" || value === "MOCK") {
    return value;
  }

  return "MOCK";
}

export function getPaymentConfig() {
  const provider = normalizeProvider(readEnv("PAYMENT_PROVIDER") || "MOCK");

  return {
    provider,
    enableRealProvider: readBooleanEnv("PAYMENT_ENABLE_REAL_PROVIDER"),
    notifyBaseUrl: readEnv("PAYMENT_NOTIFY_BASE_URL") || "http://localhost:3000",
    alipay: {
      appId: readEnv("ALIPAY_APP_ID"),
      privateKey: readEnv("ALIPAY_PRIVATE_KEY"),
      publicKey: readEnv("ALIPAY_PUBLIC_KEY"),
      gateway:
        readEnv("ALIPAY_GATEWAY") ||
        "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
      returnUrl:
        readEnv("ALIPAY_RETURN_URL") ||
        "http://localhost:3000/payment/alipay/return",
      notifyUrl:
        readEnv("ALIPAY_NOTIFY_URL") ||
        "http://localhost:3000/api/payments/alipay/notify",
      signType: readEnv("ALIPAY_SIGN_TYPE") || "RSA2",
    },
    wechat: {
      appId: readEnv("WECHAT_PAY_APP_ID"),
      mchId: readEnv("WECHAT_PAY_MCH_ID"),
      apiV3Key: readEnv("WECHAT_PAY_API_V3_KEY"),
      privateKey: readEnv("WECHAT_PAY_PRIVATE_KEY"),
      certSerialNo: readEnv("WECHAT_PAY_CERT_SERIAL_NO"),
      notifyUrl:
        readEnv("WECHAT_PAY_NOTIFY_URL") ||
        "http://localhost:3000/api/payments/wechat/notify",
      gateway:
        readEnv("WECHAT_PAY_GATEWAY") || "https://api.mch.weixin.qq.com",
    },
  };
}

export function getAlipayMissingConfig() {
  const { alipay } = getPaymentConfig();
  const missing: string[] = [];

  if (!alipay.appId) missing.push("ALIPAY_APP_ID");
  if (!alipay.privateKey) missing.push("ALIPAY_PRIVATE_KEY");
  if (!alipay.publicKey) missing.push("ALIPAY_PUBLIC_KEY");
  if (!alipay.gateway) missing.push("ALIPAY_GATEWAY");
  if (!alipay.notifyUrl) missing.push("ALIPAY_NOTIFY_URL");

  return missing;
}

export function getWechatMissingConfig() {
  const { wechat } = getPaymentConfig();
  const missing: string[] = [];

  if (!wechat.appId) missing.push("WECHAT_PAY_APP_ID");
  if (!wechat.mchId) missing.push("WECHAT_PAY_MCH_ID");
  if (!wechat.apiV3Key) missing.push("WECHAT_PAY_API_V3_KEY");
  if (!wechat.privateKey) missing.push("WECHAT_PAY_PRIVATE_KEY");
  if (!wechat.certSerialNo) missing.push("WECHAT_PAY_CERT_SERIAL_NO");
  if (!wechat.notifyUrl) missing.push("WECHAT_PAY_NOTIFY_URL");

  return missing;
}

export function getPaymentMethodAvailability() {
  const config = getPaymentConfig();

  return {
    mock: true,
    alipay:
      config.provider === "ALIPAY" &&
      config.enableRealProvider &&
      getAlipayMissingConfig().length === 0,
    wechat:
      config.provider === "WECHAT" &&
      config.enableRealProvider &&
      getWechatMissingConfig().length === 0,
  };
}
