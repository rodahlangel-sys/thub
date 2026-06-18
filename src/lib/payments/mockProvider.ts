import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentNotifyResult,
  PaymentProvider,
  QueryPaymentInput,
  QueryPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
} from "@/lib/payments/types";

function buildMockNo(prefix: string) {
  const randomPart = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");

  return `${prefix}${Date.now()}${randomPart}`;
}

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(order: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      success: true,
      provider: "MOCK",
      status: "PAID",
      amount: order.amount,
      transactionNo: buildMockNo("MOCK"),
      paidAt: new Date(),
      message: "模拟支付成功",
    };
  }

  async queryPayment(params: QueryPaymentInput): Promise<QueryPaymentResult> {
    return {
      success: true,
      provider: "MOCK",
      status: "PAID",
      transactionNo: params.transactionNo,
      paidAt: new Date(),
      message: "模拟支付已完成",
    };
  }

  // 这里只模拟原路退款结果。后续接入支付宝或微信时，可在对应 provider
  // 中替换为真实退款接口调用，并保持返回字段结构一致。
  async refundPayment(params: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      success: true,
      provider: "MOCK",
      status: "REFUNDED",
      transactionNo: params.transactionNo,
      refundTransactionNo: buildMockNo("MOCK_REFUND"),
      refundAmount: params.refundAmount,
      refundedAt: new Date(),
      message: "模拟退款成功",
    };
  }

  async verifyNotify(params: unknown): Promise<PaymentNotifyResult> {
    return {
      success: true,
      provider: "MOCK",
      raw: params,
      message: "模拟支付不需要处理异步通知",
    };
  }
}
