import type {
  RawTransaction,
  RiskFactor,
  RiskSeverity,
  StreamFilterState,
  Transaction,
} from '@/types/domain';

const SHETAB_C2C_DAILY_CAP_IRT = 10_000_000;

export function classifySeverity(score: number): RiskSeverity {
  if (score >= 82) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function scoreTransaction(raw: RawTransaction): Transaction {
  let score = 6;
  const factors: RiskFactor[] = [];

  // 1. Structuring just below the 10M Toman Shetab C2C daily ceiling or high-value wire spike
  const isNearShetabCap =
    raw.channel === 'shetab_c2c' &&
    raw.amountIrt >= 8_800_000 &&
    raw.amountIrt <= SHETAB_C2C_DAILY_CAP_IRT;

  if (isNearShetabCap || raw.amountIrt >= 45_000_000) {
    const weight = raw.amountIrt >= 75_000_000 ? 30 : 22;
    score += weight;
    factors.push({
      code: 'SHETAB_STRUCTURING',
      weight,
      labelKey: 'structuringNearCap',
    });
  }

  // 2. Rented Mule Account (حساب اجاره‌ای): rapid pass-through burst
  if (raw.txCountLastHour >= 6 && raw.minutesSinceLastTx <= 20) {
    const weight = Math.min(30, raw.txCountLastHour * 3);
    score += weight;
    factors.push({
      code: 'MULE_VELOCITY',
      weight,
      labelKey: 'rentedAccountVelocity',
    });
  }

  // 3. Shahkar Identity / SIM-to-Card Mismatch (ناهمخوانی استعلام شاهکار)
  if (!raw.shahkarVerified) {
    const weight = 34;
    score += weight;
    factors.push({
      code: 'SHAHKAR_FAIL',
      weight,
      labelKey: 'shahkarMismatch',
    });
  }

  // 4. Foreign Datacenter / VPN IP on financial transfer
  if (raw.isForeignIp && (raw.isNewDevice || raw.amountIrt >= 5_000_000)) {
    const weight = 24;
    score += weight;
    factors.push({
      code: 'FOREIGN_VPN_IP',
      weight,
      labelKey: 'foreignDatacenterIp',
    });
  }

  // 5. High-Risk IPG / Crypto Fiat On-Ramp Burst
  if (
    (raw.channel === 'crypto_fiat_gateway' || raw.merchantCategory === 'High-Risk IPG') &&
    raw.amountIrt >= 12_000_000
  ) {
    const weight = 20;
    score += weight;
    factors.push({
      code: 'HIGH_RISK_RAIL',
      weight,
      labelKey: 'highRiskGatewayBurst',
    });
  }

  const clampedScore = Math.min(99, Math.max(1, score));
  const severity = classifySeverity(clampedScore);

  return {
    ...raw,
    riskScore: clampedScore,
    severity,
    factors,
    status: severity === 'critical' || severity === 'high' ? 'flagged' : 'cleared',
  };
}

export function matchesFilter(
  tx: Transaction,
  filter: StreamFilterState
): boolean {
  if (filter.severity !== 'all' && tx.severity !== filter.severity) {
    return false;
  }

  const trimmedQuery = filter.query.trim().toLowerCase();
  if (!trimmedQuery) {
    return true;
  }

  return (
    tx.id.toLowerCase().includes(trimmedQuery) ||
    tx.shaparakRrn.includes(trimmedQuery) ||
    tx.bankId.toLowerCase().includes(trimmedQuery) ||
    tx.channel.toLowerCase().includes(trimmedQuery) ||
    tx.merchantNameFa.toLowerCase().includes(trimmedQuery) ||
    tx.merchantNameEn.toLowerCase().includes(trimmedQuery) ||
    tx.accountHolderFa.toLowerCase().includes(trimmedQuery) ||
    tx.accountHolderEn.toLowerCase().includes(trimmedQuery) ||
    tx.ipAddress.includes(trimmedQuery)
  );
}