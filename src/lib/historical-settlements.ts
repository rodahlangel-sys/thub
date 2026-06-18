import { calculateSettlementAmounts } from "./settlements";

export type HistoricalSettlementCandidate = {
  orderId: string;
  status: string;
  totalAmountFen: number;
  platformFeeRateBps: number;
  platformFeeAmountFen: number;
  tutorNetAmountFen: number;
  parentRole: string;
  tutorRole: string;
  paymentStatus: string | null;
  paymentAmountFen: number | null;
  refundStatuses: string[];
  hasSettlement: boolean;
};

export type HistoricalSettlementSkipReason =
  | "ORDER_NOT_COMPLETED"
  | "PAYMENT_NOT_PAID"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "REFUND_PENDING_OR_APPROVED"
  | "SETTLEMENT_ALREADY_EXISTS"
  | "INVALID_PARTICIPANT_ROLES"
  | "INVALID_FEE_SNAPSHOT";

export function evaluateHistoricalSettlementCandidate(
  candidate: HistoricalSettlementCandidate,
) {
  const reasons: HistoricalSettlementSkipReason[] = [];

  if (candidate.status !== "COMPLETED") reasons.push("ORDER_NOT_COMPLETED");
  if (candidate.paymentStatus !== "PAID") reasons.push("PAYMENT_NOT_PAID");
  if (candidate.paymentAmountFen !== candidate.totalAmountFen) {
    reasons.push("PAYMENT_AMOUNT_MISMATCH");
  }
  if (candidate.refundStatuses.some((status) => status === "PENDING" || status === "APPROVED")) {
    reasons.push("REFUND_PENDING_OR_APPROVED");
  }
  if (candidate.hasSettlement) reasons.push("SETTLEMENT_ALREADY_EXISTS");
  if (candidate.parentRole !== "PARENT" || candidate.tutorRole !== "TUTOR") {
    reasons.push("INVALID_PARTICIPANT_ROLES");
  }

  let amounts: ReturnType<typeof calculateSettlementAmounts> | undefined;
  try {
    amounts = calculateSettlementAmounts(
      candidate.totalAmountFen,
      candidate.platformFeeRateBps,
    );
    if (
      candidate.platformFeeRateBps !== 500 ||
      candidate.platformFeeAmountFen !== amounts.platformFeeAmountFen ||
      candidate.tutorNetAmountFen !== amounts.tutorNetAmountFen ||
      amounts.platformFeeAmountFen + amounts.tutorNetAmountFen !== amounts.grossAmountFen
    ) {
      reasons.push("INVALID_FEE_SNAPSHOT");
    }
  } catch {
    reasons.push("INVALID_FEE_SNAPSHOT");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    amounts: reasons.includes("INVALID_FEE_SNAPSHOT") ? undefined : amounts,
  };
}
