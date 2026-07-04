import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  QueryPaymentInput,
  QueryPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from "@/lib/payments/types";

export class QrCodePaymentProvider implements PaymentProvider {
  async createPayment(order: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      success: true,
      provider: "QRCODE",
      status: "WAIT_PLATFORM_CONFIRM",
      amount: order.amount,
      message: "扫码支付已发起，等待平台确认收款。",
    };
  }

  async queryPayment(params: QueryPaymentInput): Promise<QueryPaymentResult> {
    return {
      success: true,
      provider: "QRCODE",
      transactionNo: params.transactionNo,
      status: "WAIT_PLATFORM_CONFIRM",
      message: "扫码支付由平台和家教人工确认。",
    };
  }

  async refundPayment(params: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      provider: "QRCODE",
      status: "REFUNDED",
      transactionNo: params.transactionNo,
      refundTransactionNo: `QRCODE-REFUND-${Date.now()}`,
      refundAmount: params.refundAmount,
      refundedAt: new Date(),
      message: "扫码支付退款已按平台人工流程记录。",
    };
  }
}
