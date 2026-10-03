import { brandCss } from './brand-css';
import { primitive } from './tokens/primitive';

interface PrimitiveTokens {
  ink: string;
  borderRadius: Record<string, string>;
  copper: Record<string, string>;
  espresso: Record<string, string>;
}

const tokens: PrimitiveTokens = primitive as PrimitiveTokens;

describe(
  'brandCss',
  (): void => {
    let css: string;

    beforeAll((): void => {
      css = brandCss();
    });

    it.each(['copper', 'espresso'] as const)(
      'has a variable for every %s shade',
      (palette: 'copper' | 'espresso'): void => {
        Object.entries(tokens[palette]).forEach(([shade, value]: [string, string]): void => {
          expect(css).toContain(`--p-${palette}-${shade}:${value};`);
        });
      },
    );

    it(
      'has the ink, font and radius primitives',
      (): void => {
        expect(css).toContain(`--p-ink:${tokens.ink};`);
        expect(css).toContain('--p-font-family-sans:Helvetica, Arial, sans-serif;');
        Object.entries(tokens.borderRadius).forEach(([size, value]: [string, string]): void => {
          expect(css).toContain(`--p-border-radius-${size}:${value};`);
        });
      },
    );

    it(
      'has the semantic and brand tokens, referencing the primitives',
      (): void => {
        expect(css).toContain('--p-focus-ring-color:var(--p-primary-color);');
        expect(css).toContain('--p-primary-color:var(--p-copper-500);');
        expect(css).toContain('--p-text-color:var(--p-espresso-50);');
        expect(css).toContain('--p-brand-glass-background:color-mix(in srgb, var(--p-ink) 76%, transparent);');
      },
    );

    it(
      'is a plain stylesheet on :root, outside any cascade layer',
      (): void => {
        expect(css).toMatch(/^:root/);
        expect(css).not.toContain('@layer');
      },
    );
  },
);
