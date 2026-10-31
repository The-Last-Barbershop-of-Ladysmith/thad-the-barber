import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Backdrop } from '../../../../shared/components/backdrop/backdrop';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../dtos/booking-confirmation.dto';
import { bookingFeature } from '../../state/booking.feature';
import { toLongDateTime } from '../../utils/booking-time.utils';
import { toManagePath } from '../../utils/manage-link.utils';

/** One row of the list: where it opens and its time on the shop's clock. */
interface SavedBookingView {
  path: string;
  time: string;
}

/**
 * The bookings made on this device that haven't started, soonest first, each opening its manage page (BR-22). Bookings
 * made elsewhere are on Square's booking site, where the customer signs in with a texted code (#214 brings that here).
 */
@Component({
  selector: 'app-manage-bookings',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    Backdrop,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manage-bookings.html',
  styleUrl: './manage-bookings.scss',
})
export class ManageBookings {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly upcomingConfirmations: Signal<BookingConfirmation[]> =
    this.store.selectSignal(bookingFeature.selectUpcomingConfirmations);

  protected readonly bookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);

  /** Null until the shop has loaded, since every time shows on its clock. */
  protected readonly savedBookings: Signal<SavedBookingView[] | null> = computed((): SavedBookingView[] | null => {
    const timeZone: string | null = this.timeZone();
    if (!timeZone) {
      return null;
    }
    return this.upcomingConfirmations()
      .map((confirmation: BookingConfirmation): SavedBookingView => ({
        path: toManagePath(confirmation.id),
        time: toLongDateTime(timeZone, confirmation.startAt),
      }));
  });
}
