import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { MockInstance } from 'vitest';
import { TEST_SHOP } from '../../../testing/test-shop';
import { SHOP_FALLBACK } from '../../core/config/shop-info';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { PrivacySection } from './models/privacy-section.model';
import { Privacy } from './privacy';
import { PRIVACY_SECTIONS } from './privacy-sections';

const SECTION_IDS: string[] = PRIVACY_SECTIONS.map((section: PrivacySection): string => section.fragment);

describe(
  'Privacy',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<Privacy> = TestBed.createComponent(Privacy);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function phoneHref(element: HTMLElement): string | null {
      return element.querySelector('[data-testid="privacy-phone"]')?.getAttribute('href') ?? null;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
    });

    it(
      'gives the fallback phone before the shop loads',
      (): void => {
        expect(phoneHref(render())).toBe(`tel:${SHOP_FALLBACK.phone}`);
      },
    );

    it(
      "gives the shop's phone from Square once it loads",
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(phoneHref(render())).toBe(`tel:${TEST_SHOP.phone}`);
      },
    );

    it(
      "gives the booking texts section the shop's name and Square phone for help",
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        const texts: HTMLElement | null = render().querySelector<HTMLElement>('[data-testid="privacy-section-texts"]');

        expect(texts?.textContent).toContain(TEST_SHOP.name);
        expect(texts?.querySelector('a')?.getAttribute('href')).toBe(`tel:${TEST_SHOP.phone}`);
      },
    );

    it(
      "links to Google's privacy policy and terms for the bot check",
      (): void => {
        const hrefs: string[] = Array.from(render().querySelectorAll('a'))
          .map((link: HTMLAnchorElement): string => link.getAttribute('href') ?? '');

        expect(hrefs).toContain('https://policies.google.com/privacy');
        expect(hrefs).toContain('https://policies.google.com/terms');
      },
    );

    it(
      'renders every section with its heading and one paragraph per entry, in order',
      (): void => {
        const sections: Element[] = Array.from(render().querySelectorAll('article section'));

        expect(sections.map((section: Element): string => section.id)).toEqual(SECTION_IDS);
        sections.forEach((section: Element, index: number): void => {
          expect(section.querySelector('h2')?.textContent).toBe(PRIVACY_SECTIONS[index]?.label);
          expect(section.querySelectorAll('p')).toHaveLength(PRIVACY_SECTIONS[index]?.paragraphs.length ?? 0);
        });
      },
    );

    it(
      'names the shop from Square where the copy mentions it, and uses no name before it loads',
      (): void => {
        const fallbackText: string = render().querySelector('article')?.textContent ?? '';
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        const loadedText: string = render().querySelector('article')?.textContent ?? '';

        expect(loadedText).toContain(`with ${TEST_SHOP.name} on this site`);
        expect(loadedText).toContain(`text ${TEST_SHOP.name} at`);
        expect(fallbackText).not.toContain(TEST_SHOP.name);
      },
    );

    it(
      'opens every external link in a new tab, safely, and tells screen readers',
      (): void => {
        const links: HTMLAnchorElement[] = Array.from(
          render().querySelectorAll<HTMLAnchorElement>('article a[href^="https://"]'),
        );

        expect(links).toHaveLength(3);
        links.forEach((link: HTMLAnchorElement): void => {
          expect(link.getAttribute('target')).toBe('_blank');
          expect(link.getAttribute('rel')).toBe('noopener');
          expect(link.querySelector('.sr-only')).not.toBeNull();
        });
      },
    );

    it(
      'lists the sections in the sidebar and in the phone box, each linking to its section',
      (): void => {
        const element: HTMLElement = render();

        ['.toc-sidebar', '.toc-box'].forEach((container: string): void => {
          const fragments: string[] = Array.from(element.querySelectorAll(`${container} a`))
            .map((link: Element): string => link.getAttribute('href')?.split('#')[1] ?? '');

          expect(fragments).toEqual(SECTION_IDS);
        });
      },
    );

    it(
      'marks the last section whose top has scrolled past the header',
      (): void => {
        const fixture: ComponentFixture<Privacy> = TestBed.createComponent(Privacy);
        fixture.detectChanges();
        const readingId: string = 'bot';
        const readingIndex: number = SECTION_IDS.indexOf(readingId);
        const boxes: MockInstance<Element['getBoundingClientRect']> = vi
          .spyOn(Element.prototype, 'getBoundingClientRect')
          .mockImplementation(function(this: Element): DOMRect {
            const index: number = SECTION_IDS.indexOf(this.id);
            return { top: (index - readingIndex) * 300 } as DOMRect;
          });

        window.dispatchEvent(new Event('scroll'));
        fixture.detectChanges();
        boxes.mockRestore();

        const marked: NodeListOf<Element> = (fixture.nativeElement as HTMLElement).querySelectorAll('.toc-sidebar [aria-current="location"]');
        expect(marked).toHaveLength(1);
        expect(marked[0]?.getAttribute('href')).toBe(`/privacy#${readingId}`);
      },
    );
  },
);
