import type {
  PaymentChannel,
  RawTransaction,
  ShetabBankId,
} from '@/types/domain';

type NonEmptyArray<T> = readonly [T, ...T[]];

function pickRandom<T>(items: NonEmptyArray<T>): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? items[0];
}

const SHETAB_BANKS: NonEmptyArray<{
  id: ShetabBankId;
  bin: string;
  ibanBankCode: string;
}> = [
  { id: 'mellat', bin: '610433', ibanBankCode: '0120' },
  { id: 'melli', bin: '603799', ibanBankCode: '0170' },
  { id: 'saman', bin: '621986', ibanBankCode: '0560' },
  { id: 'pasargad', bin: '502229', ibanBankCode: '0570' },
  { id: 'saderat', bin: '603769', ibanBankCode: '0190' },
  { id: 'parsian', bin: '622106', ibanBankCode: '0540' },
  { id: 'ayandeh', bin: '636214', ibanBankCode: '0620' },
  { id: 'blu', bin: '621986', ibanBankCode: '0560' },
];

const IRANIAN_MERCHANTS: NonEmptyArray<{
  nameFa: string;
  nameEn: string;
  category: string;
  channel: PaymentChannel;
}> = [
  {
    nameFa: 'صرافی نوبیتکس (درگاه ریالی)',
    nameEn: 'Nobitex Fiat Gateway',
    category: 'Crypto Exchange',
    channel: 'crypto_fiat_gateway',
  },
  {
    nameFa: 'دیجی‌پی (تسویه اعتبار BNPL)',
    nameEn: 'DigiPay BNPL Settlement',
    category: 'BNPL Credit',
    channel: 'bnpl_wallet',
  },
  {
    nameFa: 'زرین‌پال (پذیرنده #۴۸۱۲)',
    nameEn: 'ZarinPal Merchant #4812',
    category: 'High-Risk IPG',
    channel: 'shaparak_ipg',
  },
  {
    nameFa: 'اسنپ‌پی (کیف پول و اقساط)',
    nameEn: 'SnappPay Wallet',
    category: 'BNPL Credit',
    channel: 'bnpl_wallet',
  },
  {
    nameFa: 'انتقال شتابی کارت‌به‌کارت',
    nameEn: 'Shetab Card-to-Card',
    category: 'P2P Transfer',
    channel: 'shetab_c2c',
  },
  {
    nameFa: 'حواله پایا / ساتنا بین‌بانکی',
    nameEn: 'Paya / Satna Interbank',
    category: 'Interbank Wire',
    channel: 'paya_satna',
  },
  {
    nameFa: 'صرافی والکس (واریز شتابی)',
    nameEn: 'Wallex Exchange Deposit',
    category: 'Crypto Exchange',
    channel: 'crypto_fiat_gateway',
  },
  {
    nameFa: 'فروشگاه اینترنتی تکنولایف',
    nameEn: 'Technolife E-Commerce',
    category: 'Retail Electronics',
    channel: 'shaparak_ipg',
  },
];

const ACCOUNT_HOLDERS: NonEmptyArray<{
  fa: string;
  en: string;
  validNationalId: string;
}> = [
  { fa: 'امیرحسین کاظمی', en: 'Amirhossein Kazemi', validNationalId: '0013542819' },
  { fa: 'سارا محمدی‌پور', en: 'Sara Mohammadipour', validNationalId: '0084129635' },
  { fa: 'نیما فرهادی', en: 'Nima Farhadi', validNationalId: '0451983421' },
  { fa: 'مهسا شریفی', en: 'Mahsa Sharifi', validNationalId: '1289451203' },
  { fa: 'کیانوش رضایی', en: 'Kianoosh Rezaei', validNationalId: '2291048572' },
  { fa: 'نگار تهرانی', en: 'Negar Tehrani', validNationalId: '0067391824' },
  { fa: 'پویا مرادی', en: 'Pouya Moradi', validNationalId: '3258910437' },
  { fa: 'الهام سلیمانی', en: 'Elham Soleimani', validNationalId: '4130982716' },
];

