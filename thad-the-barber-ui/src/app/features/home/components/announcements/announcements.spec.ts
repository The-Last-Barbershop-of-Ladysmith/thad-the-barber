import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonVariant } from '../../../../shared/models/button.models';
import { Router, provideRouter } from '@angular/router';
import { MockInstance } from 'vitest';
import { Announcement } from '../../../announcements/models/announcement.model';
import { AnnouncementImagePosition } from '../../../announcements/models/announcement-image-position.model';
import { Announcements } from './announcements';
import { LinkKind } from '../../../../shared/models/link.models';

describe(
  'Announcements',
  (): void => {
    const base: Announcement = {
      title: 'Made-up special',
      bodyHtml: '',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      image: null,
      buttons: [],
    };

    function render(announcements: Announcement[]): HTMLElement {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const fixture: ComponentFixture<Announcements> = TestBed.createComponent(Announcements);
      fixture.componentRef.setInput('announcements', announcements);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

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
            startDate: '2026-11-26',
            endDate: '2026-11-26',
          },
        ]);
        const labels: string[] = Array.from(host.querySelectorAll('.eyebrow'))
          .map((label: Element): string => label.textContent.trim());

        expect(labels[0]).toContain('Oct 31');
        expect(labels[0]).not.toBe('Oct 31');
        expect(labels[1]).toBe('Nov 26');
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

        expect(images.map((image: HTMLImageElement): boolean => image.classList.contains('md:order-first'))).toEqual([false, true]);
        expect(images.map((image: HTMLImageElement): string | null => image.getAttribute('alt'))).toEqual(['', 'A chair']);
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
  },
);
