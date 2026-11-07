import { ChangeDetectionStrategy, Component, InputSignal, Signal, inject, input } from '@angular/core';
import { HoursListVariant } from '../../models/hours-list-variant.model';
import { HoursRow } from '../../models/hours-row.model';
import { ShopHoursService } from '../../services/shop-hours.service';

/**
 * Opening hours in the three shapes the wireframe uses:
 * - `table`:   one ruled row per weekday, today marked and closed days dimmed (schedule section)
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
  protected readonly HoursListVariant: typeof HoursListVariant = HoursListVariant;
  readonly variant: InputSignal<HoursListVariant> = input<HoursListVariant>(HoursListVariant.Table);
  private readonly shopHoursService: ShopHoursService = inject(ShopHoursService);
  protected readonly shopHoursEntries: Signal<HoursRow[]> = this.shopHoursService.businessHours;
  protected readonly weekHoursEntries: Signal<HoursRow[]> = this.shopHoursService.weekHours;
}
