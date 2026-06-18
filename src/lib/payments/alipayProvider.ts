import { buildMissingConfigMessage } from "@/lib/payments/errors";
import { getAlipayMissingConfig, getPaymentConfig } from "@/lib/payments/config";
import type {
  CreatePaymentResult,
  PaymentNotifyResult,
  PaymentProvider,
  QueryPaymentResult,
  RefundPaymentResult,
} from "@/lib/payments/types";

export class AlipayProvider implements PaymentProvider {
  private canUseProvider() {
    const config = getPaymentConfig();
    const missing = getAlipayMissingConfig();

    if (!config.enableRealProvider || missing.length > 0) {
      return {
        enabled: false,
        message: buildMissingConfigMessage("支付宝", missing),
      };
    }

    return { enabled: true, message: "" };
  }

  async createPayment(): Promise<CreatePaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "ALIPAY",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里发起支付宝电脑网站支付或手机网站支付下单，
    // 返回 paymentUrl 给家长跳转，或返回二维码链接供扫码支付。
    return {
      success: false,
      provider: "ALIPAY",
      message: "支付宝支付尚未接入真实接口",
    };
  }

  async queryPayment(): Promise<QueryPaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "ALIPAY",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里调用支付宝交易查询接口。
    return {
      success: false,
      provider: "ALIPAY",
      message: "支付宝交易查询尚未接入",
    };
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "ALIPAY",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里调用支付宝交易退款接口。
    return {
      success: false,
      provider: "ALIPAY",
      message: "支付宝退款尚未接入真实接口",
    };
  }

  async verifyNotify(params: unknown): Promise<PaymentNotifyResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "ALIPAY",
        raw: params,
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里完成支付宝异步通知验签，并根据交易状态更新 Payment / Order。
    return {
      success: false,
      provider: "ALIPAY",
      raw: params,
      message: "支付宝异步通知验签尚未接入",
    };
  }
}
