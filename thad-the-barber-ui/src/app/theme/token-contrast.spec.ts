import { Rgba, compositeOver, contrastRatio, resolveColor } from '../../testing/contrast';
import { message } from './tokens/components/message';
import { toast } from './tokens/components/toast';

const TEXT_MINIMUM: number = 4.5;
const UI_MINIMUM: number = 3;

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
}

function over(color: string, base: string): Rgba {
  return compositeOver(resolveColor(color), resolveColor(base));
}

function ratio(pair: ColorPair, base: string): number {
  return contrastRatio(over(pair.foreground, base), over(pair.background, base));
}

const PAGE_BACKGROUNDS: string[] = [
  '{ink}',
  '{espresso.950}',
  '{espresso.900}',
  '{espresso.800}',
  '{brand.controlBackground}',
  '{brand.strip.background}',
];

const TEXT_ON_PAGE: Record<string, string> = {
  'copper 500 text': '{copper.500}',
  'copper 300 text': '{copper.300}',
  'primary text': '{text.color}',
  'body copy': '{espresso.100}',
  label: '{espresso.200}',
  'secondary link': '{espresso.300}',
  'muted text': '{text.muted.color}',
};

const SEVERITIES: ('info' | 'success' | 'warn' | 'error')[] = [
  'info',
  'success',
  'warn',
  'error',
];

describe(
  'token contrast',
  (): void => {
    describe(
      'text on the dark page surfaces',
      (): void => {
        for (const background of PAGE_BACKGROUNDS) {
          for (const [name, foreground] of Object.entries(TEXT_ON_PAGE)) {
            it(
              `${name} on ${background} is at least ${TEXT_MINIMUM}:1`,
              (): void => {
                const pair: ColorPair = {
                  name,
                  foreground,
                  background,
                };

                expect(ratio(pair, background)).toBeGreaterThanOrEqual(TEXT_MINIMUM);
              },
            );
          }
        }
      },
    );

    describe(
      'form fields over the dark page',
      (): void => {
        const fieldBackground: string = '{form.field.background}';
        const fieldTexts: Record<string, string> = {
          'typed text': '{form.field.color}',
          placeholder: '{form.field.placeholder.color}',
          'floating label': '{form.field.float.label.color}',
          'floating label while focused': '{form.field.float.label.focus.color}',
          icon: '{form.field.icon.color}',
        };

        for (const [name, foreground] of Object.entries(fieldTexts)) {
          it(
            `${name} is at least ${TEXT_MINIMUM}:1 on the field`,
            (): void => {
              const pair: ColorPair = {
                name,
                foreground,
                background: fieldBackground,
              };

              expect(ratio(pair, '{espresso.950}')).toBeGreaterThanOrEqual(TEXT_MINIMUM);
            },
          );
        }

        it(
          `the field border, over the field, is at least ${UI_MINIMUM}:1 against the page`,
          (): void => {
            const page: Rgba = resolveColor('{espresso.950}');
            const field: Rgba = compositeOver(resolveColor('{form.field.background}'), page);
            const border: Rgba = compositeOver(resolveColor('{form.field.border.color}'), field);

            expect(contrastRatio(border, page)).toBeGreaterThanOrEqual(UI_MINIMUM);
          },
        );
      },
    );

    describe(
      'buttons, calendar days and slots',
      (): void => {
        const pairs: ColorPair[] = [
          {
            name: 'primary button',
            foreground: '{primary.contrast.color}',
            background: '{primary.color}',
          },
          {
            name: 'primary button on hover',
            foreground: '{primary.contrast.color}',
            background: '{copper.600}',
          },
          {
            name: 'primary button pressed',
            foreground: '{primary.contrast.color}',
            background: '{primary.active.color}',
          },
          {
            name: 'picked calendar day or slot',
            foreground: '{primary.contrast.color}',
            background: '{primary.color}',
          },
          {
            name: 'hovered calendar day',
            foreground: '{primary.contrast.color}',
            background: '{primary.hover.color}',
          },
          {
            name: 'open calendar day',
            foreground: '{text.color}',
            background: '{brand.day.open.background}',
          },
          {
            name: 'today',
            foreground: '{text.color}',
            background: 'color-mix(in srgb, {espresso.50} 16%, transparent)',
          },
          {
            name: 'weekday header',
            foreground: '{espresso.200}',
            background: '{brand.controlBackground}',
          },
          {
            name: 'open slot',
            foreground: '{text.color}',
            background: '{brand.controlBackground}',
          },
          {
            name: 'selected highlight',
            foreground: '{highlight.color}',
            background: '{highlight.background}',
          },
        ];

        for (const pair of pairs) {
          it(
            `${pair.name} is at least ${TEXT_MINIMUM}:1`,
            (): void => {
              expect(ratio(pair, '{ink}')).toBeGreaterThanOrEqual(TEXT_MINIMUM);
            },
          );
        }

        it(
          `a disabled calendar day (exempt) stays at least ${UI_MINIMUM}:1 so it can still be read`,
          (): void => {
            const pair: ColorPair = {
              name: 'disabled day',
              foreground: '{espresso.600}',
              background: '{brand.day.closed.background}',
            };

            expect(ratio(pair, '{ink}')).toBeGreaterThanOrEqual(UI_MINIMUM);
          },
        );
      },
    );

    describe(
      'notices and toasts, for each severity',
      (): void => {
        for (const severity of SEVERITIES) {
          it(
            `${severity} message text and icon are at least ${TEXT_MINIMUM}:1 on its tinted background`,
            (): void => {
              const pair: ColorPair = {
                name: severity,
                foreground: message[severity]?.color ?? '',
                background: message[severity]?.background ?? '',
              };

              expect(ratio(pair, '{ink}')).toBeGreaterThanOrEqual(TEXT_MINIMUM);
            },
          );

          it(
            `${severity} toast title and detail are at least ${TEXT_MINIMUM}:1 on its tinted background`,
            (): void => {
              const background: string = toast[severity]?.background ?? '';
              const title: ColorPair = {
                name: severity,
                foreground: toast[severity]?.color ?? '',
                background,
              };
              const detail: ColorPair = {
                name: severity,
                foreground: toast[severity]?.detailColor ?? '',
                background,
              };

              expect(ratio(title, '{ink}')).toBeGreaterThanOrEqual(TEXT_MINIMUM);
              expect(ratio(detail, '{ink}')).toBeGreaterThanOrEqual(TEXT_MINIMUM);
            },
          );
        }
      },
    );

    describe(
      'focus ring',
      (): void => {
        for (const background of PAGE_BACKGROUNDS) {
          it(
            `is at least ${UI_MINIMUM}:1 against ${background}`,
            (): void => {
              const pair: ColorPair = {
                name: 'ring',
                foreground: '{focus.ring.color}',
                background,
              };

              expect(ratio(pair, background)).toBeGreaterThanOrEqual(UI_MINIMUM);
            },
          );
        }
      },
    );
  },
);
