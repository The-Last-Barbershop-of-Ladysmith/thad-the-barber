import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { shopFeature } from '../../../../shop/state/shop.feature';
import { toIsoDate, toIsoDateIn } from '../../../../../shared/utils/date.utils';
import { AppState } from '../../../../../store/app.state';
import { announcementEditPath, NEW_ANNOUNCEMENT_PATH } from '../../config/announcements-paths';
import { AdminAnnouncementDto } from '../../dtos/admin-announcement.dto';
import { AdminAnnouncementStatus } from '../../models/admin-announcement-status.model';
import { AdminAnnouncementsError } from '../../models/admin-announcements-error.model';
import { AnnouncementFilter } from '../../models/announcement-filter.model';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { toAnnouncementsMessage } from '../../utils/announcements-message.utils';
import {
  IndexedAnnouncement,
  countByStatus,
  endNow,
  filterAnnouncements,
  formatAnnouncementDates,
} from '../../utils/announcement-list.utils';

interface FilterTab {
  filter: AnnouncementFilter;
  label: string;
  count: number;
}

/** Every announcement with its status; End now and the edit page are the two ways to change one. */
@Component({
  selector: 'app-admin-announcements-list',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcements-list.html',
  styleUrl: './announcements-list.scss',
})
export class AnnouncementsList implements OnInit {
  protected readonly newPath: string = NEW_ANNOUNCEMENT_PATH;
  protected readonly Status: typeof AdminAnnouncementStatus = AdminAnnouncementStatus;
  protected readonly filter: WritableSignal<AnnouncementFilter> = signal<AnnouncementFilter>(AnnouncementFilter.All);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly announcements: Signal<AdminAnnouncementDto[]> = this.store.selectSignal(
    adminAnnouncementsFeature.selectAnnouncements,
  );
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);

  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoading);
  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoaded);
  protected readonly isSaving: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsSaving);
  protected readonly error: Signal<AdminAnnouncementsError | null> = this.store.selectSignal(
    adminAnnouncementsFeature.selectError,
  );

  protected readonly message: Signal<string | null> = computed((): string | null => {
    const error: AdminAnnouncementsError | null = this.error();
    return error === null ? null : toAnnouncementsMessage(error);
  });

  protected readonly tabs: Signal<FilterTab[]> = computed((): FilterTab[] => {
    const announcements: AdminAnnouncementDto[] = this.announcements();
    return [
      {
        filter: AnnouncementFilter.All,
        label: 'All',
        count: announcements.length,
      },
      {
        filter: AnnouncementFilter.Showing,
        label: 'Showing',
        count: countByStatus(announcements, AdminAnnouncementStatus.Showing),
      },
      {
        filter: AnnouncementFilter.Scheduled,
        label: 'Scheduled',
        count: countByStatus(announcements, AdminAnnouncementStatus.Scheduled),
      },
      {
        filter: AnnouncementFilter.Ended,
        label: 'Ended',
        count: countByStatus(announcements, AdminAnnouncementStatus.Ended),
      },
    ];
  });

  protected readonly visible: Signal<IndexedAnnouncement[]> = computed((): IndexedAnnouncement[] =>
    filterAnnouncements(this.announcements(), this.filter()));

  ngOnInit(): void {
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequest());
  }

  protected editPath(index: number): string {
    return announcementEditPath(index);
  }

  protected dates(item: AdminAnnouncementDto): string {
    return formatAnnouncementDates(item);
  }

  protected end(index: number): void {
    const timeZone: string | null = this.timeZone();
    const today: string = timeZone === null ? toIsoDate(new Date()) : toIsoDateIn(timeZone, new Date());
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsSave({
      announcements: endNow(
        this.announcements(),
        index,
        today,
      ),
    }));
  }
}
