import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { type ShopInfo } from '../../../../core/models/shop.models';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SHOP_INFO } from '../../../../core/config/shop-info';
import { HoursList } from '../../../../shared/components/hours-list/hours-list';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';

/** Map embed plus location, hours and phone details. */
@Component({
  selector: 'app-visit',
  imports: [
    ButtonModule,
    CardModule,
    HoursList,
    SectionHeading,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visit.html',
  styleUrl: './visit.scss',
})
export class Visit {
  protected readonly shop: ShopInfo = SHOP_INFO;
  // Constant, first-party URL from config, so trusting it as a resource URL is safe.
  protected readonly mapUrl: SafeResourceUrl = inject(DomSanitizer)
    .bypassSecurityTrustResourceUrl(SHOP_INFO.location.mapEmbedUrl);
}
