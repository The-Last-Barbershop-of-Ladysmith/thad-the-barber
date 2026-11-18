import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InputSignal,
  Signal,
  WritableSignal,
  afterNextRender,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { shopFeature } from '../../../features/shop/state/shop.feature';
import { AppState } from '../../../store/app.state';
import { LegalPartKind } from '../../models/legal-part-kind.model';
import { LegalSection } from '../../models/legal-section.model';
import { PhoneLinks } from '../../models/phone-links.model';
import { TitledPage } from '../titled-page/titled-page';

/** A section counts as the one being read once its top has scrolled this far up, just under the fixed header. */
const ACTIVE_SECTION_OFFSET_PX: number = 160;

/**
 * A legal page (privacy policy, terms): its sections in a reading column with a contents list beside it, and the
 * shop's name and Square phone filled in where a section asks for them. `path` is the page's route and
 * `testIdPrefix` names its test ids (`<prefix>`, `<prefix>-toc`, `<prefix>-section-<fragment>`, `<prefix>-phone`).
 */
@Component({
  selector: 'app-legal-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TitledPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
})
export class LegalPage {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  readonly eyebrow: InputSignal<string> = input.required<string>();
  readonly heading: InputSignal<string> = input.required<string>();
  readonly lastUpdated: InputSignal<string> = input.required<string>();
  readonly path: InputSignal<string> = input.required<string>();
  readonly testIdPrefix: InputSignal<string> = input.required<string>();
  readonly sections: InputSignal<readonly LegalSection[]> = input.required<readonly LegalSection[]>();

  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly phone: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly partKinds: typeof LegalPartKind = LegalPartKind;
  protected readonly activeSection: WritableSignal<string> = linkedSignal(
    (): string => this.sections()[0]?.fragment ?? '',
  );

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
    const sections: readonly LegalSection[] = this.sections();
    const isAtPageEnd: boolean = window.scrollY > 0
      && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (isAtPageEnd) {
      return sections.at(-1)?.fragment ?? '';
    }
    const reached: LegalSection[] = sections.filter((section: LegalSection): boolean => {
      const top: number | undefined = document.getElementById(section.fragment)?.getBoundingClientRect().top;
      return top !== undefined && top <= ACTIVE_SECTION_OFFSET_PX;
    });
    return reached.at(-1)?.fragment ?? sections[0]?.fragment ?? '';
  }
}
