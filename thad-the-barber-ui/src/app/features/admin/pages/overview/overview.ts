import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Observable, catchError, of } from 'rxjs';
import { formatMonthDay, fromIsoDate } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { AdminAnnouncementDto } from '../../announcements/dtos/admin-announcement.dto';
import { AdminAnnouncementStatus } from '../../announcements/models/admin-announcement-status.model';
import { AdminAnnouncementsService } from '../../announcements/services/admin-announcements.service';
import { countByStatus } from '../../announcements/utils/announcement-list.utils';
import { AdminPageHeader } from '../../components/admin-page-header/admin-page-header';
import { AdminGalleryPhotoDto } from '../../gallery/dtos/admin-gallery-photo.dto';
import { AdminGalleryService } from '../../gallery/services/admin-gallery.service';
import { AdminShopInfoDto } from '../../shop/dtos/admin-shop-info.dto';
import { AdminShopService } from '../../shop/services/admin-shop.service';
import { adminFeature } from '../../state/admin.feature';

/** How many gallery photos the overview shows before saying how many more there are. */
const PHOTO_PREVIEW_COUNT: number = 3;

/**
 * The first admin page: a way into each tool with what is live on the site now. It reads each list itself, as it is
 * shown once and the tools keep their own state. A list is `undefined` while loading and `null` when it failed.
 */
@Component({
  selector: 'app-admin-overview',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    AdminPageHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  protected readonly today: Date = new Date();
  protected readonly photoPreviewCount: number = PHOTO_PREVIEW_COUNT;

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly name: Signal<string | null> = this.store.selectSignal(adminFeature.selectName);

  protected readonly announcements: Signal<AdminAnnouncementDto[] | null | undefined> = toSignal(
    inject(AdminAnnouncementsService).getAll().pipe(catchError((): Observable<null> => of(null))),
    { initialValue: undefined },
  );
  protected readonly photos: Signal<AdminGalleryPhotoDto[] | null | undefined> = toSignal(
    inject(AdminGalleryService).getAll().pipe(catchError((): Observable<null> => of(null))),
    { initialValue: undefined },
  );
  protected readonly shopInfo: Signal<AdminShopInfoDto | null | undefined> = toSignal(
    inject(AdminShopService).get().pipe(catchError((): Observable<null> => of(null))),
    { initialValue: undefined },
  );

  protected readonly heading: Signal<string> = computed((): string => {
    const firstName: string | undefined = this.name()?.split(' ')[0];
    return firstName ? `Welcome back, ${firstName}.` : 'Welcome back.';
  });

  protected readonly showingCount: Signal<number> = computed((): number =>
    countByStatus(this.announcements() ?? [], AdminAnnouncementStatus.Showing));
  protected readonly scheduledCount: Signal<number> = computed((): number =>
    countByStatus(this.announcements() ?? [], AdminAnnouncementStatus.Scheduled));
  protected readonly endedCount: Signal<number> = computed((): number =>
    countByStatus(this.announcements() ?? [], AdminAnnouncementStatus.Ended));

  /** The showing announcement that ends first, so the owner knows what comes down next. */
  protected readonly nextToEnd: Signal<AdminAnnouncementDto | null> = computed((): AdminAnnouncementDto | null => {
    const showing: AdminAnnouncementDto[] = (this.announcements() ?? [])
      .filter((item: AdminAnnouncementDto): boolean => item.status === AdminAnnouncementStatus.Showing)
      .sort((first: AdminAnnouncementDto, second: AdminAnnouncementDto): number =>
        first.endDate.localeCompare(second.endDate));
    return showing[0] ?? null;
  });

  protected readonly nextToEndDate: Signal<string> = computed((): string => {
    const item: AdminAnnouncementDto | null = this.nextToEnd();
    return item === null ? '' : formatMonthDay(fromIsoDate(item.endDate));
  });

  protected readonly previewPhotos: Signal<AdminGalleryPhotoDto[]> = computed((): AdminGalleryPhotoDto[] =>
    (this.photos() ?? []).slice(0, PHOTO_PREVIEW_COUNT));

  protected readonly morePhotoCount: Signal<number> = computed((): number =>
    Math.max((this.photos()?.length ?? 0) - PHOTO_PREVIEW_COUNT, 0));

  /** What the booking page shows: the saved notice, else Square's description, and whether it shows at all. */
  protected readonly noticeText: Signal<string | null> = computed((): string | null => {
    const info: AdminShopInfoDto | null | undefined = this.shopInfo();
    return info?.notice ?? info?.squareNotice ?? null;
  });
}
