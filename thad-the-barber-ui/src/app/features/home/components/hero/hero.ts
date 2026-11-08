import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import { OpenStatus } from '../../../shop/models/open-status.model';
import { ShopHoursService } from '../../../shop/services/shop-hours.service';
import { shopFeature } from '../../../shop/state/shop.feature';
import { ReviewRating } from '../../models/home.models';
import { NextTimeSlot } from '../../models/next-time-slot.model';
import { homeFeature } from '../../state/home.feature';

@Component({
  selector: 'app-hero',
  imports: [
    RouterLink,
    ButtonModule,
    SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly openStatus: Signal<OpenStatus | null> = inject(ShopHoursService).currentOpenStatus;
  protected readonly isShopLoading: Signal<boolean> = this.store.selectSignal(shopFeature.selectIsLoading);
  protected readonly areFactsLoading: Signal<boolean> =
    this.store.selectSignal(homeFeature.selectAreHeroFactsLoading);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly rating: Signal<ReviewRating | null> = this.store.selectSignal(homeFeature.selectRating);
  protected readonly nextTimeSlots: Signal<NextTimeSlot[]> = this.store.selectSignal(homeFeature.selectNextTimeSlots);
}
