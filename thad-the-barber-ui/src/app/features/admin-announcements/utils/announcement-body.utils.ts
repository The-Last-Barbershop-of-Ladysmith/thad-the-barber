const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'a',
]);

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
};

const LINK_TARGET: string = String.raw`(?:https:\/\/[^\s)]+|\/[^\s)]*|tel:[^\s)]+|mailto:[^\s)]+)`;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function unescapeHtml(text: string): string {
  return text.replaceAll(/&(?:amp|lt|gt|quot|#39);/g, (entity: string): string => ENTITIES[entity] ?? entity);
}

/**
 * The message as typed → the `bodyHtml` the site shows. A blank line starts a paragraph and a line break stays one;
 * `**bold**`, `*italic*` and `[label](link)` (a site path, https, tel: or mailto: link) are the only formatting, so
 * nothing typed can add other markup. The API cleans the HTML again before it stores it.
 */
export function textToBodyHtml(text: string): string {
  const paragraphs: string[] = text
    .replaceAll('\r\n', '\n')
    .trim()
    .split(/\n{2,}/)
    .filter((paragraph: string): boolean => paragraph.trim() !== '');
  return paragraphs
    .map((paragraph: string): string => {
      const html: string = escapeHtml(paragraph.trim())
        .replaceAll(
          new RegExp(String.raw`\[([^\]]+)\]\((${LINK_TARGET})\)`, 'g'),
          '<a href="$2">$1</a>',
        )
        .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replaceAll(/\*(.+?)\*/g, '<em>$1</em>')
        .replaceAll('\n', '<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}

/** The stored `bodyHtml` → the text the form edits, the reverse of `textToBodyHtml` for the markup it can make. */
export function bodyHtmlToText(html: string): string {
  const text: string = html
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replaceAll(/<\/?p[^>]*>/gi, '')
    .replaceAll(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gis, '**$1**')
    .replaceAll(/<(?:em|i)>(.*?)<\/(?:em|i)>/gis, '*$1*')
    .replaceAll(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)')
    .replaceAll(/<[^>]+>/g, '');
  return unescapeHtml(text).trim();
}

/** Whether the stored HTML has markup the form can't keep (a list, a heading…), which saving would flatten to text. */
export function hasUnsupportedMarkup(html: string): boolean {
  const tags: IterableIterator<RegExpMatchArray> = html.matchAll(/<\/?([a-z][a-z0-9]*)/gi);
  return [...tags].some((match: RegExpMatchArray): boolean => !ALLOWED_TAGS.has((match[1] ?? '').toLowerCase()));
}
