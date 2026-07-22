/**
 * Enterprise Phone Number Normalizer
 * Normalizes phone numbers before comparison by stripping spaces, hyphens, country codes (+880, 880), leading +
 * Examples:
 * +8801712345678 -> 01712345678
 * 8801712345678  -> 01712345678
 * 01712345678    -> 01712345678
 * 1712345678     -> 01712345678
 */

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Remove Bangladesh country code prefixes
  if (digits.startsWith('880')) {
    digits = '0' + digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  return digits;
}

/**
 * Extracts raw digits for general matching
 */
export function extractDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}
