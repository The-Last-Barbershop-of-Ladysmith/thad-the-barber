import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { LinkKind } from '../../shared/models/link.models';
import { NavItem } from '../../shared/models/nav-item.model';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { HoursListVariant } from '../../features/shop/models/hours-list-variant.model';
import { ShopAddress } from '../../features/shop/models/shop-address.model';
import { SocialLink } from '../../features/shop/models/social-link.model';
import { homeFeature } from '../../features/home/state/home.feature';
import { HoursList } from '../../features/shop/components/hours-list/hours-list';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { FOOTER_BOOKINGS_COLUMN } from './config/footer-bookings-column';
import { FooterColumn } from './models/footer-column.model';
import { FooterLink } from './models/footer-link.model';

@Component({
  selector: 'app-footer',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    HoursList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly linkKinds: typeof LinkKind = LinkKind;
  protected readonly hoursVariant: HoursListVariant = HoursListVariant.Compact;
  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  protected readonly year: number = new Date().getFullYear();

  private readonly sections: Signal<readonly NavItem[]> = this.store.selectSignal(homeFeature.selectHomeSections);
  private readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  private readonly social: Signal<SocialLink[]> = this.store.selectSignal(shopFeature.selectSocialLinks);

  protected readonly leadingColumns: Signal<FooterColumn[]> = computed(
    (): FooterColumn[] => [this.toSiteColumn(this.sections()), FOOTER_BOOKINGS_COLUMN],
  );
  protected readonly trailingColumns: Signal<FooterColumn[]> = computed(
    (): FooterColumn[] => [this.toContactColumn(this.phone()), this.toFollowColumn(this.social())]
      .filter((column: FooterColumn): boolean => column.links.length > 0),
  );

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private toSiteColumn(sections: readonly NavItem[]): FooterColumn {
    return {
      heading: 'Site',
      isSplit: true,
      links: sections.map((section: NavItem): FooterLink => ({
        label: section.label,
        url: '/',
        fragment: section.fragment,
        kind: LinkKind.Internal,
      })),
    };
  }

  private toContactColumn(phone: PhoneLinks): FooterColumn {
    return {
      heading: 'Contact',
      isSplit: false,
      links: [
        {
          label: phone.display,
          url: phone.tel,
          kind: LinkKind.Device,
        },
        {
          label: 'Text a question',
          url: phone.sms,
          kind: LinkKind.Device,
        },
      ],
    };
  }

  private toFollowColumn(social: SocialLink[]): FooterColumn {
    return {
      heading: 'Follow',
      isSplit: false,
      links: social.map((link: SocialLink): FooterLink => ({
        label: link.label,
        url: link.href,
        kind: LinkKind.External,
      })),
    };
  }
}
