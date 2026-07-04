import { AlipayProvider } from "@/lib/payments/alipayProvider";
import { getPaymentConfig } from "@/lib/payments/config";
import { MockPaymentProvider } from "@/lib/payments/mockProvider";
import { QrCodePaymentProvider } from "@/lib/payments/qrcodeProvider";
import type { PaymentProvider } from "@/lib/payments/types";
import { WechatPayProvider } from "@/lib/payments/wechatProvider";

export function getCurrentPaymentProvider(): PaymentProvider {
  const { provider } = getPaymentConfig();

  if (provider === "ALIPAY") {
    return new AlipayProvider();
  }

  if (provider === "WECHAT") {
    return new WechatPayProvider();
  }

  if (provider === "QRCODE") {
    return new QrCodePaymentProvider();
  }

  return new MockPaymentProvider();
}

export const currentPaymentProvider = getCurrentPaymentProvider();

export type {
  CreatePaymentInput,
  CreatePaymentOptions,
  CreatePaymentResult,
  PaymentNotifyResult,
  PaymentProvider,
  PaymentProviderName,
  QueryPaymentInput,
  QueryPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from "@/lib/payments/types";
