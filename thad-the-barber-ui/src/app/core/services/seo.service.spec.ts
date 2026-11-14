import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import { environment } from '../../../environments/environment';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { SHOP_FALLBACK } from '../config/shop-info';
import { OPEN_GRAPH_IMAGE_PATH, SeoService, TWITTER_IMAGE_PATH } from './seo.service';

const INDEXED_SEO: RouteSeo = {
  title: 'Chairs · {shopName} in {city}',
  description: '{shopName} cuts hair in {city}.',
  isIndexed: true,
};

const HIDDEN_SEO: RouteSeo = {
  title: 'Private · {shopName}',
  description: 'Not for search results.',
  isIndexed: false,
};

describe(
  'SeoService',
  (): void => {
    let seoService: SeoService;
    let meta: Meta;
    let title: Title;

    function nameContent(name: string): string | null {
      return document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
    }

    function propertyContent(property: string): string | null {
      return document.head.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? null;
    }

    function canonicalHref(): string | null {
      return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      seoService = TestBed.inject(SeoService);
      meta = TestBed.inject(Meta);
      title = TestBed.inject(Title);
    });

    afterEach((): void => {
      document.head.querySelector('link[rel="canonical"]')?.remove();
      meta.removeTag('name="robots"');
    });

    it(
      'fills the shop name from the fallback and the city from the constant',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(title.getTitle()).toBe(`Chairs · ${SHOP_FALLBACK.name} in ${SHOP_FALLBACK.city}`);
        expect(nameContent('description')).toBe(`${SHOP_FALLBACK.name} cuts hair in ${SHOP_FALLBACK.city}.`);
      },
    );

    it(
      'uses the shop name once the shop loads',
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        seoService.apply(INDEXED_SEO, '/chairs');

        expect(title.getTitle()).toBe(`Chairs · ${TEST_SHOP.name} in ${SHOP_FALLBACK.city}`);
        expect(propertyContent('og:site_name')).toBe(TEST_SHOP.name);
      },
    );

    it(
      'points the canonical link and og:url at the page on the site url',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(canonicalHref()).toBe(`${environment.siteUrl}/chairs`);
        expect(propertyContent('og:url')).toBe(`${environment.siteUrl}/chairs`);
      },
    );

    it(
      'tells search engines to index an indexed route',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(nameContent('robots')).toBe('index, follow');
      },
    );

    it(
      'marks a hidden route noindex and drops the canonical link left by the last page',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');
        seoService.apply(HIDDEN_SEO, '/private');

        expect(nameContent('robots')).toBe('noindex, nofollow');
        expect(canonicalHref()).toBeNull();
      },
    );

    it(
      'sends absolute image urls with their sizes for both networks',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(propertyContent('og:image')).toBe(`${environment.siteUrl}${OPEN_GRAPH_IMAGE_PATH}`);
        expect(nameContent('twitter:image')).toBe(`${environment.siteUrl}${TWITTER_IMAGE_PATH}`);
        expect(nameContent('twitter:card')).toBe('summary_large_image');
        expect(propertyContent('og:image:width')).toBe('1200');
        expect(propertyContent('og:image:height')).toBe('630');
        expect(propertyContent('og:image:alt')).toBeTruthy();
        expect(nameContent('twitter:image:alt')).toBeTruthy();
      },
    );

    it(
      'updates tags in place instead of adding a second copy',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');
        seoService.apply(HIDDEN_SEO, '/private');

        expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
        expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
      },
    );
  },
);
