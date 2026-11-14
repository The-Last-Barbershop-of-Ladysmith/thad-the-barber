import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Store, provideStore } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { readCanonicalHref, readMetaContent, removeSeoTags } from '../../../testing/head-tags';
import { TEST_SHOP } from '../../../testing/test-shop';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { SHOP_FALLBACK } from '../config/shop-info';
import { SeoService } from './seo.service';

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
    let title: Title;

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      seoService = TestBed.inject(SeoService);
      title = TestBed.inject(Title);
    });

    afterEach(removeSeoTags);

    it(
      'fills the shop name from the fallback and the city from the constant',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(title.getTitle()).toBe(`Chairs · ${SHOP_FALLBACK.name} in ${SHOP_FALLBACK.city}`);
        expect(readMetaContent('name', 'description')).toBe(`${SHOP_FALLBACK.name} cuts hair in ${SHOP_FALLBACK.city}.`);
      },
    );

    it(
      'uses the shop name once the shop loads',
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        seoService.apply(INDEXED_SEO, '/chairs');

        expect(title.getTitle()).toBe(`Chairs · ${TEST_SHOP.name} in ${SHOP_FALLBACK.city}`);
        expect(readMetaContent('property', 'og:site_name')).toBe(TEST_SHOP.name);
      },
    );

    it(
      'points the canonical link and og:url at the page on the site url',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(readCanonicalHref()).toBe(`${environment.siteUrl}/chairs`);
        expect(readMetaContent('property', 'og:url')).toBe(`${environment.siteUrl}/chairs`);
      },
    );

    it(
      'tells search engines to index an indexed route',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(readMetaContent('name', 'robots')).toBe('index, follow');
      },
    );

    it(
      'marks a hidden route noindex and drops the canonical link left by the last page',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');
        seoService.apply(HIDDEN_SEO, '/private');

        expect(readMetaContent('name', 'robots')).toBe('noindex, nofollow');
        expect(readCanonicalHref()).toBeNull();
      },
    );

    it(
      'sends absolute image urls with their sizes for both networks',
      (): void => {
        seoService.apply(INDEXED_SEO, '/chairs');

        expect(readMetaContent('property', 'og:image')).toBe(`${environment.siteUrl}/social/og-v1.jpg`);
        expect(readMetaContent('name', 'twitter:image')).toBe(`${environment.siteUrl}/social/twitter-v1.jpg`);
        expect(readMetaContent('name', 'twitter:card')).toBe('summary_large_image');
        expect(readMetaContent('property', 'og:image:width')).toBe('1200');
        expect(readMetaContent('property', 'og:image:height')).toBe('630');
        expect(readMetaContent('property', 'og:image:alt')).toBeTruthy();
        expect(readMetaContent('name', 'twitter:image:alt')).toBeTruthy();
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
