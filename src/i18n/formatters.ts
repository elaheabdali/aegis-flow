import type { Locale } from './config';

export function formatCurrency(amount: number, locale: Locale): string {
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale, decimals = 0): string {
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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