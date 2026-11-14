import { Route, Routes } from '@angular/router';
import { RouteSeo } from '../app/shared/models/route-seo.model';

export interface RouteLeaf {
  path: string;
  seo: RouteSeo | undefined;
}

/** Every page in a route tree, following lazy `loadChildren`, with the `data.seo` it owns or inherits. */
export async function collectRouteLeaves(
  routeList: Routes,
  parentPath: string = '',
  parentSeo?: RouteSeo,
): Promise<RouteLeaf[]> {
  const leaves: RouteLeaf[] = [];
  for (const route of routeList) {
    const path: string = [parentPath, route.path].filter((part: string | undefined): boolean => !!part).join('/');
    const seo: RouteSeo | undefined = (route.data?.['seo'] as RouteSeo | undefined) ?? parentSeo;
    const children: Routes | undefined = await findChildren(route);
    if (children) {
      leaves.push(...await collectRouteLeaves(
        children,
        path,
        seo,
      ));
    } else {
      leaves.push({ path, seo });
    }
  }
  return leaves;
}

async function findChildren(route: Route): Promise<Routes | undefined> {
  if (route.children) {
    return route.children;
  }
  if (route.loadChildren) {
    return (await route.loadChildren()) as Routes;
  }
  return undefined;
}
