/**
 * Strips HTML tags, script payloads, and dangerous URI schemes
 * to prevent stored/reflected XSS in analyst narratives.
 */
export function sanitizeNarrativeInput(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}