import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ShopContent } from '../../../../core/models/shop-content.model';
import { FormsModule } from '@angular/forms';
import { RatingModule } from 'primeng/rating';
import { SHOP_CONTENT } from '../../../../core/config/shop-info';
import { AppState } from '../../../../store/app.state';
import { Testimonial } from '../../models/home.models';
import { homeFeature } from '../../state/home.feature';

/**
 * One review at a time, crossfading with a soft rise on a slow timer. Every review stays in the page, stacked, so the
 * section is as tall as the longest quote and never jumps; the others are hidden from assistive tech.
 */
@Component({
  selector: 'app-testimonials',
  imports: [FormsModule, RatingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly changeIntervalMs: number = 7000;
  private isPaused: boolean = false;

  protected readonly testimonials: Signal<Testimonial[]> = this.store.selectSignal(homeFeature.selectTestimonials);
  protected readonly reviews: ShopContent['reviews'] = SHOP_CONTENT.reviews;

  protected readonly shownIndex: WritableSignal<number> = signal(0);
  protected readonly leavingIndex: Signal<number> = computed(
    (): number => (this.shownIndex() - 1 + this.testimonials().length) % this.testimonials().length,
  );

  constructor() {
    afterNextRender((): void => {
      const timerId: ReturnType<typeof setInterval> = setInterval((): void => {
        this.showNext();
      }, this.changeIntervalMs);
      this.destroyRef.onDestroy((): void => {
        clearInterval(timerId);
      });
    });
  }

  protected pause(): void {
    this.isPaused = true;
  }

  protected resume(): void {
    this.isPaused = false;
  }

  private showNext(): void {
    const isOnlyOne: boolean = this.testimonials().length < 2;
    if (document.hidden || this.isPaused || isOnlyOne) {
      return;
    }
    this.shownIndex.update((index: number): number => (index + 1) % this.testimonials().length);
  }
}
