import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { SeoService } from './seo.service';

/** Applies the deepest active route's `data.seo` on every navigation, so titles and tags come from route config. */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seoService: SeoService = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeSeo: RouteSeo | undefined = this.findSeo(snapshot.root);
    if (!routeSeo) {
      return;
    }
    const path: string = snapshot.url.split(/[?#]/)[0] ?? '/';
    this.seoService.apply(routeSeo, path);
  }

  private findSeo(root: ActivatedRouteSnapshot): RouteSeo | undefined {
    let found: RouteSeo | undefined;
    let route: ActivatedRouteSnapshot | null = root;
    while (route) {
      found = (route.data['seo'] as RouteSeo | undefined) ?? found;
      route = route.firstChild;
    }
    return found;
  }
}
