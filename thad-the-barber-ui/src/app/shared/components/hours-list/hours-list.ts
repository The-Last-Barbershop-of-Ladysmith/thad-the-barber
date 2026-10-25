import { ChangeDetectionStrategy, Component, InputSignal, Signal, inject, input } from '@angular/core';
import { HoursRow } from '../../../core/models/shop/hours-row.model';
import { ShopHoursService } from '../../../core/services/shop-hours.service';

export type HoursListVariant = 'table' | 'stacked' | 'compact';

/**
 * Opening hours in the three shapes the wireframe uses:
 * - `table`:   ruled rows, full day names and times (schedule section)
 * - `stacked`: "Saturday · 10 AM – 7 PM" lines (visit section)
 * - `compact`: short labels in the footer
 */
@Component({
  selector: 'app-hours-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hours-list.html',
  styleUrl: './hours-list.scss',
})
export class HoursList {
  readonly variant: InputSignal<HoursListVariant> = input<HoursListVariant>('table');
  protected readonly shopHoursEntries: Signal<HoursRow[]> = inject(ShopHoursService).businessHours;
}
