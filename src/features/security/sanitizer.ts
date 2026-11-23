/**
 * Defense-in-depth sanitizer for analyst narratives and digital signatures.
 * Strips HTML/script tags, inline event handlers, dangerous URI schemes,
 * and non-printable control characters.
 */
export function sanitizeNarrativeInput(raw: string): string {
  if (!raw) return '';

  return raw
    // Remove null bytes and ASCII control chars (preserve \n and \t)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Strip complete script/style/iframe/object/embed blocks
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip any remaining HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Neutralize inline event handler attributes (e.g., onclick=, onerror=)
    .replace(/\bon\w+\s*=/gi, '')
    // Neutralize dangerous URI schemes
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    .trim();
}