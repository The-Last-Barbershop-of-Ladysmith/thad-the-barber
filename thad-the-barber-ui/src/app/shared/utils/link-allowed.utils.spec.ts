import { isAllowedLink } from './link-allowed.utils';

describe('isAllowedLink', (): void => {
  it('accepts a site path, https, tel and mailto links, ignoring the spaces around them', (): void => {
    expect(isAllowedLink('/book')).toBe(true);
    expect(isAllowedLink(' https://example.test ')).toBe(true);
    expect(isAllowedLink('tel:+15550100')).toBe(true);
    expect(isAllowedLink('mailto:owner@example.test')).toBe(true);
  });

  it('refuses scripts, other sites written without a scheme, and nothing', (): void => {
    expect(isAllowedLink('javascript:alert(1)')).toBe(false);
    expect(isAllowedLink('//evil.test')).toBe(false);
    expect(isAllowedLink('')).toBe(false);
  });
});
