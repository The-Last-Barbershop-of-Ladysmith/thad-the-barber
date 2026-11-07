import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { ButtonStyle, ButtonVariant } from '../../../../shared/models/button.models';
import { LinkKind } from '../../../../shared/models/link.models';
import { BUTTON_STYLES } from '../../../../shared/utils/button.utils';
import { linkKind } from '../../../../shared/utils/link.utils';
import { Announcement } from '../../models/announcement.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import * as AnnouncementsActions from '../../state/announcements.actions';
import { announcementsFeature } from '../../state/announcements.feature';
import { AppState } from '../../../../store/app.state';

/**
 * Slider (PrimeNG composable carousel; swipe, arrows and bars are built in) of today's announcements: the text, then
 * its image on the right on wide screens and below on phones, unless the announcement asks for it on the left.
 * Renders nothing without announcements (BR-32). Links to this site's own pages, in the body or on a button, go
 * through the Router.
 */
@Component({
  selector: 'app-announcements-carousel',
  imports: [
    DatePipe,
    DecimalPipe,
    ButtonModule,
    CarouselModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcements-carousel.html',
  styleUrl: './announcements-carousel.scss',
  host: { '(click)': 'followInternalLink($event)' },
})
export class AnnouncementsCarousel {
  private readonly router: Router = inject(Router);
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly announcements: Signal<Announcement[]> = this.store.selectSignal(
    announcementsFeature.selectActiveNewestFirst,
  );

  protected readonly linkKinds: typeof LinkKind = LinkKind;
  protected readonly imagePositions: typeof AnnouncementImagePosition = AnnouncementImagePosition;
  protected readonly buttonStyles: Readonly<Record<ButtonVariant, ButtonStyle>> = BUTTON_STYLES;
  private readonly jumpSettleMs: number = 1200;
  private reportedIndex: number = 0;
  private isJumping: boolean = false;
  private readonly storedShownIndex: Signal<number> = this.store.selectSignal(announcementsFeature.selectShownIndex);

  protected readonly shownIndex: Signal<number> = computed(
    (): number => Math.min(this.storedShownIndex(), this.announcements().length - 1),
  );

  /**
   * While the carousel scrolls to a slide the strip chose, it reports the slides it passes, starting with the one it
   * left; those reports are ignored, or they would scroll it back.
   */
  constructor() {
    effect((): void => {
      const index: number = this.shownIndex();
      if (index === this.reportedIndex) {
        return;
      }
      this.reportedIndex = index;
      this.isJumping = true;
      setTimeout((): void => {
        this.isJumping = false;
      }, this.jumpSettleMs);
    });
  }

  protected showSlide(index: number): void {
    if (this.isJumping) {
      return;
    }
    this.reportedIndex = index;
    this.store.dispatch(AnnouncementsActions.AnnouncementShown({ index }));
  }

  /** A plain click on an `/…` link routes in the app without a reload; modified clicks keep the browser's behavior. */
  protected followInternalLink(event: MouseEvent): void {
    const anchor: HTMLAnchorElement | null = event.target instanceof Element ? event.target.closest('a') : null;
    const href: string | null = anchor?.getAttribute('href') ?? null;
    const isPlainClick: boolean = event.button === 0
      && !event.ctrlKey
      && !event.metaKey
      && !event.shiftKey
      && !event.altKey;
    const isLeftToBrowser: boolean = event.defaultPrevented
      || anchor?.target === '_blank'
      || anchor?.hasAttribute('download') === true;
    if (href === null || !isPlainClick || isLeftToBrowser || linkKind(href) !== LinkKind.Internal) {
      return;
    }
    event.preventDefault();
    void this.router.navigateByUrl(href);
  }
}
