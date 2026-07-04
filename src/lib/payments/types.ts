export type PaymentProviderName = "MOCK" | "QRCODE" | "ALIPAY" | "WECHAT";

export type CreatePaymentInput = {
  id: string;
  amount: number;
  subject: string;
};

export type CreatePaymentOptions = {
  returnUrl?: string;
  notifyUrl?: string;
  clientIp?: string;
};

export type CreatePaymentResult = {
  success: boolean;
  provider: PaymentProviderName;
  paymentUrl?: string;
  qrCodeUrl?: string;
  transactionNo?: string;
  raw?: unknown;
  message?: string;
  amount?: number;
  status?: "UNPAID" | "WAIT_PLATFORM_CONFIRM" | "WAIT_TUTOR_PAYMENT" | "WAIT_TUTOR_CONFIRM" | "PAID";
  paidAt?: Date;
};

export type QueryPaymentInput = {
  transactionNo: string;
};

export type QueryPaymentResult = {
  success: boolean;
  provider: PaymentProviderName;
  transactionNo?: string;
  status?: string;
  paidAt?: Date;
  raw?: unknown;
  message?: string;
};

export type RefundPaymentInput = {
  transactionNo: string;
  refundAmount: number;
  reason: string;
};

export type RefundPaymentResult = {
  success: boolean;
  provider: PaymentProviderName;
  refundTransactionNo?: string;
  refundedAt?: Date;
  raw?: unknown;
  message?: string;
  status?: "REFUNDED";
  transactionNo?: string;
  refundAmount?: number;
};

export type PaymentNotifyResult = {
  success: boolean;
  provider: PaymentProviderName;
  transactionNo?: string;
  orderId?: string;
  status?: string;
  raw?: unknown;
  message?: string;
};

export type PaymentProvider = {
  createPayment(
    order: CreatePaymentInput,
    options?: CreatePaymentOptions,
  ): Promise<CreatePaymentResult>;
  queryPayment(params: QueryPaymentInput): Promise<QueryPaymentResult>;
  refundPayment(params: RefundPaymentInput): Promise<RefundPaymentResult>;
  verifyNotify?(params: unknown): Promise<PaymentNotifyResult>;
};

export type PaymentOrderInput = CreatePaymentInput;
export type PaymentCreateResult = CreatePaymentResult;
export type PaymentQueryResult = QueryPaymentResult;
export type RefundPaymentParams = RefundPaymentInput;
