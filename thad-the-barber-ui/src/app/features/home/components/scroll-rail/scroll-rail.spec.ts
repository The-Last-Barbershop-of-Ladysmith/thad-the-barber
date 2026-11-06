import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { AppState } from '../../../../store/app.state';
import * as AnnouncementsActions from '../../../announcements/state/announcements.actions';
import { announcementsFeature } from '../../../announcements/state/announcements.feature';
import { homeFeature } from '../../state/home.feature';
import { ScrollRail } from './scroll-rail';

describe(
  'ScrollRail',
  (): void => {
    function render(setUp: (store: Store<AppState>) => void): HTMLElement {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideStore({
            [homeFeature.name]: homeFeature.reducer,
            [announcementsFeature.name]: announcementsFeature.reducer,
          }),
        ],
      });
      setUp(TestBed.inject<Store<AppState>>(Store));
      const fixture: ComponentFixture<ScrollRail> = TestBed.createComponent(ScrollRail);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function toTeethLabels(page: HTMLElement): string[] {
      return Array.from(page.querySelectorAll('[data-testid="scroll-rail-tooth"]'))
        .map((tooth: Element): string => tooth.getAttribute('aria-label') ?? '');
    }

    it(
      'links a tooth to each section, marking the first as current before any scrolling',
      (): void => {
        const page: HTMLElement = render((): void => undefined);

        const currentTeeth: Element[] = Array.from(page.querySelectorAll('[aria-current="true"]'));

        expect(toTeethLabels(page)).toContain('Next open times');
        expect(currentTeeth.length).toBe(1);
        expect(currentTeeth[0]?.getAttribute('aria-label')).toBe('Top');
      },
    );

    it(
      'has no announcements tooth when the announcements load empty',
      (): void => {
        const page: HTMLElement = render((store: Store<AppState>): void => {
          store.dispatch(AnnouncementsActions.AnnouncementsRequestSuccess({ announcements: [] }));
        });

        const labels: string[] = toTeethLabels(page);

        expect(labels).not.toContain('Announcements');
        expect(labels).toContain('Schedule');
      },
    );
  },
);
