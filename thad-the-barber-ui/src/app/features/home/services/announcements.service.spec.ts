import { provideHttpClient } from '@angular/common/http';
import { ButtonVariant } from '../../../shared/models/button.models';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Announcement, AnnouncementImagePosition } from '../models/home.models';
import { AnnouncementsService } from './announcements.service';
import { LinkKind } from '../../../shared/models/link.models';

describe(
  'AnnouncementsService',
  (): void => {
    const contentUrl: string = `${environment.mediaBaseUrl}/content/announcements.json`;

    function request(): {
      result: () => Announcement[] | undefined; failed: () => boolean; request: TestRequest;
    } {
      let announcements: Announcement[] | undefined;
      let hasFailed: boolean = false;
      TestBed.inject(AnnouncementsService).getAnnouncements().subscribe({
        next: (result: Announcement[]): void => {
          announcements = result;
        },
        error: (): void => {
          hasFailed = true;
        },
      });
      return {
        result: (): Announcement[] | undefined => announcements,
        failed: (): boolean => hasFailed,
        request: TestBed.inject(HttpTestingController).expectOne(contentUrl),
      };
    }

    function announcementsFrom(content: object): Announcement[] | undefined {
      const pending: ReturnType<typeof request> = request();
      pending.request.flush(content);
      return pending.result();
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'revalidates the file on every load, since portal uploads carry no Cache-Control',
      (): void => {
        const pending: ReturnType<typeof request> = request();

        expect(pending.request.request.cache).toBe('no-cache');
        pending.request.flush({ items: [] });
      },
    );

    it(
      'reads a full announcement, building the image URL from mediaBaseUrl',
      (): void => {
        const announcements: Announcement[] | undefined = announcementsFrom({
          items: [
            {
              title: '  Ünïcode & émoji ✂️ title  ',
              bodyHtml: '<p>Walk-ins <strong>welcome</strong></p>',
              startDate: '2026-02-28',
              endDate: '2026-03-01',
              image: {
                fileName: 'chair photo #1.webp',
                altText: 'An empty chair',
                position: 'left',
              },
              buttons: [
                {
                  label: 'Book',
                  url: '/book',
                  kind: LinkKind.Internal,
                  variant: 'primary',
                },
              ],
            },
          ],
        });

        expect(announcements).toEqual([
          {
            title: 'Ünïcode & émoji ✂️ title',
            bodyHtml: '<p>Walk-ins <strong>welcome</strong></p>',
            startDate: '2026-02-28',
            endDate: '2026-03-01',
            image: {
              src: `${environment.mediaBaseUrl}/announcements/chair%20photo%20%231.webp`,
              alt: 'An empty chair',
              position: AnnouncementImagePosition.Left,
            },
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
      },
    );

    it(
      'fills in a missing body, alt text and position, and allows a one-day announcement',
      (): void => {
        const announcements: Announcement[] | undefined = announcementsFrom({
          items: [
            {
              title: 'Closed today',
              startDate: '2026-11-26',
              endDate: '2026-11-26',
              image: { fileName: 'closed.png', position: 'top' },
            },
          ],
        });

        expect(announcements).toEqual([
          {
            title: 'Closed today',
            bodyHtml: '',
            startDate: '2026-11-26',
            endDate: '2026-11-26',
            image: {
              src: `${environment.mediaBaseUrl}/announcements/closed.png`,
              alt: '',
              position: AnnouncementImagePosition.Right,
            },
            buttons: [],
          },
        ]);
      },
    );

    it(
      'skips items without a title or with missing, impossible or reversed dates',
      (): void => {
        const valid: Record<string, string> = {
          title: 'Kept',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        };

        const announcements: Announcement[] | undefined = announcementsFrom({
          items: [
            { ...valid, title: '   ' },
            { ...valid, title: 42 },
            { ...valid, startDate: undefined },
            { ...valid, endDate: '2026-02-30' },
            { ...valid, startDate: '10/01/2026' },
            { ...valid, startDate: '2026-11-01' },
            'not an object',
            null,
            valid,
          ],
        });

        expect(announcements?.map((announcement: Announcement): string => announcement.title)).toEqual(['Kept']);
      },
    );

    it(
      'keeps very long text, since the length limits belong to the admin portal',
      (): void => {
        const longTitle: string = 'T'.repeat(200);
        const longBody: string = `<p>${'b'.repeat(8000)}</p>`;

        const announcements: Announcement[] | undefined = announcementsFrom({
          items: [
            {
              title: longTitle,
              bodyHtml: longBody,
              startDate: '2026-10-01',
              endDate: '2026-10-31',
            },
          ],
        });

        expect(announcements?.[0]?.title).toBe(longTitle);
        expect(announcements?.[0]?.bodyHtml).toBe(longBody);
      },
    );

    it(
      'drops buttons with no label or an unsupported link, and outlines unknown variants',
      (): void => {
        const announcements: Announcement[] | undefined = announcementsFrom({
          items: [
            {
              title: 'Buttons',
              startDate: '2026-10-01',
              endDate: '2026-10-31',
              buttons: [
                {
                  label: 'Call',
                  url: 'tel:+15550100000',
                  variant: 'glowing',
                },
                {
                  label: 'Menu',
                  url: 'https://example.test/menu',
                  variant: 'text',
                },
                { label: 'Write', url: 'mailto:owner@example.test' },
                { label: '', url: '/book' },
                { label: 'Insecure', url: 'http://example.test' },
                { label: 'Script', url: 'javascript:alert(1)' },
                { label: 'Elsewhere', url: '//other.test' },
              ],
            },
          ],
        });

        expect(announcements?.[0]?.buttons).toEqual([
          {
            label: 'Call',
            url: 'tel:+15550100000',
            kind: LinkKind.Device,
            variant: ButtonVariant.Outlined,
          },
          {
            label: 'Menu',
            url: 'https://example.test/menu',
            kind: LinkKind.External,
            variant: ButtonVariant.Text,
          },
          {
            label: 'Write',
            url: 'mailto:owner@example.test',
            kind: LinkKind.Device,
            variant: ButtonVariant.Outlined,
          },
        ]);
      },
    );

    it(
      'fails when the file has no items list, so the section hides',
      (): void => {
        const pending: ReturnType<typeof request> = request();
        pending.request.flush([
          {
            title: 'A bare array',
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        ]);

        expect(pending.failed()).toBe(true);
      },
    );
  },
);
