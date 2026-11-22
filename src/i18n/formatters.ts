import type { CurrencyUnit } from '@/types/domain';
import type { Locale } from './config';

export function convertFromToman(amountIrt: number, currency: CurrencyUnit): number {
  return currency === 'IRR' ? amountIrt * 10 : amountIrt;
}

export function formatNumber(value: number, locale: Locale, decimals = 0): string {
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatIranianCurrency(
  amountIrt: number,
  currency: CurrencyUnit,
  locale: Locale
): string {
  const converted = convertFromToman(amountIrt, currency);
  const formattedDigits = formatNumber(converted, locale, 0);

  if (locale === 'fa') {
    const unitLabel = currency === 'IRR' ? 'ریال' : 'تومان';
    return `${formattedDigits} ${unitLabel}`;
  }

  return `${formattedDigits} ${currency}`;
}

export function formatCompactIranianCurrency(
  amountIrt: number,
  currency: CurrencyUnit,
  locale: Locale
): string {
  const converted = convertFromToman(amountIrt, currency);

  if (locale === 'fa') {
    const unitLabel = currency === 'IRR' ? 'ریال' : 'تومان';
    if (converted >= 1_000_000_000) {
      return `${formatNumber(converted / 1_000_000_000, 'fa', 2)} میلیارد ${unitLabel}`;
    }
    if (converted >= 1_000_000) {
      return `${formatNumber(converted / 1_000_000, 'fa', 1)} میلیون ${unitLabel}`;
    }
    return `${formatNumber(converted, 'fa', 0)} ${unitLabel}`;
  }

  if (converted >= 1_000_000_000) {
    return `${formatNumber(converted / 1_000_000_000, 'en', 2)}B ${currency}`;
  }
  if (converted >= 1_000_000) {
    return `${formatNumber(converted / 1_000_000, 'en', 1)}M ${currency}`;
  }
  return `${formatNumber(converted, 'en', 0)} ${currency}`;
}

export function formatTime(isoTimestamp: string, locale: Locale): string {
  const date = new Date(isoTimestamp);
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatJalaliDateTime(isoTimestamp: string, locale: Locale): string {
  const date = new Date(isoTimestamp);
  if (locale === 'fa') {
    const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    const timePart = formatTime(isoTimestamp, 'fa');
    return `${jalaliDate} • ${timePart}`;
  }

  const gregorianDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return `${gregorianDate} • ${formatTime(isoTimestamp, 'en')}`;
}