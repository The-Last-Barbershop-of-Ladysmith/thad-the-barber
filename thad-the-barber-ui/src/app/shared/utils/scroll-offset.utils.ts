const AIR_BELOW_HEADER_PX: number = 16;

/** How far down the fixed header reaches, with the announcement strip above it while it shows, plus a little air. */
export function toHeaderScrollOffset(document: Document): [number, number] {
  const header: Element | null = document.querySelector('[data-site-top]');
  const headerBottom: number = header?.getBoundingClientRect().bottom ?? 0;
  return [0, headerBottom + AIR_BELOW_HEADER_PX];
}
