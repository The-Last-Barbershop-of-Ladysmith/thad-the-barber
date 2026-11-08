import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { Rotation } from '../../../../shared/models/rotation.model';
import { createRotation } from '../../../../shared/utils/rotation.utils';
import { AppState } from '../../../../store/app.state';
import { ReviewRating, Testimonial } from '../../models/home.models';
import { homeFeature } from '../../state/home.feature';

/**
 * One review at a time, crossfading with a soft rise on a slow timer. Every review stays in the page, stacked, so the
 * section is as tall as the longest quote and never jumps; the others are hidden from assistive tech.
 */
@Component({
  selector: 'app-testimonials',
  imports: [
    FormsModule,
    ButtonModule,
    RatingModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly testimonials: Signal<Testimonial[]> = this.store.selectSignal(homeFeature.selectTestimonials);
  protected readonly rating: Signal<ReviewRating | null> = this.store.selectSignal(homeFeature.selectRating);
  protected readonly summaryStars: Signal<number> = computed(
    (): number => Math.round((this.rating()?.score ?? 0) * 2) / 2,
  );
  protected readonly rotation: Rotation = createRotation({
    count: computed((): number => this.testimonials().length),
    intervalMs: 7000,
  });
}
