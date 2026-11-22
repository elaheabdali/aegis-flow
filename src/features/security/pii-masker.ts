/**
 * Validates a 10-digit Iranian National ID using the official modulo-11 checksum algorithm.
 */
export function isValidIranianNationalId(code: string): boolean {
  const normalized = code.trim();
  if (!/^\d{10}$/.test(normalized)) return false;
  if (/^(\d)\1{9}$/.test(normalized)) return false;

  const digits = normalized.split('').map(Number);
  const checkDigit = digits[9];
  if (checkDigit === undefined) return false;

  let weightedSum = 0;
  for (let i = 0; i < 9; i++) {
    const d = digits[i] ?? 0;
    weightedSum += d * (10 - i);
  }

  const remainder = weightedSum % 11;
  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
}

export function formatCardDisplay(
  maskedCardNumber: string,
  rawCardNumber: string,
  isRevealed: boolean
): string {
  return isRevealed ? rawCardNumber : maskedCardNumber;
}

export function formatIbanDisplay(
  maskedIban: string,
  rawIban: string,
  isRevealed: boolean
): string {
  return isRevealed ? rawIban : maskedIban;
}

export function formatNationalIdDisplay(
  maskedNationalId: string,
  rawNationalId: string,
  isRevealed: boolean
): string {
  return isRevealed ? rawNationalId : maskedNationalId;
}

export function maskIpAddress(ipAddress: string, isRevealed: boolean): string {
  if (isRevealed) return ipAddress;
  const parts = ipAddress.split('.');
  if (parts.length !== 4) return '***.***.***.***';
  return `${parts[0] ?? '***'}.${parts[1] ?? '***'}.***.***`;
}