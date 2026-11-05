import { ChangeDetectionStrategy, Component, InputSignal, Signal, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';

@Component({
  selector: 'app-appointment-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appointment-summary.html',
  styleUrl: './appointment-summary.scss',
})
export class AppointmentSummary {
  readonly dayLabel: InputSignal<string> = input.required<string>();
  readonly timeLabel: InputSignal<string> = input.required<string>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly addressLine: Signal<string | null> = this.store.selectSignal(shopFeature.selectAddressLine);
}
