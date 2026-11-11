import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { NavItem } from '../../../../shared/models/nav-item.model';
import { AppState } from '../../../../store/app.state';
import { SCROLL_RAIL_CURRENT_LINE } from '../../config/scroll-rail';
import { announcementsFeature } from '../../../announcements/state/announcements.feature';
import { toCurrentIndex, toShownRailSections } from '../../utils/scroll-rail.utils';

/** A thin comb on the right edge: one tooth per home section, the current one longer, each a link to its section. */
@Component({
  selector: 'app-scroll-rail',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scroll-rail.html',
  styleUrl: './scroll-rail.scss',
})
export class ScrollRail {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly shownHomeSections: Signal<readonly NavItem[]> =
    this.store.selectSignal(announcementsFeature.selectHomeSections);
  protected readonly sections: Signal<NavItem[]> = computed((): NavItem[] =>
    toShownRailSections(this.shownHomeSections()));

  protected readonly currentIndex: WritableSignal<number> = signal<number>(0);

  private frameRequest: number = 0;

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      window.addEventListener(
        'scroll',
        this.requestMeasure,
        { passive: true },
      );
      window.addEventListener('resize', this.requestMeasure);
      destroyRef.onDestroy((): void => {
        window.removeEventListener('scroll', this.requestMeasure);
        window.removeEventListener('resize', this.requestMeasure);
        cancelAnimationFrame(this.frameRequest);
      });
    });
    afterRenderEffect((): void => {
      this.sections();
      this.measure();
    });
  }

  private readonly requestMeasure: () => void = (): void => {
    if (this.frameRequest === 0) {
      this.frameRequest = requestAnimationFrame(this.measure);
    }
  };

  private readonly measure: () => void = (): void => {
    this.frameRequest = 0;
    this.currentIndex.set(this.measureCurrentIndex());
  };

  private measureCurrentIndex(): number {
    const maxScroll: number = document.documentElement.scrollHeight - window.innerHeight;
    const tops: number[] = this.sections().map((section: NavItem): number => {
      // Component hosts are inline, so measure their first element (the section itself).
      const host: HTMLElement | null = document.getElementById(section.fragment);
      const box: Element | null = host?.firstElementChild ?? host;
      if (!box) {
        return Number.POSITIVE_INFINITY;
      }
      // Like the backdrop, a section below the last scroll position counts as reached once the page ends.
      return Math.min(box.getBoundingClientRect().top + window.scrollY, maxScroll) - window.scrollY;
    });
    return toCurrentIndex(
      tops,
      window.innerHeight,
      SCROLL_RAIL_CURRENT_LINE,
    );
  }
}
