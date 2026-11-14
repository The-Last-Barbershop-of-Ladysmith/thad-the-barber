import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { layoutFeature } from '../../store/app.feature';
import { Header } from './header';

@Component({ template: '' })
class BookingStub {}

describe(
  'Header',
  (): void => {
    let fixture: ComponentFixture<Header>;

    function host(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: 'book',
              component: BookingStub,
            },
          ]),
          provideStore({
            [announcementsFeature.name]: announcementsFeature.reducer,
            [layoutFeature.name]: layoutFeature.reducer,
            [shopFeature.name]: shopFeature.reducer,
          }),
        ],
      });
      fixture = TestBed.createComponent(Header);
      fixture.detectChanges();
    });

    it(
      'links each home section from the nav, in page order',
      (): void => {
        const links: HTMLAnchorElement[] = Array.from(host().querySelectorAll<HTMLAnchorElement>('[data-testid="header-nav"] a'));

        expect(links.map((link: HTMLAnchorElement): string | null => link.getAttribute('href'))).toEqual([
          '/#chair',
          '/#hours',
          '/#announcements',
          '/#gallery',
          '/#reviews',
          '/#visit',
        ]);
      },
    );

    it(
      'offers the phone number and a Book a cut button that opens the booking page',
      (): void => {
        const book: HTMLAnchorElement | null = host().querySelector('[data-testid="header-book"]');
        const phone: HTMLAnchorElement | null = host().querySelector('[data-testid="header-phone"]');

        expect(book?.getAttribute('href')).toBe('/book');
        expect(phone?.getAttribute('href')).toMatch(/^tel:/u);
      },
    );

    it(
      'reports the menu button as collapsed, then expanded once it is pressed',
      (): void => {
        const toggle: HTMLButtonElement | null = host().querySelector('[data-testid="menu-toggle"]');

        expect(toggle?.getAttribute('aria-expanded')).toBe('false');
        toggle?.click();
        fixture.detectChanges();
        expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      },
    );

    it(
      'swaps the nav, the phone, Book a cut and the menu button for a way back on the booking pages',
      async (): Promise<void> => {
        await TestBed.inject(Router).navigateByUrl('/book');
        fixture.detectChanges();

        expect(host().querySelector('[data-testid="header-nav"]')).toBeNull();
        expect(host().querySelector('[data-testid="header-book"]')).toBeNull();
        expect(host().querySelector('[data-testid="menu-toggle"]')).toBeNull();
        expect(host().querySelector('a.back-link')?.getAttribute('href')).toBe('/');
      },
    );
  },
);
