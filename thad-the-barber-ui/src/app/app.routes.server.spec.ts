import { RenderMode, ServerRoute } from '@angular/ssr';
import { routes } from './app.routes';
import { CLIENT_ROUTES, serverRoutes } from './app.routes.server';
import { RouteLeaf, collectRouteLeaves } from '../testing/route-leaves';

describe(
  'server routes',
  (): void => {
    let leafPaths: string[];

    beforeAll(async (): Promise<void> => {
      const leaves: RouteLeaf[] = await collectRouteLeaves(routes);
      leafPaths = leaves
        .map((leaf: RouteLeaf): string => leaf.path)
        .filter((path: string): boolean => path !== '**');
    });

    it(
      'renders every page the app has, so Express never answers 404 for a real page',
      (): void => {
        const prerendered: string[] = serverRoutes
          .filter((serverRoute: ServerRoute): boolean => serverRoute.renderMode === RenderMode.Prerender)
          .map((serverRoute: ServerRoute): string => serverRoute.path);
        const unrendered: string[] = leafPaths.filter(
          (path: string): boolean => !prerendered.includes(path) && !CLIENT_ROUTES.includes(path),
        );

        expect(unrendered).toEqual([]);
      },
    );
  },
);
