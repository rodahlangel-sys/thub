import type { PaymentProviderName } from "@/lib/payments/types";

export class PaymentConfigurationError extends Error {
  provider: PaymentProviderName;
  missing: string[];

  constructor(provider: PaymentProviderName, missing: string[]) {
    super(`${provider} 支付配置不完整`);
    this.name = "PaymentConfigurationError";
    this.provider = provider;
    this.missing = missing;
  }
}

export function buildMissingConfigMessage(
  providerLabel: string,
  missing: string[],
) {
  if (missing.length === 0) {
    return `${providerLabel}支付尚未启用，请先配置商户参数`;
  }

  return `${providerLabel}支付配置不完整，请先补充必要商户参数`;
}
