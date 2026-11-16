import { AXE_OPTIONS, expectNoAxeViolations } from './axe';

describe(
  'expectNoAxeViolations',
  (): void => {
    let host: HTMLElement;

    beforeEach((): void => {
      host = document.createElement('div');
      document.body.appendChild(host);
    });

    afterEach((): void => {
      host.remove();
    });

    it(
      'passes a fragment with no violations',
      async (): Promise<void> => {
        host.innerHTML = '<img src="made-up.png" alt="Made-up chair"><button type="button">Made-up action</button>';

        await expectNoAxeViolations(host);
      },
    );

    it(
      'names the rule, impact, help URL and selector of an image without alt',
      async (): Promise<void> => {
        host.innerHTML = '<img id="no-alt-image" src="made-up.png">';

        await expect(expectNoAxeViolations(host)).rejects.toThrow(/image-alt \(critical\)[\s\S]*dequeuniversity[\s\S]*#no-alt-image/);
      },
    );

    it(
      'runs the WCAG A and AA tags with color-contrast and region off',
      (): void => {
        expect(AXE_OPTIONS.runOnly).toEqual({
          type: 'tag',
          values: [
            'wcag2a',
            'wcag2aa',
            'wcag21a',
            'wcag21aa',
            'wcag22aa',
          ],
        });
        expect(AXE_OPTIONS.rules).toEqual({
          'color-contrast': { enabled: false },
          region: { enabled: false },
        });
      },
    );
  },
);
