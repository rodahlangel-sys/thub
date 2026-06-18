export type UserRole = "parent" | "tutor" | "admin";

export type PaymentStatus =
  | "unpaid"
  | "escrow_pending"
  | "escrow_paid"
  | "released"
  | "refunded";

export type RefundStatus = "none" | "pending" | "approved" | "rejected";
