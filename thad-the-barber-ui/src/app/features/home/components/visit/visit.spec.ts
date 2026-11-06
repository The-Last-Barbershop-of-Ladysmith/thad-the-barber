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

    function findByTestId(element: HTMLElement, testId: string): HTMLAnchorElement | null {
      return element.querySelector<HTMLAnchorElement>(`[data-testid="${testId}"]`);
    }

    it(
      'shows the themed map image, loaded with the page',
      (): void => {
        const image: HTMLImageElement | null | undefined = findByTestId(render(TEST_SHOP).element, 'visit-map')?.querySelector('img');

        expect(image?.getAttribute('src')).toContain('https://maps.googleapis.com/maps/api/staticmap?');
        expect(image?.getAttribute('src')).toContain('map_id=fake-map-id');
        expect(image?.getAttribute('loading')).toBeNull();
      },
    );

    it(
      'links the map to directions in a new tab',
      (): void => {
        const { element }: { element: HTMLElement; } = render(TEST_SHOP);
        const map: HTMLAnchorElement | null = findByTestId(element, 'visit-map');

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

        findByTestId(element, 'visit-map')?.querySelector('img')?.dispatchEvent(new Event('error'));
        fixture.detectChanges();

        expect(findByTestId(element, 'visit-map')).toBeNull();
        expect(element.querySelector('.panel')?.classList.contains('has-map')).toBe(false);
        expect(findByTestId(element, 'visit-directions')).not.toBeNull();
      },
    );

    it(
      'has no map when the environment has no map key',
      (): void => {
        environment.staticMapApiKey = '';

        expect(findByTestId(render(TEST_SHOP).element, 'visit-map')).toBeNull();
      },
    );

    it(
      'shows the street and the city line in the heading',
      (): void => {
        const { element }: { element: HTMLElement; } = render(TEST_SHOP);

        const heading: string | undefined = element.querySelector('h2')?.textContent ?? undefined;

        expect(heading).toContain('12 Pretend Pl');
        expect(heading).toContain('Faketown, HI 96999-0001');
      },
    );

    it(
      'opens directions in a new tab from the Get directions button',
      (): void => {
        const button: HTMLAnchorElement | null = findByTestId(render(TEST_SHOP).element, 'visit-directions');

        expect(button?.getAttribute('href')).toContain('https://www.google.com/maps/dir/?api=1&destination=');
        expect(button?.getAttribute('target')).toBe('_blank');
        expect(button?.getAttribute('rel')).toContain('noopener');
      },
    );

    it(
      'calls the shop from a button whose text is the number',
      (): void => {
        const button: HTMLAnchorElement | null = findByTestId(render(TEST_SHOP).element, 'visit-phone');

        expect(button?.getAttribute('href')).toMatch(/^tel:\+\d+$/);
        expect(button?.textContent).toMatch(/\(\d{3}\) \d{3}-\d{4}/);
      },
    );

    it(
      'shows no heading or directions button before the shop has loaded, keeping the phone button',
      (): void => {
        TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
        const fixture: ComponentFixture<Visit> = TestBed.createComponent(Visit);
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('.eyebrow')).toBeNull();
        expect(element.querySelector('h2')).toBeNull();
        expect(findByTestId(element, 'visit-directions')).toBeNull();
        expect(findByTestId(element, 'visit-phone')).not.toBeNull();
      },
    );
  },
);
