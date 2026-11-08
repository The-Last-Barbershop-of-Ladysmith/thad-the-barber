import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonVariant } from '../../../../shared/models/button.models';
import { Router, provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { MockInstance } from 'vitest';
import { Announcement } from '../../models/announcement.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import * as AnnouncementsActions from '../../state/announcements.actions';
import { announcementsFeature } from '../../state/announcements.feature';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AnnouncementsCarousel } from './announcements-carousel';
import { LinkKind } from '../../../../shared/models/link.models';

describe(
  'AnnouncementsCarousel',
  (): void => {
    const base: Announcement = {
      title: 'Made-up special',
      bodyHtml: '',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      image: null,
      buttons: [],
    };

    function render(announcements: Announcement[], shownIndex: number = 0): HTMLElement {
      return renderFixture(announcements, shownIndex).nativeElement as HTMLElement;
    }

    function renderFixture(announcements: Announcement[], shownIndex: number): ComponentFixture<AnnouncementsCarousel> {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({
            [announcementsFeature.name]: announcementsFeature.reducer,
            [shopFeature.name]: shopFeature.reducer,
          }),
        ],
      });
      TestBed.inject(Store).dispatch(AnnouncementsActions.AnnouncementsRequestSuccess({ announcements }));
      TestBed.inject(Store).dispatch(AnnouncementsActions.AnnouncementShown({ index: shownIndex }));
      const fixture: ComponentFixture<AnnouncementsCarousel> = TestBed.createComponent(AnnouncementsCarousel);
      fixture.detectChanges();
      return fixture;
    }

    beforeEach((): void => {
      vi.useFakeTimers({
        now: new Date(
          2026,
          9,
          15,
          12,
        ),
        toFake: [
          'Date',
          'setTimeout',
          'clearTimeout',
        ],
      });
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    function query(host: HTMLElement, selector: string): Element {
      const element: Element | null = host.querySelector(selector);
      if (!element) {
        throw new Error(`Nothing matches ${selector}`);
      }
      return element;
    }

    function click(target: Element, init: MouseEventInit = {}): MouseEvent {
      const event: MouseEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ...init,
      });
      target.dispatchEvent(event);
      return event;
    }

    it(
      'hides the section when there are no announcements',
      (): void => {
        expect(render([]).querySelector('[data-testid="announcements"]')).toBeNull();
      },
    );

    it(
      'labels a multi-day announcement by its last day and a one-day one by its day',
      (): void => {
        const host: HTMLElement = render([
          base,
          {
            ...base,
            startDate: '2026-10-15',
            endDate: '2026-10-15',
          },
        ]);
        const labels: string[] = Array.from(host.querySelectorAll('.eyebrow'))
          .map((label: Element): string => label.textContent.trim());

        expect(labels[0]).toContain('Oct 15');
        expect(labels[0]).not.toContain('Thru');
        expect(labels[1]).toContain('Thru Oct 31');
      },
    );

    it(
      'lists the announcements newest first, the order the strip uses, so both share an index',
      (): void => {
        const host: HTMLElement = render([
          {
            ...base,
            title: 'Older special',
            startDate: '2026-10-02',
          },
          {
            ...base,
            title: 'Newest special',
            startDate: '2026-10-12',
          },
        ]);
        const titles: string[] = Array.from(host.querySelectorAll('.slide-title'))
          .map((title: Element): string => title.textContent.trim());

        expect(titles).toEqual(['Newest special', 'Older special']);
      },
    );

    it(
      'counts from the announcement the strip chose',
      (): void => {
        const twoAnnouncements: Announcement[] = [
          {
            ...base,
            startDate: '2026-10-02',
          },
          {
            ...base,
            startDate: '2026-10-12',
          },
        ];

        expect(query(render(twoAnnouncements, 0), '.count').textContent.trim()).toBe('01 / 02');
        TestBed.resetTestingModule();
        expect(query(render(twoAnnouncements, 1), '.count').textContent.trim()).toBe('02 / 02');
      },
    );

    it(
      'renders the body as HTML with scripts and handlers stripped',
      (): void => {
        const bodyHtml: string = '<p>Walk-ins <strong>welcome</strong></p><script>window.hacked = true</script><img src="x" onerror="window.hacked = true">';
        const body: Element = query(render([{ ...base, bodyHtml }]), '[data-testid="announcement-body"]');

        expect(body.querySelector('strong')?.textContent).toBe('welcome');
        expect(body.querySelector('script')).toBeNull();
        expect(body.querySelector('img')?.hasAttribute('onerror')).toBe(false);
      },
    );

    it(
      'places the image after the text, moving it first on wide screens only when asked',
      (): void => {
        const host: HTMLElement = render([
          {
            ...base, image: {
              src: 'https://media.test/announcements/right.webp',
              alt: '',
              position: AnnouncementImagePosition.Right,
            },
          },
          {
            ...base, image: {
              src: 'https://media.test/announcements/left.webp',
              alt: 'A chair',
              position: AnnouncementImagePosition.Left,
            },
          },
        ]);
        const images: HTMLImageElement[] = Array.from(host.querySelectorAll<HTMLImageElement>('[data-testid="announcement-image"]'));

        expect(images.map((image: HTMLImageElement): boolean => image.classList.contains('md:order-first'))).toEqual([true, false]);
        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('alt'))).toEqual(['A chair', '']);
        expect(images.every((image: HTMLImageElement): boolean => image.previousElementSibling?.classList.contains('slide-copy') ?? false)).toBe(true);
      },
    );

    it(
      'opens external buttons in a new tab and styles each variant',
      (): void => {
        const host: HTMLElement = render([
          {
            ...base,
            buttons: [
              {
                label: 'Book',
                url: '/book',
                kind: LinkKind.Internal,
                variant: ButtonVariant.Primary,
              },
              {
                label: 'Menu',
                url: 'https://example.test/menu',
                kind: LinkKind.External,
                variant: ButtonVariant.Outlined,
              },
              {
                label: 'Call',
                url: 'tel:+15550100000',
                kind: LinkKind.Device,
                variant: ButtonVariant.Text,
              },
              {
                label: 'Mail',
                url: 'mailto:owner@example.test',
                kind: LinkKind.Device,
                variant: ButtonVariant.Secondary,
              },
            ],
          },
        ]);
        const buttons: HTMLAnchorElement[] = Array.from(host.querySelectorAll<HTMLAnchorElement>('.actions a'));

        expect(buttons.map((button: HTMLAnchorElement): string | null => button.getAttribute('href'))).toEqual([
          '/book',
          'https://example.test/menu',
          'tel:+15550100000',
          'mailto:owner@example.test',
        ]);
        expect(buttons.map((button: HTMLAnchorElement): string | null => button.getAttribute('target'))).toEqual([
          null,
          '_blank',
          null,
          null,
        ]);
        expect(buttons[1]?.getAttribute('rel')).toBe('noopener');
        expect(buttons[1]?.classList.contains('p-button-outlined')).toBe(true);
        expect(buttons[2]?.classList.contains('p-button-text')).toBe(true);
        expect(buttons[3]?.classList.contains('p-button-secondary')).toBe(true);
      },
    );

    it(
      'routes plain clicks on links to this site in the app, in the body and on buttons',
      (): void => {
        const host: HTMLElement = render([
          {
            ...base,
            bodyHtml: '<p>See <a href="/#visit">our <em>hours</em></a></p>',
            buttons: [
              {
                label: 'Book',
                url: '/book',
                kind: LinkKind.Internal,
                variant: ButtonVariant.Primary,
              },
            ],
          },
        ]);
        const navigate: MockInstance<Router['navigateByUrl']> = vi.spyOn(TestBed.inject(Router), 'navigateByUrl')
          .mockResolvedValue(true);

        const bodyClick: MouseEvent = click(query(host, '[data-testid="announcement-body"] em'));
        const buttonClick: MouseEvent = click(query(host, '.actions a'));

        expect(navigate.mock.calls).toEqual([['/#visit'], ['/book']]);
        expect(bodyClick.defaultPrevented).toBe(true);
        expect(buttonClick.defaultPrevented).toBe(true);
      },
    );

    it(
      'leaves modified clicks and links elsewhere to the browser',
      (): void => {
        const host: HTMLElement = render([
          {
            ...base,
            bodyHtml: '<a href="/book">Book</a> <a href="https://example.test">Elsewhere</a> <a href="//other.test">Other</a> '
              + '<a href="/files/price-list.pdf" download>Price list</a>',
          },
        ]);
        const navigate: MockInstance<Router['navigateByUrl']> = vi.spyOn(TestBed.inject(Router), 'navigateByUrl')
          .mockResolvedValue(true);
        const [
          internal,
          external,
          protocolRelative,
          download,
        ]: HTMLAnchorElement[
        ] = Array.from(host.querySelectorAll<HTMLAnchorElement>('[data-testid="announcement-body"] a'));
        if (!internal || !external || !protocolRelative || !download) {
          throw new Error('Links did not render');
        }

        const events: MouseEvent[] = [
          click(internal, { ctrlKey: true }),
          click(internal, { metaKey: true }),
          click(internal, { button: 1 }),
          click(external),
          click(protocolRelative),
          click(download),
        ];
        const alreadyHandled: MouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        alreadyHandled.preventDefault();
        internal.dispatchEvent(alreadyHandled);

        expect(navigate).not.toHaveBeenCalled();
        expect(events.some((event: MouseEvent): boolean => event.defaultPrevented)).toBe(false);
      },
    );

    describe(
      'a slide the strip chose',
      (): void => {
        const announcements: Announcement[] = [
          { ...base, title: 'First made-up special' },
          { ...base, title: 'Second made-up special' },
        ];

        function chooseSecondSlide(): ComponentFixture<AnnouncementsCarousel> {
          const fixture: ComponentFixture<AnnouncementsCarousel> = renderFixture(announcements, 0);
          TestBed.inject(Store).dispatch(AnnouncementsActions.AnnouncementShown({ index: 1 }));
          fixture.detectChanges();
          return fixture;
        }

        function carouselReports(fixture: ComponentFixture<AnnouncementsCarousel>, index: number): void {
          (fixture.componentInstance as unknown as { showSlide(index: number): void; }).showSlide(index);
        }

        function shownIndex(): number {
          return TestBed.inject(Store).selectSignal(announcementsFeature.selectShownIndex)();
        }

        it(
          'ignores the slides the carousel reports on its way there',
          (): void => {
            const fixture: ComponentFixture<AnnouncementsCarousel> = chooseSecondSlide();

            carouselReports(fixture, 0);

            expect(shownIndex()).toBe(1);
          },
        );

        it(
          'is followed again once the carousel finishes scrolling',
          (): void => {
            const fixture: ComponentFixture<AnnouncementsCarousel> = chooseSecondSlide();
            const slide: Element = query(fixture.nativeElement as HTMLElement, '[data-testid="announcement"]');

            slide.dispatchEvent(new Event('scrollend'));
            carouselReports(fixture, 0);

            expect(shownIndex()).toBe(0);
          },
        );

        it(
          'is followed again after the backstop when the browser never says the scroll ended',
          (): void => {
            const fixture: ComponentFixture<AnnouncementsCarousel> = chooseSecondSlide();

            vi.advanceTimersByTime(3000);
            carouselReports(fixture, 0);

            expect(shownIndex()).toBe(0);
          },
        );
      },
    );
  },
);
