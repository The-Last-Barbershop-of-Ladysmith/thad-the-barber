import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ShopContent } from '../../../../core/models/shop-content.model';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { RatingModule } from 'primeng/rating';
import { SHOP_CONTENT } from '../../../../core/config/shop-info';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { AppState } from '../../../../store/app.state';
import { Testimonial } from '../../models/home.models';
import { homeFeature } from '../../state/home.feature';

@Component({
  selector: 'app-testimonials',
  imports: [
    FormsModule,
    CardModule,
    RatingModule,
    SectionHeading,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly testimonials: Signal<Testimonial[]> = this.store.selectSignal(homeFeature.selectTestimonials);
  protected readonly reviews: ShopContent['reviews'] = SHOP_CONTENT.reviews;
}
