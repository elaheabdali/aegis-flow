import type { RawTransaction } from '@/types/domain';

type NonEmptyArray<T> = readonly [T, ...T[]];

function pickRandom<T>(items: NonEmptyArray<T>): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? items[0];
}

const MERCHANTS: NonEmptyArray<{ name: string; category: string }> = [
  { name: 'Kraken Digital Assets', category: 'Crypto Exchange' },
  { name: 'Nordic Cloud Infrastructure', category: 'SaaS / Cloud' },
  { name: 'Geneva Watch & Bullion', category: 'Luxury Goods' },
  { name: 'SwiftGlobal Remittance', category: 'Wire Transfer' },
  { name: 'Aether Airways', category: 'Travel & Airlines' },
  { name: 'Nexus Prepaid Vault', category: 'Digital Gift Cards' },
  { name: 'WholeFoods Market #104', category: 'Retail Grocery' },
  { name: 'Stripe Atlas Services', category: 'B2B Software' },
];

const HOLDERS: NonEmptyArray<string> = [
  'Elena Rostova',
  'Marcus Vance',
  'Darius Kian',
  'Sophia Lindqvist',
  'Tariq Al-Mansoor',
  'Claire Beaumont',
  'Kenji Takahashi',
  'Hannah Mercer',
];

const COUNTRIES: NonEmptyArray<string> = [
  'US',
  'DE',
  'GB',
  'SG',
  'AE',
  'CH',
  'NL',
  'JP',
];

let sequenceCounter = 104820;

export function generateSimulatedBatch(batchSize: number): RawTransaction[] {
  const batch: RawTransaction[] = [];

  for (let i = 0; i < batchSize; i++) {
    sequenceCounter += 1;
    const merchant = pickRandom(MERCHANTS);
    const holder = pickRandom(HOLDERS);
    const originCountry = pickRandom(COUNTRIES);
    const isAnomalousRoll = Math.random();

    const previousCountry =
      isAnomalousRoll > 0.72 ? pickRandom(COUNTRIES) : originCountry;

    const amount =
      isAnomalousRoll > 0.85
        ? Math.floor(9000 + Math.random() * 24000)
        : isAnomalousRoll > 0.6
          ? Math.floor(1800 + Math.random() * 6500)
          : Math.floor(25 + Math.random() * 950);

    const last4 = String(1000 + ((sequenceCounter * 37) % 9000));
    const bin = isAnomalousRoll > 0.5 ? '4532' : '5412';

    batch.push({
      id: `TX-${sequenceCounter.toString(16).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      amount,
      currency: 'USD',
      merchantName: merchant.name,
      merchantCategory: merchant.category,
      accountHolder: holder,
      maskedCardNumber: `${bin} •••• •••• ${last4}`,
      rawCardNumber: `${bin} 8492 3104 ${last4}`,
      originCountry,
      previousCountry,
      minutesSinceLastTx:
        isAnomalousRoll > 0.75
          ? Math.floor(3 + Math.random() * 25)
          : Math.floor(60 + Math.random() * 600),
      txCountLastHour:
        isAnomalousRoll > 0.8 ? Math.floor(6 + Math.random() * 8) : Math.floor(1 + Math.random() * 3),
      isNewDevice: isAnomalousRoll > 0.78,
      ipAddress: `${Math.floor(18 + Math.random() * 210)}.${Math.floor(
        10 + Math.random() * 240
      )}.${Math.floor(1 + Math.random() * 250)}.${Math.floor(2 + Math.random() * 250)}`,
      deviceFingerprint: `fp_${(sequenceCounter * 9973).toString(36).slice(0, 8)}`,
    });
  }

  return batch;
}