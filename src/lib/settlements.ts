export const PLATFORM_FEE_RATE_BPS = 500;
export const SETTLEMENT_PROVIDER = "MOCK" as const;

type SettlementAmounts = {
  grossAmountFen: number;
  platformFeeRateBps: number;
  platformFeeAmountFen: number;
  tutorNetAmountFen: number;
};

function requireSafeInteger(value: number, name: string, allowZero = false) {
  if (
    !Number.isSafeInteger(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error(`${name}_INVALID`);
  }
}

export function getPlatformFeeRateBps(
  configuredValue = process.env.PLATFORM_FEE_RATE_BPS,
) {
  if (configuredValue === undefined || configuredValue.trim() === "") {
    return PLATFORM_FEE_RATE_BPS;
  }

  const value = Number(configuredValue);

  if (!Number.isInteger(value) || value !== PLATFORM_FEE_RATE_BPS) {
    throw new Error("PLATFORM_FEE_RATE_INVALID");
  }

  return value;
}

export function getSettlementProvider(
  configuredValue = process.env.SETTLEMENT_PROVIDER,
) {
  if (configuredValue === undefined || configuredValue.trim() === "") {
    return SETTLEMENT_PROVIDER;
  }

  if (configuredValue !== SETTLEMENT_PROVIDER) {
    throw new Error("SETTLEMENT_PROVIDER_INVALID");
  }

  return SETTLEMENT_PROVIDER;
}

export function calculateOrderGrossAmountFen(
  hours: number,
  hourlyPriceFen: number,
) {
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("ORDER_HOURS_INVALID");
  }

  requireSafeInteger(hourlyPriceFen, "HOURLY_PRICE");

  const grossAmountFen = Math.round(hours * hourlyPriceFen);
  requireSafeInteger(grossAmountFen, "GROSS_AMOUNT");
  return grossAmountFen;
}

export function yuanToFen(amountYuan: number) {
  if (!Number.isFinite(amountYuan) || amountYuan <= 0) {
    throw new Error("YUAN_AMOUNT_INVALID");
  }

  const amountFen = Math.round(amountYuan * 100);
  requireSafeInteger(amountFen, "FEN_AMOUNT");
  return amountFen;
}

export function calculateSettlementAmounts(
  grossAmountFen: number,
  platformFeeRateBps: number,
): SettlementAmounts {
  requireSafeInteger(grossAmountFen, "GROSS_AMOUNT");
  requireSafeInteger(platformFeeRateBps, "PLATFORM_FEE_RATE", true);

  if (platformFeeRateBps > 10_000) {
    throw new Error("PLATFORM_FEE_RATE_INVALID");
  }

  const platformFeeAmountFen = Math.round(
    (grossAmountFen * platformFeeRateBps) / 10_000,
  );
  const tutorNetAmountFen = grossAmountFen - platformFeeAmountFen;

  requireSafeInteger(platformFeeAmountFen, "PLATFORM_FEE_AMOUNT", true);
  requireSafeInteger(tutorNetAmountFen, "TUTOR_NET_AMOUNT", true);

  if (platformFeeAmountFen + tutorNetAmountFen !== grossAmountFen) {
    throw new Error("SETTLEMENT_AMOUNT_MISMATCH");
  }

  return {
    grossAmountFen,
    platformFeeRateBps,
    platformFeeAmountFen,
    tutorNetAmountFen,
  };
}

export function formatFen(amountFen: number) {
  if (!Number.isSafeInteger(amountFen) || amountFen < 0) {
    return "金额待确认";
  }

  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountFen / 100);
}

export function createMockSettlementTransactionNo(now = new Date()) {
  const timestamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `MOCK-SETTLEMENT-${timestamp}-${random}`;
}