const CITIES: NonEmptyArray<string> = ['THR', 'MHD', 'ISF', 'SHZ', 'TBZ', 'KRJ'];

let sequenceCounter = 208410;

export function generateSimulatedBatch(batchSize: number): RawTransaction[] {
  const batch: RawTransaction[] = [];

  for (let i = 0; i < batchSize; i++) {
    sequenceCounter += 1;
    const bank = pickRandom(SHETAB_BANKS);
    const merchant = pickRandom(IRANIAN_MERCHANTS);
    const holder = pickRandom(ACCOUNT_HOLDERS);
    const riskRoll = Math.random();

    // Realistic Iranian Toman amounts (e.g. structuring at 9.8M Toman or high-value wire 65M Toman)
    const amountIrt =
      riskRoll > 0.86
        ? Math.floor(48_000_000 + Math.random() * 65_000_000)
        : riskRoll > 0.72 && merchant.channel === 'shetab_c2c'
          ? Math.floor(9_200_000 + Math.random() * 750_000)
          : riskRoll > 0.55
            ? Math.floor(14_000_000 + Math.random() * 25_000_000)
            : Math.floor(250_000 + Math.random() * 4_500_000);

    const mid2 = String(10 + (sequenceCounter % 89));
    const last4 = String(1000 + ((sequenceCounter * 41) % 9000));
    const rawCardNumber = `${bank.bin.slice(0, 4)}-${bank.bin.slice(4, 6)}${mid2}-${String(
      1000 + ((sequenceCounter * 19) % 9000)
    )}-${last4}`;
    const maskedCardNumber = `${bank.bin.slice(0, 4)}-${bank.bin.slice(4, 6)}••-••••-${last4}`;

    const accountSerial = String(10000000 + ((sequenceCounter * 73) % 89999999));
    const rawIban = `IR82 ${bank.ibanBankCode} 0000 00${accountSerial.slice(0, 2)} ${accountSerial.slice(
      2,
      6
    )} ${accountSerial.slice(6, 8)}92`;
    const maskedIban = `IR82 ${bank.ibanBankCode} •••• •••• •••• ${accountSerial.slice(6, 8)}92`;

    const maskedNationalId = `${holder.validNationalId.slice(0, 3)}••••${holder.validNationalId.slice(7)}`;

    const isForeignIp = riskRoll > 0.82;
    const ipAddress = isForeignIp
      ? `185.${Math.floor(100 + Math.random() * 140)}.${Math.floor(10 + Math.random() * 200)}.${Math.floor(
          2 + Math.random() * 240
        )}`
      : `5.${Math.floor(112 + Math.random() * 120)}.${Math.floor(10 + Math.random() * 240)}.${Math.floor(
          2 + Math.random() * 250
        )}`;

    batch.push({
      id: `SHP-${sequenceCounter.toString(16).toUpperCase()}`,
      shaparakRrn: `${940000000000 + sequenceCounter * 13}`,
      timestamp: new Date().toISOString(),
      amountIrt,
      channel: merchant.channel,
      bankId: bank.id,
      merchantNameFa: merchant.nameFa,
      merchantNameEn: merchant.nameEn,
      merchantCategory: merchant.category,
      accountHolderFa: holder.fa,
      accountHolderEn: holder.en,
      maskedCardNumber,
      rawCardNumber,
      maskedIban,
      rawIban,
      maskedNationalId,
      rawNationalId: holder.validNationalId,
      originCity: isForeignIp ? 'VPN_EU' : pickRandom(CITIES),
      isForeignIp,
      shahkarVerified: riskRoll <= 0.84,
      minutesSinceLastTx:
        riskRoll > 0.78
          ? Math.floor(2 + Math.random() * 14)
          : Math.floor(45 + Math.random() * 480),
      txCountLastHour:
        riskRoll > 0.8
          ? Math.floor(6 + Math.random() * 7)
          : Math.floor(1 + Math.random() * 3),
      isNewDevice: riskRoll > 0.76,
      ipAddress,
      deviceFingerprint: `ir_fp_${(sequenceCounter * 9973).toString(36).slice(0, 8)}`,
    });
  }

  return batch;
}