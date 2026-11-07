import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_ANNOUNCEMENT } from '../../../testing/test-announcement';
import { Announcement } from '../../features/announcements/models/announcement.model';
import * as AnnouncementsActions from '../../features/announcements/state/announcements.actions';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { AnnouncementStrip } from './announcement-strip';

describe(
  'AnnouncementStrip',
  (): void => {
    const changeIntervalMs: number = 6000;
    const threeAnnouncements: Announcement[] = [
      announcement('Older special', '2026-10-02'),
      announcement('Newest special', '2026-10-12'),
      announcement('Middle special', '2026-10-08'),
    ];

    function announcement(title: string, startDate: string): Announcement {
      return {
        ...TEST_ANNOUNCEMENT,
        title,
        startDate,
      };
    }

    function render(announcements: Announcement[]): ComponentFixture<AnnouncementStrip> {
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
      const fixture: ComponentFixture<AnnouncementStrip> = TestBed.createComponent(AnnouncementStrip);
      fixture.detectChanges();
      return fixture;
    }

    function hostOf(fixture: ComponentFixture<AnnouncementStrip>): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    function shownTitle(fixture: ComponentFixture<AnnouncementStrip>): string {
      return hostOf(fixture).querySelector('.item.is-shown .title')?.textContent.trim() ?? '';
    }

    function waitOneInterval(fixture: ComponentFixture<AnnouncementStrip>): void {
      vi.advanceTimersByTime(changeIntervalMs);
      fixture.detectChanges();
    }

    function click(fixture: ComponentFixture<AnnouncementStrip>, testId: string): void {
      hostOf(fixture).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
      fixture.detectChanges();
    }

    beforeEach((): void => {
      vi.useFakeTimers({
        now: new Date(
          2026,
          9,
          15,
          12,
        ),
      });
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'starts on the newest active announcement, keeping the others stacked and hidden from assistive tech',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render([
          ...threeAnnouncements,
          {
            ...announcement('Ended but newer', '2026-10-14'),
            endDate: '2026-10-14',
          },
        ]);
        const items: HTMLElement[] = Array.from(hostOf(fixture).querySelectorAll<HTMLElement>('.item'));

        expect(items.map((item: HTMLElement): string => item.querySelector('.title')?.textContent.trim() ?? '')).toEqual([
          'Newest special',
          'Middle special',
          'Older special',
        ]);
        expect(shownTitle(fixture)).toBe('Newest special');
        expect(items.map((item: HTMLElement): string | null => item.getAttribute('aria-hidden'))).toEqual([
          null,
          'true',
          'true',
        ]);
        expect(items.map((item: HTMLElement): boolean => item.hasAttribute('inert'))).toEqual([
          false,
          true,
          true,
        ]);
      },
    );

    it(
      'moves to the next announcement each interval, wraps to the first, and marks the one that left',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);

        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Middle special');
        expect(hostOf(fixture).querySelector('.item.is-leaving .title')?.textContent.trim()).toBe('Newest special');
        waitOneInterval(fixture);
        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Newest special');
      },
    );

    it(
      'gives each announcement its own link to the announcements section of the home page, named for it',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);
        const details: () => HTMLAnchorElement | null = (): HTMLAnchorElement | null =>
          hostOf(fixture).querySelector('.item.is-shown a');

        expect(details()?.getAttribute('href')).toBe('/#announcements');
        expect(details()?.getAttribute('aria-label')).toBe('Details about: Newest special');
        waitOneInterval(fixture);
        expect(details()?.getAttribute('aria-label')).toBe('Details about: Middle special');
      },
    );

    it(
      'stops cycling when paused and carries on when resumed',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);
        const pauseLabel: () => string | null | undefined = (): string | null | undefined =>
          hostOf(fixture).querySelector('[data-testid="announcement-strip-pause"]')?.getAttribute('aria-label');

        expect(pauseLabel()).toBe('Pause announcements');
        click(fixture, 'announcement-strip-pause');
        expect(pauseLabel()).toBe('Resume announcements');
        waitOneInterval(fixture);
        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Newest special');

        click(fixture, 'announcement-strip-pause');
        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Middle special');
      },
    );

    it(
      'stays on the same announcement while the pointer is over the strip',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);
        const strip: DebugElement = fixture.debugElement.query(By.css('.strip'));

        strip.triggerEventHandler('pointerenter');
        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Newest special');

        strip.triggerEventHandler('pointerleave');
        waitOneInterval(fixture);
        expect(shownTitle(fixture)).toBe('Middle special');
      },
    );

    it(
      'removes the strip when closed',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);

        click(fixture, 'announcement-strip-close');

        expect(hostOf(fixture).querySelector('[data-testid="announcement-strip"]')).toBeNull();
      },
    );

    it(
      'has no pause button and never changes with a single announcement, which can still be closed',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render([announcement('Only special', '2026-10-12')]);

        waitOneInterval(fixture);

        expect(shownTitle(fixture)).toBe('Only special');
        expect(hostOf(fixture).querySelector('[data-testid="announcement-strip-pause"]')).toBeNull();
        expect(hostOf(fixture).querySelector('[data-testid="announcement-strip-close"]')).not.toBeNull();
      },
    );

    it(
      'renders nothing when no announcement is active',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render([
          {
            ...TEST_ANNOUNCEMENT,
            endDate: '2026-10-14',
          },
        ]);

        expect(hostOf(fixture).querySelector('[data-testid="announcement-strip"]')).toBeNull();
      },
    );

    it(
      'is not a live region',
      (): void => {
        const fixture: ComponentFixture<AnnouncementStrip> = render(threeAnnouncements);

        expect(hostOf(fixture).querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
      },
    );
  },
);
