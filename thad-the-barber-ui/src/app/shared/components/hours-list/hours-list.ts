import { ChangeDetectionStrategy, Component, type InputSignal, inject, input } from '@angular/core';
import { type HoursRow } from '../../../core/models/shop.models';
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
  protected readonly rows: HoursRow[] = inject(ShopHoursService).rows;
}
