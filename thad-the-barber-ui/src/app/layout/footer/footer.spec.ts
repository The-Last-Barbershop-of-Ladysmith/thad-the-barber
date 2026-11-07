import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { homeFeature } from '../../features/home/state/home.feature';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { Footer } from './footer';

describe(
  'Footer',
  (): void => {
    let footer: HTMLElement;

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({
            [announcementsFeature.name]: announcementsFeature.reducer,
            [homeFeature.name]: homeFeature.reducer,
            [shopFeature.name]: shopFeature.reducer,
          }),
        ],
      });
      const fixture: ComponentFixture<Footer> = TestBed.createComponent(Footer);
      fixture.detectChanges();
      footer = fixture.nativeElement as HTMLElement;
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
      'links each home section in the bottom row, then Privacy',
      (): void => {
        const hrefs: (string | null)[] = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.bottom-nav a'))
          .map((link: HTMLAnchorElement): string | null => link.getAttribute('href'));

        expect(hrefs).toEqual([
          '/#chair',
          '/#hours',
          '/#announcements',
          '/#gallery',
          '/#reviews',
          '/#visit',
          '/privacy',
        ]);
      },
    );
  },
);
