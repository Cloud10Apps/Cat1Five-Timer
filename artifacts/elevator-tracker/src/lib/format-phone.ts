/**
 * Display-format a phone string as (XXX) XXX-XXXX for US-shaped numbers.
 *
 * Rules:
 *   - Strip all non-digit characters.
 *   - 10 digits      -> (XXX) XXX-XXXX
 *   - 11 digits starting with "1" -> (XXX) XXX-XXXX (the leading 1 is dropped)
 *   - Anything else  -> return the original string unchanged (don't corrupt
 *     non-US numbers or partial entries)
 *   - null / undefined / empty -> ""
 *
 * Idempotent: passing an already-formatted string returns the same formatted
 * string.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
