import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, DefaultTitleStrategy, RouterStateSnapshot } from '@angular/router';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { SeoService } from './seo.service';

/**
 * Applies the deepest active route's `data.seo` on every navigation, so titles and tags come from route config. A
 * route without it keeps Angular's own handling of a route `title`.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends DefaultTitleStrategy {
  private readonly seoService: SeoService = inject(SeoService);

  constructor() {
    super(inject(Title));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeSeo: RouteSeo | undefined = this.findSeo(snapshot.root);
    if (!routeSeo) {
      super.updateTitle(snapshot);
      return;
    }
    const path: string = snapshot.url.split(/[?#]/)[0] ?? '/';
    this.seoService.apply(routeSeo, path);
  }

  private findSeo(root: ActivatedRouteSnapshot): RouteSeo | undefined {
    let found: RouteSeo | undefined;
    let route: ActivatedRouteSnapshot | null = root;
    while (route) {
      const routeSeo: RouteSeo | undefined = route.data['seo'] as RouteSeo | undefined;
      if (routeSeo) {
        found = routeSeo;
      }
      route = route.firstChild;
    }
    return found;
  }
}
