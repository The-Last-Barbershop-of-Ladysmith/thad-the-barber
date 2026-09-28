/**
 * Unicode-safe base64. `btoa`/`atob` only handle Latin-1, so text is percent-encoded to UTF-8 bytes
 * first; otherwise characters like "’" or "—" would throw.
 */

/** "didn’t" → base64 */
export function encodeBase64(text: string): string {
  return btoa(encodeURIComponent(text).replace(
    /%([0-9A-F]{2})/g,
    (
      _match: string,
      hex: string,
    ): string => String.fromCharCode(parseInt(
      hex,
      16,
    )),
  ));
}

/** base64 → "didn’t" */
export function decodeBase64(encoded: string): string {
  return decodeURIComponent(Array.from(
    atob(encoded),
    (char: string): string => `%${char.charCodeAt(0).toString(16).padStart(
      2,
      '0',
    )}`,
  ).join(''));
}
