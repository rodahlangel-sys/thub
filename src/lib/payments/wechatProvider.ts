import { buildMissingConfigMessage } from "@/lib/payments/errors";
import { getPaymentConfig, getWechatMissingConfig } from "@/lib/payments/config";
import type {
  CreatePaymentResult,
  PaymentNotifyResult,
  PaymentProvider,
  QueryPaymentResult,
  RefundPaymentResult,
} from "@/lib/payments/types";

export class WechatPayProvider implements PaymentProvider {
  private canUseProvider() {
    const config = getPaymentConfig();
    const missing = getWechatMissingConfig();

    if (!config.enableRealProvider || missing.length > 0) {
      return {
        enabled: false,
        message: buildMissingConfigMessage("微信支付", missing),
      };
    }

    return { enabled: true, message: "" };
  }

  async createPayment(): Promise<CreatePaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "WECHAT",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里发起微信 Native 支付或 H5 支付下单，
    // 返回二维码链接或 H5 支付链接。
    return {
      success: false,
      provider: "WECHAT",
      message: "微信支付尚未接入真实接口",
    };
  }

  async queryPayment(): Promise<QueryPaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "WECHAT",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里调用微信支付订单查询接口。
    return {
      success: false,
      provider: "WECHAT",
      message: "微信支付订单查询尚未接入",
    };
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "WECHAT",
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里调用微信支付退款申请接口。
    return {
      success: false,
      provider: "WECHAT",
      message: "微信支付退款尚未接入真实接口",
    };
  }

  async verifyNotify(params: unknown): Promise<PaymentNotifyResult> {
    const readiness = this.canUseProvider();

    if (!readiness.enabled) {
      return {
        success: false,
        provider: "WECHAT",
        raw: params,
        message: readiness.message,
      };
    }

    // TODO: 真实接入时在这里完成微信支付通知验签、resource 解密，并更新 Payment / Order。
    return {
      success: false,
      provider: "WECHAT",
      raw: params,
      message: "微信支付通知验签和解密尚未接入",
    };
  }
}
