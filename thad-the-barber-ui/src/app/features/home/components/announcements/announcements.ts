import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ButtonStyle, ButtonVariant } from '../../../../shared/models/button.models';
import { LinkKind } from '../../../../shared/models/link.models';
import { BUTTON_STYLES } from '../../../../shared/utils/button.utils';
import { linkKind } from '../../../../shared/utils/link.utils';
import { Announcement } from '../../../announcements/models/announcement.model';
import { AnnouncementImagePosition } from '../../../announcements/models/announcement-image-position.model';
import { announcementsFeature } from '../../../announcements/state/announcements.feature';
import { AppState } from '../../../../store/app.state';

/**
 * Full-height slider (PrimeNG composable carousel; swipe, arrows and dots are built in) of today's announcements.
 * Renders nothing without announcements (BR-32). Links to this site's own pages, in the body or on a button, go
 * through the Router.
 */
@Component({
  selector: 'app-announcements',
  imports: [
    DatePipe,
    ButtonModule,
    CardModule,
    CarouselModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcements.html',
  styleUrl: './announcements.scss',
  host: { '(click)': 'followInternalLink($event)' },
})
export class Announcements {
  private readonly router: Router = inject(Router);
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly announcements: Signal<Announcement[]> = this.store.selectSignal(
    announcementsFeature.selectActive,
  );

  protected readonly linkKinds: typeof LinkKind = LinkKind;
  protected readonly imagePositions: typeof AnnouncementImagePosition = AnnouncementImagePosition;
  protected readonly buttonStyles: Readonly<Record<ButtonVariant, ButtonStyle>> = BUTTON_STYLES;

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
