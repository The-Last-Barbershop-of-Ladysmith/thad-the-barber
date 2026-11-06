import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { environment } from '../../../../../environments/environment';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { ShopInfo } from '../../../shop/models/shop-info.model';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { Visit } from './visit';

describe(
  'Visit',
  (): void => {
    const savedMapKey: string = environment.staticMapApiKey;
    const savedMapId: string = environment.staticMapId;

    beforeEach((): void => {
      environment.staticMapApiKey = 'fake-static-map-key';
      environment.staticMapId = 'fake-map-id';
    });

    afterEach((): void => {
      environment.staticMapApiKey = savedMapKey;
      environment.staticMapId = savedMapId;
    });

    function render(shopInfo: ShopInfo): { fixture: ComponentFixture<Visit>; element: HTMLElement; } {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      TestBed.inject<Store>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo }));
      const fixture: ComponentFixture<Visit> = TestBed.createComponent(Visit);
      fixture.detectChanges();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    function findMap(element: HTMLElement): HTMLAnchorElement | null {
      return element.querySelector<HTMLAnchorElement>('[data-testid="visit-map"]');
    }

    it(
      'shows the themed map image, loaded with the page',
      (): void => {
        const image: HTMLImageElement | null | undefined = findMap(render(TEST_SHOP).element)?.querySelector('img');

        expect(image?.getAttribute('src')).toContain('https://maps.googleapis.com/maps/api/staticmap?');
        expect(image?.getAttribute('src')).toContain('map_id=fake-map-id');
        expect(image?.getAttribute('loading')).toBeNull();
      },
    );

    it(
      'links the map to directions in a new tab',
      (): void => {
        const { element }: { element: HTMLElement; } = render(TEST_SHOP);
        const map: HTMLAnchorElement | null = findMap(element);

        expect(map?.getAttribute('href')).toBe(
          'https://www.google.com/maps/dir/?api=1&destination='
          + encodeURIComponent('12 Pretend Pl, Faketown, HI 96999-0001'),
        );
        expect(map?.getAttribute('target')).toBe('_blank');
        expect(map?.getAttribute('rel')).toContain('noopener');
      },
    );

    it(
      'hides the map when its image fails to load, leaving the details',
      (): void => {
        const { fixture, element }: { fixture: ComponentFixture<Visit>; element: HTMLElement; } = render(TEST_SHOP);

        findMap(element)?.querySelector('img')?.dispatchEvent(new Event('error'));
        fixture.detectChanges();

        expect(findMap(element)).toBeNull();
        expect(element.querySelector('.panel')?.classList.contains('has-map')).toBe(false);
        expect(element.querySelector('[data-testid="visit-directions"]')).not.toBeNull();
      },
    );

    it(
      'has no map when the environment has no map key',
      (): void => {
        environment.staticMapApiKey = '';

        expect(findMap(render(TEST_SHOP).element)).toBeNull();
      },
    );

    it(
      'shows the street as the heading with the city line under it',
      (): void => {
        const { element }: { element: HTMLElement; } = render(TEST_SHOP);

        expect(element.querySelector('h2')?.textContent).toContain('12 Pretend Pl');
        expect(element.querySelector('.address-city')?.textContent).toContain('Faketown, HI 96999-0001');
      },
    );

    it(
      'opens directions in a new tab from the Get directions button',
      (): void => {
        const button: HTMLAnchorElement | null = render(TEST_SHOP).element
          .querySelector<HTMLAnchorElement>('[data-testid="visit-directions"]');

        expect(button?.getAttribute('href')).toContain('https://www.google.com/maps/dir/?api=1&destination=');
        expect(button?.getAttribute('target')).toBe('_blank');
        expect(button?.getAttribute('rel')).toContain('noopener');
      },
    );

    it(
      'calls the shop from a button whose text is the number',
      (): void => {
        const button: HTMLAnchorElement | null = render(TEST_SHOP).element
          .querySelector<HTMLAnchorElement>('[data-testid="visit-phone"]');

        expect(button?.getAttribute('href')).toMatch(/^tel:\+\d+$/);
        expect(button?.textContent).toMatch(/\(\d{3}\) \d{3}-\d{4}/);
      },
    );
  },
);
