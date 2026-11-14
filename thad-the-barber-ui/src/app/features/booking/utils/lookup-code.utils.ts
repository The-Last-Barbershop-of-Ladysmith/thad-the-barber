export const LOOKUP_CODE_MAX_LENGTH: number = 10;

/** Only the digits of what was typed or pasted ("12 34-56" → "123456"), at most as many as a code can have. */
export function toLookupCode(typed: string): string {
  return typed.replace(/\D/g, '').slice(0, LOOKUP_CODE_MAX_LENGTH);
}
