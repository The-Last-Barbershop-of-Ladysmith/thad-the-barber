import { toHeaderScrollOffset } from './scroll-offset.utils';

describe(
  'toHeaderScrollOffset',
  (): void => {
    afterEach((): void => {
      document.body.replaceChildren();
    });

    function addHeaderReaching(bottom: number): void {
      const appHeader: HTMLElement = document.createElement('app-header');
      const top: HTMLElement = document.createElement('div');
      top.className = 'top';
      vi.spyOn(top, 'getBoundingClientRect').mockReturnValue({ bottom } as DOMRect);
      appHeader.append(top);
      document.body.append(appHeader);
    }

    it(
      'clears the bottom of the fixed header, with a little air',
      (): void => {
        addHeaderReaching(108);

        expect(toHeaderScrollOffset(document)).toEqual([0, 124]);
      },
    );

    it(
      'follows the header as it grows and shrinks, as the announcement strip comes and goes',
      (): void => {
        addHeaderReaching(73);

        expect(toHeaderScrollOffset(document)).toEqual([0, 89]);
      },
    );

    it(
      'leaves only the air before the header exists, as when the page is prerendered',
      (): void => {
        expect(toHeaderScrollOffset(document)).toEqual([0, 16]);
      },
    );
  },
);
