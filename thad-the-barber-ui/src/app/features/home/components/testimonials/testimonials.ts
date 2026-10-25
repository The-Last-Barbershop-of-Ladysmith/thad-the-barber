import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { ShopContent } from '../../../../core/models/shop-content.model';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { RatingModule } from 'primeng/rating';
import { SHOP_CONTENT } from '../../../../core/config/shop-info';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { Testimonial } from '../../models/home.models';

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
  readonly testimonials: InputSignal<Testimonial[]> = input.required<Testimonial[]>();
  protected readonly reviews: ShopContent['reviews'] = SHOP_CONTENT.reviews;
}
