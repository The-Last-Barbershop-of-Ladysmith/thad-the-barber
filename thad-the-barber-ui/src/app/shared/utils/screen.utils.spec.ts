import { isPhoneScreen } from './screen.utils';

describe('isPhoneScreen', (): void => {
  function viewWith(matches: boolean): Window {
    return { matchMedia: (): MediaQueryList => ({ matches }) as MediaQueryList } as unknown as Window;
  }

  it('is true when the screen is narrower than a tablet', (): void => {
    expect(isPhoneScreen(viewWith(true))).toBe(true);
  });

  it('is false on a wider screen', (): void => {
    expect(isPhoneScreen(viewWith(false))).toBe(false);
  });

  it('is false with no window, or one that cannot measure the screen', (): void => {
    expect(isPhoneScreen(null)).toBe(false);
    expect(isPhoneScreen({} as unknown as Window)).toBe(false);
  });
});
