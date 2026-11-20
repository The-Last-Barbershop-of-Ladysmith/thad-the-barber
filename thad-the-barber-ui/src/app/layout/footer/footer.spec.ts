import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { IS_BOOKING_PREVIEW } from '../../core/config/booking-preview.token';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { Footer } from './footer';

describe(
  'Footer',
  (): void => {
    let footer: HTMLElement;

    function render(isBookingPreview: boolean): HTMLElement {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          MessageService,
          { provide: IS_BOOKING_PREVIEW, useValue: isBookingPreview },
          provideStore({
            [announcementsFeature.name]: announcementsFeature.reducer,
            [shopFeature.name]: shopFeature.reducer,
          }),
        ],
      });
      const fixture: ComponentFixture<Footer> = TestBed.createComponent(Footer);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach((): void => {
      footer = render(false);
    });

    it(
      "carries Google's reCAPTCHA notice, with links to its privacy policy and terms that open in a new tab",
      (): void => {
        const links: HTMLAnchorElement[] = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.recaptcha-notice a'));

        expect(links.map((link: HTMLAnchorElement): string | null => link.getAttribute('href'))).toEqual([
          'https://policies.google.com/privacy',
          'https://policies.google.com/terms',
        ]);
        expect(links.every((link: HTMLAnchorElement): boolean => link.target === '_blank' && link.rel.includes('noopener'))).toBe(true);
      },
    );

    it(
      'carries the shop news text sign-up as a column, with its own field ids',
      (): void => {
        const column: HTMLElement | null = footer.querySelector('[data-testid="footer-text-updates"]');

        expect(column?.classList.contains('column')).toBe(true);
        expect(column?.querySelector('[data-testid="text-updates-form"]')).not.toBeNull();
        expect(column?.querySelector('#footer-text-updates-phone')).not.toBeNull();
        expect(column?.querySelector('#footer-text-updates-consent')).not.toBeNull();
      },
    );

    it(
      'links each home section in the Site column, in page order',
      (): void => {
        const hrefs: (string | null)[] = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.column-links.is-split a'))
          .map((link: HTMLAnchorElement): string | null => link.getAttribute('href'));

        expect(hrefs).toEqual([
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
      'offers booking and managing a booking in the Bookings column, and calling and texting in the Shop info column',
      (): void => {
        const hrefsIn: (columnIndex: number) => (string | null)[] = (columnIndex: number): (string | null)[] =>
          Array.from(footer.querySelectorAll('.column').item(columnIndex).querySelectorAll<HTMLAnchorElement>('a'))
            .map((link: HTMLAnchorElement): string | null => link.getAttribute('href'));

        expect(hrefsIn(1)).toEqual(['/book', '/book/manage']);
        const shopInfo: (string | null)[] = hrefsIn(2);
        expect(shopInfo[0]).toMatch(/^tel:/u);
        expect(shopInfo[1]).toMatch(/^sms:/u);
      },
    );

    it(
      'leaves out the manage a booking link while booking is a preview',
      (): void => {
        const hrefs: (string | null)[] = Array.from(render(true).querySelectorAll('.column').item(1).querySelectorAll<HTMLAnchorElement>('a'))
          .map((link: HTMLAnchorElement): string | null => link.getAttribute('href'));

        expect(hrefs).toEqual(['/book']);
      },
    );

    it(
      'ends with the privacy page and a way back to the top',
      (): void => {
        expect(footer.querySelector('.bottom [data-testid="footer-privacy"]')?.getAttribute('href')).toBe('/privacy');
        expect(footer.querySelector('.bottom .to-top')).not.toBeNull();
      },
    );
  },
);
