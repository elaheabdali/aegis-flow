import { describe, expect, it } from 'vitest';
import {
  classifySeverity,
  matchesFilter,
  scoreTransaction,
} from '@/features/fraud-engine/risk-scorer';
import { sanitizeNarrativeInput } from '@/features/security/sanitizer';
import type { RawTransaction } from '@/types/domain';

const baseRawTx: RawTransaction = {
  id: 'TX-TEST01',
  timestamp: '2026-11-21T12:00:00.000Z',
  amount: 120,
  currency: 'USD',
  merchantName: 'WholeFoods Market #104',
  merchantCategory: 'Retail Grocery',
  accountHolder: 'Elena Rostova',
  maskedCardNumber: '4532 •••• •••• 8910',
  rawCardNumber: '4532 8492 3104 8910',
  originCountry: 'US',
  previousCountry: 'US',
  minutesSinceLastTx: 180,
  txCountLastHour: 1,
  isNewDevice: false,
  ipAddress: '45.33.12.90',
  deviceFingerprint: 'fp_clean01',
};

describe('Fraud Risk Scoring Engine', () => {
  it('classifies low-risk routine retail transactions accurately', () => {
    const scored = scoreTransaction(baseRawTx);
    expect(scored.riskScore).toBe(8);
    expect(scored.severity).toBe('low');
    expect(scored.status).toBe('cleared');
    expect(scored.factors).toHaveLength(0);
  });

  it('flags critical risk when impossible travel, high amount, and velocity burst combine', () => {
    const anomalousTx: RawTransaction = {
      ...baseRawTx,
      id: 'TX-CRIT99',
      amount: 21500,
      merchantCategory: 'Crypto Exchange',
      originCountry: 'SG',
      previousCountry: 'DE',
      minutesSinceLastTx: 12,
      txCountLastHour: 8,
      isNewDevice: true,
    };

    const scored = scoreTransaction(anomalousTx);
    expect(scored.riskScore).toBe(99);
    expect(scored.severity).toBe('critical');
    expect(scored.status).toBe('flagged');
    expect(scored.factors.map((f) => f.code)).toEqual([
      'AMT_SPIKE',
      'GEO_VELOCITY',
      'BURST_RATE',
      'MCC_RISK',
      'NEW_DEVICE',
    ]);
  });

  it('enforces severity threshold boundaries', () => {
    expect(classifySeverity(82)).toBe('critical');
    expect(classifySeverity(60)).toBe('high');
    expect(classifySeverity(35)).toBe('medium');
    expect(classifySeverity(34)).toBe('low');
  });

  it('filters transactions case-insensitively by query and severity', () => {
    const scored = scoreTransaction({
      ...baseRawTx,
      merchantName: 'Kraken Digital Assets',
      amount: 20000,
      merchantCategory: 'Crypto Exchange',
      originCountry: 'CH',
      previousCountry: 'US',
      minutesSinceLastTx: 10,
      txCountLastHour: 7,
    });

    expect(matchesFilter(scored, { query: 'kraken', severity: 'critical' })).toBe(true);
    expect(matchesFilter(scored, { query: 'kraken', severity: 'low' })).toBe(false);
    expect(matchesFilter(scored, { query: 'nonexistent', severity: 'all' })).toBe(false);
  });

  it('strips malicious HTML and javascript: payloads from analyst narratives', () => {
    const dirty =
      '<script>alert("xss")</script>Suspicious transfer onclick=steal() javascript:void(0)';
    const clean = sanitizeNarrativeInput(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('onclick=');
    expect(clean).toContain('Suspicious transfer');
  });
});