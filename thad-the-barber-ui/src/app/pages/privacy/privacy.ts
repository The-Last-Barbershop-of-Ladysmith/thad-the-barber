import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TitledPage } from '../../shared/components/titled-page/titled-page';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { PrivacyPartKind } from './models/privacy-part-kind.model';
import { PrivacySection } from './models/privacy-section.model';
import { PRIVACY_SECTIONS } from './privacy-sections';

/** A section counts as the one being read once its top has scrolled this far up, just under the fixed header. */
const ACTIVE_SECTION_OFFSET_PX: number = 160;

@Component({
  selector: 'app-privacy',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TitledPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class Privacy {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly sections: readonly PrivacySection[] = PRIVACY_SECTIONS;
  protected readonly partKinds: typeof PrivacyPartKind = PrivacyPartKind;
  protected readonly activeSection: WritableSignal<string> = signal(PRIVACY_SECTIONS[0]?.fragment ?? '');

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      const onScroll: () => void = (): void => {
        this.activeSection.set(this.findActiveSection());
      };
      window.addEventListener(
        'scroll',
        onScroll,
        { passive: true },
      );
      onScroll();
      destroyRef.onDestroy((): void => {
        window.removeEventListener('scroll', onScroll);
      });
    });
  }

  private findActiveSection(): string {
    const reached: PrivacySection[] = this.sections.filter((section: PrivacySection): boolean => {
      const top: number | undefined = document.getElementById(section.fragment)?.getBoundingClientRect().top;
      return top !== undefined && top <= ACTIVE_SECTION_OFFSET_PX;
    });
    return reached.at(-1)?.fragment ?? this.sections[0]?.fragment ?? '';
  }
}
