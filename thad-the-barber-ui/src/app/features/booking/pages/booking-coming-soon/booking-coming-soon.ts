import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TitledPage } from '../../../../shared/components/titled-page/titled-page';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { DateStep } from '../../components/date-step/date-step';
import { DetailsStep } from '../../components/details-step/details-step';
import { TimeStep } from '../../components/time-step/time-step';
import { LeaveConfirmable } from '../../models/leave-confirmable.model';

/**
 * Stands in for the booking page while the site is coming soon (prod before launch): the details and consent wording
 * a customer will see, switched off, with the shop's phone and text for booking in the meantime. It makes no API call.
 */
@Component({
  selector: 'app-booking-coming-soon',
  imports: [
    ButtonModule,
    MessageModule,
    TitledPage,
    DateStep,
    TimeStep,
    DetailsStep,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-coming-soon.html',
})
export class BookingComingSoon implements LeaveConfirmable {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  // The booking route's leave guard asks every page it guards. Nothing here is sent or picked, so it never holds a
  // visitor back.
  readonly hasUnconfirmedPick: Signal<boolean> = signal(false).asReadonly();
  readonly isRescheduling: Signal<boolean> = signal(false).asReadonly();
  readonly isSubmitting: Signal<boolean> = signal(false).asReadonly();

  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly dateControl: FormControl<string | null> = new FormControl<string | null>({
    value: null,
    disabled: true,
  });
  protected readonly startAtControl: FormControl<string | null> = new FormControl<string | null>({
    value: null,
    disabled: true,
  });
  protected readonly nameControl: FormControl<string> = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  protected readonly phoneControl: FormControl<string> = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  protected readonly consentControl: FormControl<boolean> = new FormControl(
    { value: true, disabled: true },
    { nonNullable: true },
  );
  protected readonly marketingConsentControl: FormControl<boolean> = new FormControl(
    { value: false, disabled: true },
    { nonNullable: true },
  );
}
