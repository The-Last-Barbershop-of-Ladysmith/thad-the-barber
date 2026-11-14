import { SHOP_FALLBACK } from './core/config/shop-info';
import { routes } from './app.routes';
import { RouteLeaf, collectRouteLeaves } from '../testing/route-leaves';
import { fillSeoTemplate } from './shared/utils/seo.utils';

const MAX_TITLE_LENGTH: number = 60;
const MIN_DESCRIPTION_LENGTH: number = 120;
const MAX_DESCRIPTION_LENGTH: number = 160;

describe(
  'route seo',
  (): void => {
    let leaves: RouteLeaf[];

    function filled(template: string | undefined): string {
      return fillSeoTemplate(
        template ?? '',
        SHOP_FALLBACK.name,
        SHOP_FALLBACK.city,
      );
    }

    beforeAll(async (): Promise<void> => {
      leaves = await collectRouteLeaves(routes);
    });

    it(
      'reaches every page the app has',
      (): void => {
        const paths: string[] = leaves.map((leaf: RouteLeaf): string => leaf.path);

        expect(paths).toEqual([
          '',
          'book',
          'book/manage',
          'book/manage/:id/reschedule',
          'book/manage/:id',
          'privacy',
          'accessibility',
          '404',
          '**',
        ]);
      },
    );

    it(
      'gives every route data.seo, so a new route cannot ship without it',
      (): void => {
        const withoutSeo: string[] = leaves
          .filter((leaf: RouteLeaf): boolean => !leaf.seo)
          .map((leaf: RouteLeaf): string => leaf.path);

        expect(withoutSeo).toEqual([]);
      },
    );

    it(
      'keeps every filled title at 60 characters or fewer',
      (): void => {
        const tooLong: string[] = leaves
          .filter((leaf: RouteLeaf): boolean => filled(leaf.seo?.title).length > MAX_TITLE_LENGTH)
          .map((leaf: RouteLeaf): string => leaf.path);

        expect(tooLong).toEqual([]);
      },
    );

    it(
      'keeps every filled description between 120 and 160 characters',
      (): void => {
        const outOfRange: string[] = leaves
          .filter((leaf: RouteLeaf): boolean => {
            const length: number = filled(leaf.seo?.description).length;
            return length < MIN_DESCRIPTION_LENGTH || length > MAX_DESCRIPTION_LENGTH;
          })
          .map((leaf: RouteLeaf): string => leaf.path);

        expect(outOfRange).toEqual([]);
      },
    );

    it(
      'gives each page a different title, except the two that share the 404',
      (): void => {
        const titles: string[] = leaves.map((leaf: RouteLeaf): string => filled(leaf.seo?.title));
        const distinctTitles: Set<string> = new Set(titles);

        expect(distinctTitles.size).toBe(leaves.length - 1);
      },
    );

    it(
      'hides the manage pages and the 404 from search',
      (): void => {
        const hidden: string[] = leaves
          .filter((leaf: RouteLeaf): boolean => leaf.seo?.isIndexed === false)
          .map((leaf: RouteLeaf): string => leaf.path);

        expect(hidden).toEqual([
          'book/manage',
          'book/manage/:id/reschedule',
          'book/manage/:id',
          '404',
          '**',
        ]);
      },
    );

    it(
      'indexes home, book, privacy and accessibility',
      (): void => {
        const indexed: string[] = leaves
          .filter((leaf: RouteLeaf): boolean => leaf.seo?.isIndexed === true)
          .map((leaf: RouteLeaf): string => leaf.path);

        expect(indexed).toEqual([
          '',
          'book',
          'privacy',
          'accessibility',
        ]);
      },
    );
  },
);
