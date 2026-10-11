import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ButtonSeverity, ButtonVariant } from 'primeng/types/button';
import { LinkKind } from '../../../../shared/models/link.models';
import { linkKind } from '../../../../shared/utils/link.utils';
import { Announcement, AnnouncementButtonVariant } from '../../models/home.models';

interface ButtonStyle {
  severity: ButtonSeverity;
  variant: ButtonVariant | undefined;
}

const BUTTON_STYLES: Record<AnnouncementButtonVariant, ButtonStyle> = {
  primary: { severity: 'primary', variant: undefined },
  secondary: { severity: 'secondary', variant: undefined },
  outlined: { severity: 'primary', variant: 'outlined' },
  text: { severity: 'primary', variant: 'text' },
};

/**
 * Full-height announcement slider (PrimeNG composable carousel; swipe, arrows and dots are built in). Renders nothing
 * without announcements (BR-32). Links to this site's own pages, in the body or on a button, go through the Router.
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

  readonly announcements: InputSignal<Announcement[]> = input.required<Announcement[]>();

  protected readonly linkKinds: typeof LinkKind = LinkKind;
  protected readonly buttonStyles: Record<AnnouncementButtonVariant, ButtonStyle> = BUTTON_STYLES;

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
