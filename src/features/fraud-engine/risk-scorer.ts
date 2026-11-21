import type {
  RawTransaction,
  RiskFactor,
  RiskSeverity,
  StreamFilterState,
  Transaction,
} from '@/types/domain';

const HIGH_RISK_CATEGORIES = new Set([
  'Crypto Exchange',
  'Wire Transfer',
  'Luxury Goods',
  'Digital Gift Cards',
]);

export function classifySeverity(score: number): RiskSeverity {
  if (score >= 82) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function scoreTransaction(raw: RawTransaction): Transaction {
  let score = 8;
  const factors: RiskFactor[] = [];

  if (raw.amount >= 8500) {
    const weight = raw.amount >= 18000 ? 34 : 22;
    score += weight;
    factors.push({
      code: 'AMT_SPIKE',
      weight,
      labelKey: 'highAmountAnomaly',
    });
  }

  if (raw.originCountry !== raw.previousCountry && raw.minutesSinceLastTx < 45) {
    const weight = 32;
    score += weight;
    factors.push({
      code: 'GEO_VELOCITY',
      weight,
      labelKey: 'impossibleTravel',
    });
  }

  if (raw.txCountLastHour >= 6) {
    const weight = Math.min(26, raw.txCountLastHour * 3);
    score += weight;
    factors.push({
      code: 'BURST_RATE',
      weight,
      labelKey: 'velocityBurst',
    });
  }

  if (HIGH_RISK_CATEGORIES.has(raw.merchantCategory)) {
    const weight = 16;
    score += weight;
    factors.push({
      code: 'MCC_RISK',
      weight,
      labelKey: 'highRiskMerchant',
    });
  }

  if (raw.isNewDevice && raw.amount >= 2500) {
    const weight = 18;
    score += weight;
    factors.push({
      code: 'NEW_DEVICE',
      weight,
      labelKey: 'newDeviceFingerprint',
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
    tx.merchantName.toLowerCase().includes(trimmedQuery) ||
    tx.accountHolder.toLowerCase().includes(trimmedQuery) ||
    tx.originCountry.toLowerCase().includes(trimmedQuery) ||
    tx.ipAddress.includes(trimmedQuery)
  );
}