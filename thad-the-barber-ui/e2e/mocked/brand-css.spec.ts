import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';

function computedValues(names: string[]): string[] {
  const style: CSSStyleDeclaration = getComputedStyle(document.documentElement);
  // Minified CSS and the generated file space lists differently, e.g. "a,b" vs "a, b".
  return names.map((name: string): string => style.getPropertyValue(name).replace(/\s/g, ''));
}

test(
  'brand.css matches the CSS variables PrimeNG sets on the page',
  async ({ page }: { page: Page; }): Promise<void> => {
    test.skip(!process.env['CI'], 'Only the Express build (build:express:*) writes brand.css.');

    const css: string = await (await page.request.get('/brand.css')).text();
    const names: string[] = Array.from(css.matchAll(/(--p-[\w-]+):/g), (match: RegExpMatchArray): string => match[1] ?? '');
    expect(names.length).toBeGreaterThan(100);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const fromTheme: string[] = await page.evaluate(computedValues, names);

    // A blank page, without the site's CSP, which would block the inline stylesheet.
    const blank: Page = await page.context().newPage();
    await blank.setContent(`<html class="app-dark"><head><style>${css}</style></head><body></body></html>`);
    const fromBrandCss: string[] = await blank.evaluate(computedValues, names);

    expect(fromBrandCss).toEqual(fromTheme);
  },
);
