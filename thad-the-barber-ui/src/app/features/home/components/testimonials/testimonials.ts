import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  input,
} from '@angular/core';
import { ShopInfo } from '../../../../core/models/shop.models';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { RatingModule } from 'primeng/rating';
import { SHOP_INFO } from '../../../../core/config/shop-info';
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
  protected readonly reviews: ShopInfo['reviews'] = SHOP_INFO.reviews;
}
