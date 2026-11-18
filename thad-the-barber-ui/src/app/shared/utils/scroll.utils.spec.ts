import { scrollBackToElement, scrollToElementStart } from './scroll.utils';

describe('scrollBackToElement', (): void => {
  const headerClearance: number = 144;
  let element: HTMLElement;
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let isMotionReduced: boolean;

  function placeAt(top: number): void {
    element.getBoundingClientRect = (): DOMRect => ({ top }) as DOMRect;
  }

  beforeEach((): void => {
    isMotionReduced = false;
    element = document.createElement('div');
    scrollIntoView = vi.fn();
    element.scrollIntoView = scrollIntoView as unknown as typeof element.scrollIntoView;
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      scrollPaddingTop: `${headerClearance}px`,
    } as unknown as CSSStyleDeclaration);
    window.matchMedia = ((): MediaQueryList => ({ matches: isMotionReduced }) as MediaQueryList);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('scrolls back to an element that is above the screen', (): void => {
    placeAt(-600);

    scrollBackToElement(element);

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'smooth',
    });
  });

  it('scrolls back to an element hidden under the fixed header', (): void => {
    placeAt(headerClearance - 1);

    scrollBackToElement(element);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('leaves an element alone that is in view, or further down the page', (): void => {
    placeAt(headerClearance);
    scrollBackToElement(element);
    placeAt(2400);
    scrollBackToElement(element);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('jumps instead of gliding when the visitor asked for less motion', (): void => {
    isMotionReduced = true;
    placeAt(-600);

    scrollBackToElement(element);

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    });
  });
});

describe('scrollToElementStart', (): void => {
  const headerClearance: number = 144;
  let element: HTMLElement;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  function placeAt(top: number): void {
    element.getBoundingClientRect = (): DOMRect => ({ top }) as DOMRect;
  }

  beforeEach((): void => {
    element = document.createElement('div');
    scrollIntoView = vi.fn();
    element.scrollIntoView = scrollIntoView as unknown as typeof element.scrollIntoView;
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      scrollPaddingTop: `${headerClearance}px`,
    } as unknown as CSSStyleDeclaration);
    window.matchMedia = ((): MediaQueryList => ({ matches: false }) as MediaQueryList);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('brings an element to the top when it is further down, as a step left below the fold is', (): void => {
    placeAt(900);

    scrollToElementStart(element);

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'smooth',
    });
  });

  it('brings it down from under the header too', (): void => {
    placeAt(20);

    scrollToElementStart(element);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('leaves an element alone that is already at the top', (): void => {
    placeAt(headerClearance + 10);

    scrollToElementStart(element);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing in a browser that cannot scroll an element into view', (): void => {
    (element as { scrollIntoView?: unknown; }).scrollIntoView = undefined;
    placeAt(900);

    expect((): void => {
      scrollToElementStart(element);
    }).not.toThrow();
  });
});
