import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { HoursListVariant } from '../../../shop/models/hours-list-variant.model';
import { OpenStatus } from '../../../shop/models/open-status.model';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { ShopHoursService } from '../../../shop/services/shop-hours.service';
import { HoursList } from '../../../shop/components/hours-list/hours-list';

/** The hours section: the live open status beside every weekday's hours, on the shop's clock. */
@Component({
  selector: 'app-hours',
  imports: [
    SectionHeading,
    HoursList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hours.html',
  styleUrl: './hours.scss',
})
export class Hours {
  protected readonly hoursVariant: HoursListVariant = HoursListVariant.Table;
  protected readonly status: Signal<OpenStatus | null> = inject(ShopHoursService).currentOpenStatus;
}
