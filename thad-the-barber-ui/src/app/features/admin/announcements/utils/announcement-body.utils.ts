import { linkKind } from '../../../../shared/utils/link.utils';

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'a',
]);

const LINK_TARGET: string = String.raw`(?:https:\/\/[^\s)]+|\/[^\s)]*|tel:[^\s)]+|mailto:[^\s)]+)`;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

/** One node as the form edits it: the markup the form can make becomes its typed form, the rest its words. */
function nodeToText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element)) {
    return '';
  }
  const inner: string = Array.from(node.childNodes).map(nodeToText).join('');
  switch (node.tagName.toLowerCase()) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'a': {
      const href: string = node.getAttribute('href') ?? '';
      return linkKind(href) === null ? inner : `[${inner}](${href})`;
    }
    default:
      return inner;
  }
}

/**
 * The stored `bodyHtml` → the text the form edits, the reverse of `textToBodyHtml` for the markup it can make. The HTML
 * is read into an inert document (nothing in it runs or loads) and walked, so no markup is ever pattern-stripped.
 */
export function bodyHtmlToText(html: string): string {
  const body: HTMLElement = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks: string[] = [];
  let inline: string = '';
  const endInline: () => void = (): void => {
    if (inline.trim() !== '') {
      blocks.push(inline.trim());
    }
    inline = '';
  };
  body.childNodes.forEach((node: ChildNode): void => {
    if (node instanceof Element && node.tagName.toLowerCase() === 'p') {
      endInline();
      blocks.push(nodeToText(node).trim());
    } else {
      inline += nodeToText(node);
    }
  });
  endInline();
  return blocks.filter((block: string): boolean => block !== '').join('\n\n');
}

/** Whether the stored HTML has markup the form can't keep (a list, a heading…), which saving would flatten to text. */
export function hasUnsupportedMarkup(html: string): boolean {
  const tags: IterableIterator<RegExpMatchArray> = html.matchAll(/<\/?([a-z][a-z0-9]*)/gi);
  return [...tags].some((match: RegExpMatchArray): boolean => !ALLOWED_TAGS.has((match[1] ?? '').toLowerCase()));
}
