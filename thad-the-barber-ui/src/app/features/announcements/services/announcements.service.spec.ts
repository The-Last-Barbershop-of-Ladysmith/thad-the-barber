import { HttpContext, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ANONYMOUS_REQUEST } from '../../../core/interceptors/anonymous-request.token';
import { ButtonVariant } from '../../../shared/models/button.models';
import { LinkKind } from '../../../shared/models/link.models';
import { AnnouncementDto } from '../dtos/announcement.dto';
import { Announcement } from '../models/announcement.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';
import { ANNOUNCEMENTS_URL, AnnouncementsService } from './announcements.service';

describe(
  'AnnouncementsService',
  (): void => {
    const plainAnnouncement: AnnouncementDto = {
      title: 'Closed today',
      bodyHtml: '',
      startDate: '2026-11-26',
      endDate: '2026-11-26',
      image: null,
      buttons: [],
    };

    function request(): {
      result: () => Announcement[] | undefined; failed: () => boolean; http: TestRequest;
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
        http: TestBed.inject(HttpTestingController).expectOne(ANNOUNCEMENTS_URL),
      };
    }

    function announcementsFrom(announcements: AnnouncementDto[]): Announcement[] | undefined {
      const pending: ReturnType<typeof request> = request();
      pending.http.flush(announcements);
      return pending.result();
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'keeps the API order and fields, and gives each button its link kind',
      (): void => {
        const announcement: AnnouncementDto = {
          title: 'Ünïcode & émoji ✂️ title',
          bodyHtml: '<p>Walk-ins <strong>welcome</strong></p>',
          startDate: '2026-02-28',
          endDate: '2026-03-01',
          image: {
            src: 'https://media.example.test/announcements/chair%20photo%20%231.webp',
            alt: 'An empty chair',
            position: AnnouncementImagePosition.Left,
          },
          buttons: [
            {
              label: 'Book',
              url: '/book',
              variant: ButtonVariant.Primary,
            },
            {
              label: 'Call',
              url: 'tel:+15550100000',
              variant: ButtonVariant.Text,
            },
          ],
        };

        const announcements: Announcement[] | undefined = announcementsFrom([announcement, plainAnnouncement]);

        expect(announcements).toEqual([
          {
            ...announcement,
            buttons: [
              {
                label: 'Book',
                url: '/book',
                kind: LinkKind.Internal,
                variant: ButtonVariant.Primary,
              },
              {
                label: 'Call',
                url: 'tel:+15550100000',
                kind: LinkKind.Device,
                variant: ButtonVariant.Text,
              },
            ],
          },
          plainAnnouncement,
        ]);
      },
    );

    it(
      'drops a button whose link the page cannot open',
      (): void => {
        const announcements: Announcement[] | undefined = announcementsFrom([
          {
            ...plainAnnouncement,
            buttons: [
              {
                label: 'Script',
                url: 'javascript:alert(1)',
                variant: ButtonVariant.Outlined,
              },
              {
                label: 'Menu',
                url: 'https://example.test/menu',
                variant: ButtonVariant.Outlined,
              },
            ],
          },
        ]);

        expect(announcements?.[0]?.buttons.map((button: { label: string; }): string => button.label)).toEqual(['Menu']);
      },
    );

    it(
      'returns no announcements for an empty list',
      (): void => {
        expect(announcementsFrom([])).toEqual([]);
      },
    );

    it(
      'asks anonymously, so no session token is requested',
      (): void => {
        const pending: ReturnType<typeof request> = request();
        const context: HttpContext = pending.http.request.context;

        pending.http.flush([]);

        expect(context.get(ANONYMOUS_REQUEST)).toBe(true);
      },
    );

    it(
      'fails when the API does, so the section hides',
      (): void => {
        const pending: ReturnType<typeof request> = request();

        pending.http.flush('down', { status: 503, statusText: 'Service Unavailable' });

        expect(pending.failed()).toBe(true);
      },
    );
  },
);
