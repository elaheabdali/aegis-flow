export function formatCardDisplay(
  maskedCardNumber: string,
  rawCardNumber: string,
  isRevealed: boolean
): string {
  return isRevealed ? rawCardNumber : maskedCardNumber;
}

export function maskIpAddress(ipAddress: string, isRevealed: boolean): string {
  if (isRevealed) return ipAddress;
  const parts = ipAddress.split('.');
  if (parts.length !== 4) return '***.***.***.***';
  return `${parts[0] ?? '***'}.${parts[1] ?? '***'}.***.***`;
}