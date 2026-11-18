import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../testing/axe';
import { AppState } from '../../../../store/app.state';
import { AdminAnnouncementDto } from '../../announcements/dtos/admin-announcement.dto';
import { AdminAnnouncementStatus } from '../../announcements/models/admin-announcement-status.model';
import { AdminGalleryPhotoDto } from '../../gallery/dtos/admin-gallery-photo.dto';
import { AdminShopInfoDto } from '../../shop/dtos/admin-shop-info.dto';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';
import { Overview } from './overview';

function announcement(
  title: string,
  status: AdminAnnouncementStatus,
  endDate: string,
): AdminAnnouncementDto {
  return {
    title,
    bodyHtml: '',
    startDate: '2026-11-01',
    endDate,
    image: null,
    buttons: [],
    status,
  };
}

function photo(fileName: string): AdminGalleryPhotoDto {
  return {
    fileName,
    src: `https://example.test/gallery/${fileName}`,
    altText: 'A made-up photo',
    uploadedAt: '2026-10-05T10:00:00Z',
  };
}

describe(
  'Overview',
  (): void => {
    let fixture: ComponentFixture<Overview>;
    let http: HttpTestingController;

    function host(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    function text(testId: string): string | null {
      return host().querySelector(`[data-testid="${testId}"]`)?.textContent.replaceAll(/\s+/g, ' ').trim() ?? null;
    }

    function answer(
      endsWith: string,
      body: object,
    ): void {
      http.expectOne((request: { url: string; }): boolean => request.url.endsWith(endsWith)).flush(body);
    }

    function fail(endsWith: string): void {
      http.expectOne((request: { url: string; }): boolean => request.url.endsWith(endsWith))
        .flush(null, {
          status: 503,
          statusText: 'Service Unavailable',
        });
    }

    async function settle(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideStore({ [adminFeature.name]: adminFeature.reducer }),
        ],
      });
      TestBed.inject<Store<AppState>>(Store).dispatch(AdminActions.AdminSignInRequestSuccess({
        session: {
          email: 'owner@example.com',
          name: 'Q. Testperson',
          expiresAt: '2031-02-28T12:30:00Z',
        },
      }));
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(Overview);
      fixture.detectChanges();
    });

    it(
      'welcomes the admin by first name under one page heading, with today’s date',
      (): void => {
        expect(host().querySelectorAll('h1')).toHaveLength(1);
        expect(host().querySelector('h1')?.textContent).toBe('Welcome back, Q..');
        expect(text('overview-date')).not.toBeNull();
      },
    );

    it(
      'counts the announcements by status and says which one ends next',
      async (): Promise<void> => {
        answer('/admin/announcements', [
          announcement(
            'Holiday hours',
            AdminAnnouncementStatus.Showing,
            '2026-12-26',
          ),
          announcement(
            'Beard trims',
            AdminAnnouncementStatus.Showing,
            '2026-12-01',
          ),
          announcement(
            'Thanksgiving week',
            AdminAnnouncementStatus.Scheduled,
            '2026-11-30',
          ),
          announcement(
            'Summer days',
            AdminAnnouncementStatus.Ended,
            '2026-08-31',
          ),
        ]);
        answer('/admin/gallery', []);
        answer('/admin/shop', {
          notice: null,
          isNoticeShown: false,
          squareNotice: null,
        } satisfies AdminShopInfoDto);
        await settle();

        const counts: string[] = Array.from(host().querySelectorAll('[data-testid="announcement-counts"] .pill'))
          .map((pill: Element): string => pill.textContent.trim());
        expect(counts).toEqual([
          '2 showing',
          '1 scheduled',
          '1 ended',
        ]);
        expect(host().textContent).toContain('Next to end: Beard trims, Dec 1.');
      },
    );

    it(
      'shows the first photos with how many more there are',
      async (): Promise<void> => {
        answer('/admin/announcements', []);
        answer('/admin/gallery', [
          photo('one.jpg'),
          photo('two.jpg'),
          photo('three.jpg'),
          photo('four.jpg'),
          photo('five.jpg'),
        ]);
        answer('/admin/shop', {
          notice: null,
          isNoticeShown: false,
          squareNotice: null,
        } satisfies AdminShopInfoDto);
        await settle();

        expect(host().querySelectorAll('[data-testid="gallery-thumbs"] img')).toHaveLength(3);
        expect(host().querySelector('.thumb.more')?.textContent).toBe('+2');
        expect(host().textContent).toContain('5 photos on the site');
      },
    );

    it(
      'shows the saved notice, or Square’s when none is saved, and whether the booking page shows it',
      async (): Promise<void> => {
        answer('/admin/announcements', []);
        answer('/admin/gallery', []);
        answer('/admin/shop', {
          notice: null,
          isNoticeShown: true,
          squareNotice: 'From Square: park behind the shop.',
        } satisfies AdminShopInfoDto);
        await settle();

        expect(text('overview-notice')).toBe('From Square: park behind the shop.');
        expect(text('overview-notice-state')).toBe('Showing on the booking page');
      },
    );

    it(
      'says a list could not be loaded without hiding the others',
      async (): Promise<void> => {
        fail('/admin/announcements');
        answer('/admin/gallery', [photo('one.jpg')]);
        answer('/admin/shop', {
          notice: 'Closed Monday.',
          isNoticeShown: false,
          squareNotice: null,
        } satisfies AdminShopInfoDto);
        await settle();

        expect(text('announcements-unavailable')).not.toBeNull();
        expect(text('gallery-unavailable')).toBeNull();
        expect(text('overview-notice-state')).toBe('Hidden from the booking page');
        http.verify();
      },
    );

    it(
      'has no accessibility violations once everything has loaded',
      async (): Promise<void> => {
        answer('/admin/announcements', [
          announcement(
            'Holiday hours',
            AdminAnnouncementStatus.Showing,
            '2026-12-26',
          ),
        ]);
        answer('/admin/gallery', [photo('one.jpg')]);
        answer('/admin/shop', {
          notice: 'Closed Monday.',
          isNoticeShown: true,
          squareNotice: null,
        } satisfies AdminShopInfoDto);
        await settle();

        await expectNoAxeViolations(host());
      },
    );
  },
);
