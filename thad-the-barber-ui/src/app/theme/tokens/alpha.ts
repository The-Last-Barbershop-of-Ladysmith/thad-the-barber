export function alpha(token: string, percent: number): string {
  return `color-mix(in srgb, ${token} ${percent}%, transparent)`;
}
