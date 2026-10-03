import { RESPONSE_INIT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HOME_SECTIONS, SHOP_INFO } from '../../core/config/shop-info';
import { NavItem } from '../../core/models/shop.models';
import { NotFound } from './not-found';

describe(
  'NotFound',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<NotFound> = TestBed.createComponent(NotFound);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function hrefs(element: HTMLElement): string[] {
      return Array.from(element.querySelectorAll('a')).map((link: HTMLAnchorElement): string => link.getAttribute('href') ?? '');
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it(
      'sets a 404 status when rendered on the server',
      (): void => {
        const response: ResponseInit = {};
        TestBed.configureTestingModule({ providers: [{ provide: RESPONSE_INIT, useValue: response }] });

        render();

        expect(response.status).toBe(404);
      },
    );

    it(
      'renders in the browser, where there is no response to set',
      (): void => {
        expect(render().querySelector('[data-testid="not-found"]')).not.toBeNull();
      },
    );

    it(
      'links to booking and the home page',
      (): void => {
        const element: HTMLElement = render();

        expect(element.querySelector('[data-testid="not-found-book"]')?.getAttribute('href')).toBe('/book');
        expect(element.querySelector('[data-testid="not-found-home"]')?.getAttribute('href')).toBe('/');
      },
    );

    it(
      'links to every home section and the shop phone',
      (): void => {
        const links: string[] = hrefs(render());

        HOME_SECTIONS.forEach((section: NavItem): void => {
          expect(links).toContain(`/#${section.fragment}`);
        });
        expect(links).toContain(SHOP_INFO.phone.tel);
      },
    );
  },
);
