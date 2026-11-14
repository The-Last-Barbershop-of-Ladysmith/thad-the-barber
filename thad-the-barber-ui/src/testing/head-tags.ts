/** Reads and clears the document `<head>` tags the SEO specs check. */
export function readMetaContent(attribute: 'name' | 'property', key: string): string | null {
  return document.head.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? null;
}

export function readCanonicalHref(): string | null {
  return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
}

export function removeSeoTags(): void {
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.head.querySelector('meta[name="robots"]')?.remove();
}
