import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InputSignal,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AppState } from '../../../../../store/app.state';
import { AdminPageHeader } from '../../../components/admin-page-header/admin-page-header';
import { ANNOUNCEMENTS_PATH } from '../../config/announcements-paths';
import { AdminAnnouncementDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementTextPreviewDto } from '../../dtos/announcement-text-preview.dto';
import { AnnouncementTextStatusDto } from '../../dtos/announcement-text-status.dto';
import { AnnouncementSendState } from '../../models/announcement-send-state.model';
import { AnnouncementTextError } from '../../models/announcement-text-error.model';
import * as AdminAnnouncementTextsActions from '../../state/admin-announcement-texts.actions';
import { adminAnnouncementTextsFeature } from '../../state/admin-announcement-texts.feature';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { toAnnouncementTextMessage } from '../../utils/announcement-text-error.utils';

/** One text is 160 characters; a longer message goes out as several, which a carrier bills and shows as one. */
const SMS_SEGMENT_LENGTH: number = 160;

const MAX_MESSAGE_LENGTH: number = 480;

/**
 * Shows exactly what an announcement's text will say and who gets it, after the announcement is saved, and sends it
 * only when the owner confirms. The wording can be changed here; nothing is sent until Send is pressed.
 */
@Component({
  selector: 'app-admin-announcement-text',
  imports: [
    AdminPageHeader,
    RouterLink,
    ButtonModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-text.html',
  styleUrl: './announcement-text.scss',
})
export class AnnouncementText implements OnInit {
  /** The announcement's title and first day, from the page's address. */
  readonly title: InputSignal<string | undefined> = input<string>();
  readonly startDate: InputSignal<string | undefined> = input<string>();

  protected readonly listPath: string = ANNOUNCEMENTS_PATH;
  protected readonly message: WritableSignal<string> = signal<string>('');

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly announcements: Signal<AdminAnnouncementDto[]> = this.store.selectSignal(
    adminAnnouncementsFeature.selectAnnouncements,
  );
  private readonly error: Signal<AnnouncementTextError | null> = this.store.selectSignal(
    adminAnnouncementTextsFeature.selectError,
  );
  private isRequested: boolean = false;
  private isMessageFilled: boolean = false;

  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoaded);
  protected readonly preview: Signal<AnnouncementTextPreviewDto | null> = this.store.selectSignal(
    adminAnnouncementTextsFeature.selectPreview,
  );
  protected readonly sent: Signal<AnnouncementTextStatusDto | null> = this.store.selectSignal(
    adminAnnouncementTextsFeature.selectSent,
  );
  protected readonly isPreviewing: Signal<boolean> = this.store.selectSignal(
    adminAnnouncementTextsFeature.selectIsPreviewing,
  );
  protected readonly isSending: Signal<boolean> = this.store.selectSignal(
    adminAnnouncementTextsFeature.selectIsSending,
  );

  /** The saved announcement this page is about, found by its title and first day (the list has no ids). */
  protected readonly announcement: Signal<AdminAnnouncementDto | null> = computed((): AdminAnnouncementDto | null =>
    this.announcements().find(
      (item: AdminAnnouncementDto): boolean =>
        item.title.trim() === this.title()?.trim() && item.startDate === this.startDate(),
    ) ?? null);

  protected readonly isMissing: Signal<boolean> = computed((): boolean =>
    this.isLoaded() && this.announcement() === null);

  protected readonly problem: Signal<string | null> = computed((): string | null => {
    const error: AnnouncementTextError | null = this.error();
    return error === null ? null : toAnnouncementTextMessage(error);
  });

  protected readonly length: Signal<number> = computed((): number => this.message().length);

  protected readonly segments: Signal<number> = computed((): number =>
    Math.max(1, Math.ceil(this.length() / SMS_SEGMENT_LENGTH)));

  protected readonly isTooLong: Signal<boolean> = computed((): boolean => this.length() > MAX_MESSAGE_LENGTH);

  protected readonly canSend: Signal<boolean> = computed((): boolean => {
    const preview: AnnouncementTextPreviewDto | null = this.preview();
    return preview !== null
      && preview.isEnabled
      && preview.subscriberCount > 0
      && preview.alreadyTexted === null
      && this.message().trim() !== ''
      && !this.isTooLong()
      && !this.isSending()
      && this.sent() === null;
  });

  protected readonly isGoingOutToday: Signal<boolean> = computed((): boolean => {
    const sent: AnnouncementTextStatusDto | null = this.sent();
    return sent !== null && sent.state !== AnnouncementSendState.Scheduled;
  });

  constructor() {
    inject(DestroyRef).onDestroy((): void => {
      this.store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextReset());
    });
    effect((): void => {
      const announcement: AdminAnnouncementDto | null = this.announcement();
      if (announcement !== null && !this.isRequested) {
        this.isRequested = true;
        this.store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest({
          request: {
            title: announcement.title,
            bodyHtml: announcement.bodyHtml,
            startDate: announcement.startDate,
          },
        }));
      }
    });
    effect((): void => {
      const preview: AnnouncementTextPreviewDto | null = this.preview();
      if (preview !== null && !this.isMessageFilled) {
        this.isMessageFilled = true;
        this.message.set(preview.message);
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequest());
  }

  protected onMessage(event: Event): void {
    this.message.set((event.target as HTMLTextAreaElement).value);
  }

  protected send(): void {
    const title: string | undefined = this.title();
    const startDate: string | undefined = this.startDate();
    if (this.canSend() && title !== undefined && startDate !== undefined) {
      this.store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextSend({
        request: {
          title,
          startDate,
          message: this.message(),
        },
      }));
    }
  }
}
