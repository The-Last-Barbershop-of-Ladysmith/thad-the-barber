export const LOOKUP_CODE_MAX_LENGTH: number = 10;

export function toLookupCode(typed: string): string {
  return typed.replace(/\D/g, '').slice(0, LOOKUP_CODE_MAX_LENGTH);
}
