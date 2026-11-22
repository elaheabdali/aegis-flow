import { describe, expect, it } from 'vitest';
import {
  classifySeverity,
  matchesFilter,
  scoreTransaction,
} from '@/features/fraud-engine/risk-scorer';
import { isValidIranianNationalId } from '@/features/security/pii-masker';
import { sanitizeNarrativeInput } from '@/features/security/sanitizer';
import type { RawTransaction } from '@/types/domain';

const baseRawTx: RawTransaction = {
  id: 'SHP-TEST01',
  shaparakRrn: '940000123456',
  timestamp: '2026-11-22T08:00:00.000Z',
  amountIrt: 1_250_000,
  channel: 'shaparak_ipg',
  bankId: 'mellat',
  merchantNameFa: 'فروشگاه اینترنتی تکنولایف',
  merchantNameEn: 'Technolife E-Commerce',
  merchantCategory: 'Retail Electronics',
  accountHolderFa: 'امیرحسین کاظمی',
  accountHolderEn: 'Amirhossein Kazemi',
  maskedCardNumber: '6104-33••-••••-8910',
  rawCardNumber: '6104-3378-4512-8910',
  maskedIban: 'IR82 0120 •••• •••• •••• 4592',
  rawIban: 'IR82 0120 0000 0012 3456 4592',
  maskedNationalId: '001••••818',
  rawNationalId: '0013542818',
  originCity: 'THR',
  isForeignIp: false,
  shahkarVerified: true,
  minutesSinceLastTx: 180,
  txCountLastHour: 1,
  isNewDevice: false,
  ipAddress: '5.120.44.90',
  deviceFingerprint: 'ir_fp_clean01',
};

describe('Iranian Banking Fraud Risk Engine & Security', () => {
  it('classifies low-risk routine Shaparak transactions accurately', () => {
    const scored = scoreTransaction(baseRawTx);
    expect(scored.riskScore).toBe(6);
    expect(scored.severity).toBe('low');
    expect(scored.status).toBe('cleared');
    expect(scored.factors).toHaveLength(0);
  });

  it('flags critical risk for rented mule accounts, Shahkar mismatch, and VPN transfers', () => {
    const anomalousTx: RawTransaction = {
      ...baseRawTx,
      id: 'SHP-CRIT99',
      amountIrt: 80_000_000,
      channel: 'crypto_fiat_gateway',
      bankId: 'blu',
      merchantNameFa: 'صرافی نوبیتکس (درگاه ریالی)',
      merchantNameEn: 'Nobitex Fiat Gateway',
      originCity: 'VPN_EU',
      isForeignIp: true,
      shahkarVerified: false,
      minutesSinceLastTx: 8,
      txCountLastHour: 8,
      isNewDevice: true,
    };

    const scored = scoreTransaction(anomalousTx);
    expect(scored.riskScore).toBe(99);
    expect(scored.severity).toBe('critical');
    expect(scored.status).toBe('flagged');
    expect(scored.factors.map((f) => f.code)).toEqual([
      'SHETAB_STRUCTURING',
      'MULE_VELOCITY',
      'SHAHKAR_FAIL',
      'FOREIGN_VPN_IP',
      'HIGH_RISK_RAIL',
    ]);
  });

  it('detects Shetab C2C daily ceiling structuring near 10M Toman', () => {
    const structuringTx: RawTransaction = {
      ...baseRawTx,
      channel: 'shetab_c2c',
      amountIrt: 9_850_000,
    };

    const scored = scoreTransaction(structuringTx);
    expect(scored.factors.some((f) => f.code === 'SHETAB_STRUCTURING')).toBe(true);
    expect(scored.riskScore).toBe(28);
  });

  it('enforces severity threshold boundaries', () => {
    expect(classifySeverity(82)).toBe('critical');
    expect(classifySeverity(60)).toBe('high');
    expect(classifySeverity(35)).toBe('medium');
    expect(classifySeverity(34)).toBe('low');
  });

  it('filters transactions by Persian/English merchant, bank ID, RRN, and severity', () => {
    const scored = scoreTransaction({
      ...baseRawTx,
      shaparakRrn: '940000998877',
      bankId: 'saman',
      merchantNameFa: 'صرافی والکس',
      merchantNameEn: 'Wallex Exchange',
      amountIrt: 80_000_000,
      channel: 'crypto_fiat_gateway',
      shahkarVerified: false,
      txCountLastHour: 8,
      minutesSinceLastTx: 5,
    });

    expect(matchesFilter(scored, { query: 'والکس', severity: 'critical' })).toBe(true);
    expect(matchesFilter(scored, { query: 'saman', severity: 'critical' })).toBe(true);
    expect(matchesFilter(scored, { query: '940000998877', severity: 'all' })).toBe(true);
    expect(matchesFilter(scored, { query: 'والکس', severity: 'low' })).toBe(false);
  });

  it('validates Iranian 10-digit National ID modulo-11 checksum accurately', () => {
    expect(isValidIranianNationalId('0013542818')).toBe(true);
    expect(isValidIranianNationalId('0013542819')).toBe(false);
    expect(isValidIranianNationalId('1111111111')).toBe(false);
    expect(isValidIranianNationalId('12345')).toBe(false);
  });

  it('strips malicious HTML and javascript: payloads from analyst narratives', () => {
    const dirty =
      '<script>alert("xss")</script>گزارش حساب اجاره‌ای onclick=steal() javascript:void(0)';
    const clean = sanitizeNarrativeInput(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('onclick=');
    expect(clean).toContain('گزارش حساب اجاره‌ای');
  });
});