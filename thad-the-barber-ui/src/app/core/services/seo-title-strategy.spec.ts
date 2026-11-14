import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, Routes, TitleStrategy, provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { SHOP_FALLBACK } from '../config/shop-info';
import { SeoTitleStrategy } from './seo-title-strategy';

@Component({ selector: 'app-empty-page', template: '' })
class EmptyPage {}

const CHAIRS_SEO: RouteSeo = {
  title: 'Chairs · {shopName}',
  description: 'Where the chairs are.',
  isIndexed: true,
};
const STOOL_SEO: RouteSeo = {
  title: 'Stool · {shopName}',
  description: 'The stool by the door.',
  isIndexed: false,
};

const TEST_ROUTES: Routes = [
  {
    path: 'chairs',
    data: { seo: CHAIRS_SEO },
    component: EmptyPage,
  },
  {
    path: 'seating',
    data: { seo: CHAIRS_SEO },
    children: [
      {
        path: 'stool',
        data: { seo: STOOL_SEO },
        component: EmptyPage,
      },
    ],
  },
  { path: 'plain', component: EmptyPage },
];

describe(
  'SeoTitleStrategy',
  (): void => {
    let router: Router;
    let title: Title;

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(TEST_ROUTES),
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: TitleStrategy, useExisting: SeoTitleStrategy },
        ],
      });
      router = TestBed.inject(Router);
      title = TestBed.inject(Title);
    });

    afterEach((): void => {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    });

    it(
      'sets the title from the active route seo',
      async (): Promise<void> => {
        await router.navigateByUrl('/chairs');

        expect(title.getTitle()).toBe(`Chairs · ${SHOP_FALLBACK.name}`);
      },
    );

    it(
      'prefers the deepest route seo over its parent',
      async (): Promise<void> => {
        await router.navigateByUrl('/seating/stool');

        expect(title.getTitle()).toBe(`Stool · ${SHOP_FALLBACK.name}`);
      },
    );

    it(
      'leaves the title alone on a route without seo',
      async (): Promise<void> => {
        await router.navigateByUrl('/chairs');
        await router.navigateByUrl('/plain');

        expect(title.getTitle()).toBe(`Chairs · ${SHOP_FALLBACK.name}`);
      },
    );

    it(
      'leaves the query string and fragment out of the canonical link',
      async (): Promise<void> => {
        await router.navigateByUrl('/chairs?from=text#top');

        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/chairs$/);
      },
    );
  },
);
