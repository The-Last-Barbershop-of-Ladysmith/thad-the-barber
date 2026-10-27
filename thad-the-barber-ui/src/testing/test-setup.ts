/**
 * Runs before every unit spec. jsdom has no `matchMedia`, so specs get one that never matches: pages lay out as on a
 * phone unless a spec replaces it.
 */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (): void => undefined,
    removeEventListener: (): void => undefined,
    dispatchEvent: (): boolean => false,
  }) as Partial<MediaQueryList> as MediaQueryList;
}
