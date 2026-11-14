import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { fillSeoTemplate } from '../../shared/utils/seo.utils';
import { AppState } from '../../store/app.state';
import { SHOP_FALLBACK } from '../config/shop-info';

/** The image files and their sizes are made by `scripts/generate-social-images.ts`; change them together. */
const OPEN_GRAPH_IMAGE_PATH: string = '/social/og-v1.jpg';
const TWITTER_IMAGE_PATH: string = '/social/twitter-v1.jpg';
const OPEN_GRAPH_IMAGE_WIDTH: string = '1200';
const OPEN_GRAPH_IMAGE_HEIGHT: string = '630';

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
  private lastApplied: { routeSeo: RouteSeo; path: string; } | null = null;

  constructor() {
    effect((): void => {
      this.shopName();
      if (this.lastApplied) {
        this.write(this.lastApplied.routeSeo, this.lastApplied.path);
      }
    });
  }

  /** Remembers the route so the tags are written again when the shop's name loads or changes. */
  apply(routeSeo: RouteSeo, path: string): void {
    this.lastApplied = { routeSeo, path };
    this.write(routeSeo, path);
  }

  private write(routeSeo: RouteSeo, path: string): void {
    const title: string = fillSeoTemplate(
      routeSeo.title,
      this.shopName(),
      SHOP_FALLBACK.city,
    );
    const description: string = fillSeoTemplate(
      routeSeo.description,
      this.shopName(),
      SHOP_FALLBACK.city,
    );
    const pageUrl: string = `${environment.siteUrl}${path}`;
    const imageAlt: string = `${this.shopName()}: book your cut online`;
    this.title.setTitle(title);
    this.setTags(
      'name',
      {
        description,
        robots: routeSeo.isIndexed ? 'index, follow' : 'noindex, nofollow',
        'twitter:card': 'summary_large_image',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': `${environment.siteUrl}${TWITTER_IMAGE_PATH}`,
        'twitter:image:alt': imageAlt,
      },
    );
    this.setTags(
      'property',
      {
        'og:type': 'website',
        'og:site_name': this.shopName(),
        'og:title': title,
        'og:description': description,
        'og:image': `${environment.siteUrl}${OPEN_GRAPH_IMAGE_PATH}`,
        'og:image:width': OPEN_GRAPH_IMAGE_WIDTH,
        'og:image:height': OPEN_GRAPH_IMAGE_HEIGHT,
        'og:image:type': 'image/jpeg',
        'og:image:alt': imageAlt,
      },
    );
    this.setIndexedPageUrl(routeSeo.isIndexed ? pageUrl : null);
  }

  private setTags(attribute: 'name' | 'property', tags: Record<string, string>): void {
    for (const [key, content] of Object.entries(tags)) {
      this.meta.updateTag({ [attribute]: key, content });
    }
  }

  /** Only an indexed page has a canonical address; a hidden page (or the 404, at whatever path was typed) has none. */
  private setIndexedPageUrl(url: string | null): void {
    let link: HTMLLinkElement | null = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (url === null) {
      link?.parentNode?.removeChild(link);
      this.meta.removeTag('property="og:url"');
      return;
    }
    this.meta.updateTag({ property: 'og:url', content: url });
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
