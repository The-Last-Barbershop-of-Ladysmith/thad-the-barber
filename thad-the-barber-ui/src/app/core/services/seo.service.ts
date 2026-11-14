import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { AppState } from '../../store/app.state';
import { SHOP_FALLBACK } from '../config/shop-info';

export const SOCIAL_IMAGE_WIDTH: number = 1200;
export const OPEN_GRAPH_IMAGE_HEIGHT: number = 630;
export const TWITTER_IMAGE_HEIGHT: number = 600;
export const OPEN_GRAPH_IMAGE_PATH: string = '/social/og-v1.jpg';
export const TWITTER_IMAGE_PATH: string = '/social/twitter-v1.jpg';

/**
 * Writes a route's title, description, canonical link, robots, Open Graph and Twitter tags, in the browser and
 * while prerendering. The same image pair serves every route.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title: Title = inject(Title);
  private readonly meta: Meta = inject(Meta);
  private readonly document: Document = inject(DOCUMENT);
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);

  apply(routeSeo: RouteSeo, path: string): void {
    const title: string = this.fill(routeSeo.title);
    const description: string = this.fill(routeSeo.description);
    const pageUrl: string = `${environment.siteUrl}${path}`;
    const imageAlt: string = `${this.shopName()}: book your cut online`;
    this.title.setTitle(title);
    this.setNamedTags({
      description,
      robots: routeSeo.isIndexed ? 'index, follow' : 'noindex, nofollow',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': `${environment.siteUrl}${TWITTER_IMAGE_PATH}`,
      'twitter:image:alt': imageAlt,
    });
    this.setPropertyTags({
      'og:type': 'website',
      'og:site_name': this.shopName(),
      'og:title': title,
      'og:description': description,
      'og:url': pageUrl,
      'og:image': `${environment.siteUrl}${OPEN_GRAPH_IMAGE_PATH}`,
      'og:image:width': String(SOCIAL_IMAGE_WIDTH),
      'og:image:height': String(OPEN_GRAPH_IMAGE_HEIGHT),
      'og:image:type': 'image/jpeg',
      'og:image:alt': imageAlt,
    });
    this.setCanonical(routeSeo.isIndexed ? pageUrl : null);
  }

  private fill(template: string): string {
    return template.replaceAll('{shopName}', this.shopName()).replaceAll('{city}', SHOP_FALLBACK.city);
  }

  private setNamedTags(tags: Record<string, string>): void {
    for (const [name, content] of Object.entries(tags)) {
      this.meta.updateTag({ name, content });
    }
  }

  private setPropertyTags(tags: Record<string, string>): void {
    for (const [property, content] of Object.entries(tags)) {
      this.meta.updateTag({ property, content });
    }
  }

  private setCanonical(url: string | null): void {
    let link: HTMLLinkElement | null = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (url === null) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.append(link);
    }
    link.href = url;
  }
}
