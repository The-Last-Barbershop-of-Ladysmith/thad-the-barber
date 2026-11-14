import { Route, Routes } from '@angular/router';
import { SHOP_FALLBACK } from './core/config/shop-info';
import { routes } from './app.routes';
import { BOOKING_ROUTES } from './features/booking/booking.routes';
import { RouteSeo } from './shared/models/route-seo.model';

const MAX_TITLE_LENGTH: number = 60;
const MIN_DESCRIPTION_LENGTH: number = 120;
const MAX_DESCRIPTION_LENGTH: number = 160;

interface RouteWithSeo {
  path: string;
  seo: RouteSeo | undefined;
}

function fill(template: string): string {
  return template.replaceAll('{shopName}', SHOP_FALLBACK.name).replaceAll('{city}', SHOP_FALLBACK.city);
}

/** Leaf routes with the seo they own or inherit from a parent. `book` is lazy, so its routes are passed in. */
function collectLeaves(
  routeList: Routes,
  parentPath: string,
  parentSeo: RouteSeo | undefined,
): RouteWithSeo[] {
  return routeList.flatMap((route: Route): RouteWithSeo[] => {
    const path: string = [parentPath, route.path].filter((part: string | undefined): boolean => !!part).join('/');
    const seo: RouteSeo | undefined = (route.data?.['seo'] as RouteSeo | undefined) ?? parentSeo;
    const children: Routes | undefined = route.path === 'book' ? BOOKING_ROUTES : route.children;
    if (children) {
      return collectLeaves(
        children,
        path,
        seo,
      );
    }
    return [{ path, seo }];
  });
}

function pathsWhere(leaves: RouteWithSeo[], isMatch: (leaf: RouteWithSeo) => boolean): string[] {
  return leaves.filter(isMatch).map((leaf: RouteWithSeo): string => leaf.path);
}

describe(
  'route seo',
  (): void => {
    const leaves: RouteWithSeo[] = collectLeaves(
      routes,
      '',
      undefined,
    );

    it(
      'reaches every page the app has',
      (): void => {
        const paths: string[] = leaves.map((leaf: RouteWithSeo): string => leaf.path);

        expect(paths).toEqual(expect.arrayContaining([
          '',
          'book',
          'book/manage',
          'book/manage/:id',
          'book/manage/:id/reschedule',
          'privacy',
          'accessibility',
          '404',
          '**',
        ]));
      },
    );

    it(
      'gives every route data.seo, so a new route cannot ship without it',
      (): void => {
        expect(pathsWhere(leaves, (leaf: RouteWithSeo): boolean => !leaf.seo)).toEqual([]);
      },
    );

    it(
      'keeps every filled title at 60 characters or fewer',
      (): void => {
        const tooLong: string[] = pathsWhere(
          leaves,
          (leaf: RouteWithSeo): boolean => fill(leaf.seo?.title ?? '').length > MAX_TITLE_LENGTH,
        );

        expect(tooLong).toEqual([]);
      },
    );

    it(
      'keeps every filled description between 120 and 160 characters',
      (): void => {
        const outOfRange: string[] = pathsWhere(
          leaves,
          (leaf: RouteWithSeo): boolean => {
            const length: number = fill(leaf.seo?.description ?? '').length;
            return length < MIN_DESCRIPTION_LENGTH || length > MAX_DESCRIPTION_LENGTH;
          },
        );

        expect(outOfRange).toEqual([]);
      },
    );

    it(
      'hides the manage pages and the 404 from search',
      (): void => {
        const hidden: string[] = pathsWhere(leaves, (leaf: RouteWithSeo): boolean => leaf.seo?.isIndexed === false);

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
        const indexed: string[] = pathsWhere(leaves, (leaf: RouteWithSeo): boolean => leaf.seo?.isIndexed === true);

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
