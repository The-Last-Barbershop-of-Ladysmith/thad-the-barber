import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { NextTimeSlot } from '../../models/next-time-slot.model';
import { homeFeature } from '../../state/home.feature';

/** "Grab a chair": the next open times, each a link that opens the booking page with that time picked. */
@Component({
  selector: 'app-next-times',
  imports: [RouterLink, SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './next-times.html',
  styleUrl: './next-times.scss',
})
export class NextTimes {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly nextTimeSlots: Signal<NextTimeSlot[]> = this.store.selectSignal(homeFeature.selectNextTimeSlots);
  protected readonly areNextTimesMissing: Signal<boolean> =
    this.store.selectSignal(homeFeature.selectAreNextTimesMissing);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly squareBookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);
}
