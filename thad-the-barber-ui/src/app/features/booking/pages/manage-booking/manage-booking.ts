import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  InputSignal,
  OnInit,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { finalize } from 'rxjs';
import { Backdrop } from '../../../../shared/components/backdrop/backdrop';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { getProblemCode, toProblemNotice } from '../../../../shared/utils/problem.utils';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { ManagePageState } from '../../models/manage-page-state.model';
import { ReschedulePageState } from '../../models/reschedule-page-state.model';
import { BookingService } from '../../services/booking.service';
import {
  BOOKING_CANCELLED_NOTICE,
  BOOKING_CHANGED_CODES,
  BOOKING_LOAD_FAILED_NOTICE,
  BOOKING_NOT_FOUND_NOTICE,
  BOOKING_PASSED_NOTICE,
  CANCEL_FAILED_NOTICE,
  CHANGE_PROBLEM_NOTICES,
  JUST_BOOKED_NOTICE,
} from '../../config/booking-notices';
import { toLongDate, toTimeLabel } from '../../utils/booking-time.utils';
import { toIcsFile } from '../../utils/ics.utils';
import { toManagePath } from '../../utils/manage-link.utils';

interface AppointmentStart {
  day: string;
  time: string;
}

/**
 * One booking, opened from its manage link (`/book/manage/{id}#t=…`) or by the booking page right after booking. The
 * token comes from the link's fragment, which then leaves the address bar for the router's navigation state; it's sent
 * only in the `X-Manage-Token` header (BR-08). Right after booking, the link to keep shows above the actions. It can be
 * rescheduled or cancelled until it starts (BR-07), every time on the shop's clock.
 */
@Component({
  selector: 'app-manage-booking',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    InputTextModule,
    ProgressBarModule,
    SkeletonModule,
    Backdrop,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manage-booking.html',
  styleUrl: './manage-booking.scss',
})
export class ManageBooking implements OnInit {
  readonly id: InputSignal<string> = input.required<string>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  protected readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  protected readonly addressLine: Signal<string | null> = this.store.selectSignal(shopFeature.selectAddressLine);
  protected readonly directionsUrl: Signal<string | null> = this.store.selectSignal(shopFeature.selectDirectionsUrl);
  protected readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);

  /** Read while this page's navigation runs; the router restores it on a reload. */
  private readonly pageState: ManagePageState = this.router.currentNavigation()?.extras.state ?? {};
  protected readonly manageToken: WritableSignal<string | null> = signal(null);

  protected readonly isJustBooked: boolean = this.pageState.isJustBooked === true;
  protected readonly justBookedNotice: Notice = JUST_BOOKED_NOTICE;
  /** The link field: shown right after booking, and whenever copying fails, so the link can be selected by hand. */
  protected readonly isLinkShown: WritableSignal<boolean> = signal(this.isJustBooked);
  protected readonly loadNotice: WritableSignal<Notice | null> = signal(null);
  protected readonly managedBooking: WritableSignal<ManagedBooking | null> = signal(null);
  protected readonly isCancelling: WritableSignal<boolean> = signal(false);
  protected readonly cancelNotice: WritableSignal<Notice | null> = signal(null);

  protected readonly appointmentStart: Signal<AppointmentStart | null> = computed((): AppointmentStart | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const timeZone: string | null = this.timeZone();
    if (!managedBooking || !timeZone) {
      return null;
    }
    return {
      day: toLongDate(timeZone, managedBooking.startAt),
      time: toTimeLabel(timeZone, managedBooking.startAt),
    };
  });

  /** Cancelled, or started or passed: either way it can't change (BR-07). */
  protected readonly statusNotice: Signal<Notice | null> = computed((): Notice | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    if (!managedBooking || managedBooking.canChange) {
      return null;
    }
    return managedBooking.isCancelled ? BOOKING_CANCELLED_NOTICE : BOOKING_PASSED_NOTICE;
  });

  protected readonly manageLink: Signal<string | null> = computed((): string | null => {
    const manageToken: string | null = this.manageToken();
    if (!manageToken) {
      return null;
    }
    const fragment: string = new URLSearchParams({ t: manageToken }).toString();
    return `${window.location.origin}${toManagePath(this.id())}#${fragment}`;
  });

  /** Waits for the shop, which holds the appointment's length and address. */
  protected readonly calendarFile: Signal<string | null> = computed((): string | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const bookingSettings: BookingSettings | null = this.bookingSettings();
    const manageLink: string | null = this.manageLink();
    if (!managedBooking || !bookingSettings || !manageLink) {
      return null;
    }
    return toIcsFile(
      managedBooking,
      {
        name: this.shopName(),
        addressLine: this.addressLine(),
        slotMinutes: bookingSettings.slotMinutes,
      },
      manageLink,
    );
  });

  ngOnInit(): void {
    this.manageToken.set(this.findManageToken());
    this.load();
  }

  protected load(): void {
    const manageToken: string | null = this.manageToken();
    if (!manageToken) {
      this.loadNotice.set(BOOKING_NOT_FOUND_NOTICE);
      return;
    }
    this.loadNotice.set(null);
    this.bookingService
      .getBooking(this.id(), manageToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (managedBooking: ManagedBooking): void => {
          this.managedBooking.set(managedBooking);
          afterNextRender(
            (): void => {
              document.getElementById('manage-heading')?.focus();
            },
            { injector: this.injector },
          );
        },
        error: (error: unknown): void => {
          const isNotFound: boolean = getProblemCode(error) === ProblemCode.BookingNotFound;
          this.loadNotice.set(isNotFound ? BOOKING_NOT_FOUND_NOTICE : BOOKING_LOAD_FAILED_NOTICE);
        },
      });
  }

  protected confirmCancel(): void {
    const appointmentStart: AppointmentStart | null = this.appointmentStart();
    const appointmentLabel: string = appointmentStart
      ? `${appointmentStart.day} at ${appointmentStart.time}`
      : 'Your appointment';
    this.confirmationService.confirm({
      key: 'cancel-booking',
      header: 'Cancel this appointment?',
      message: `${appointmentLabel}. You can book again any time.`,
      rejectButtonProps: { label: 'Keep appointment' },
      acceptButtonProps: {
        label: 'Cancel appointment',
        severity: 'danger',
        outlined: true,
      },
      defaultFocus: 'reject',
      closeOnEscape: true,
      accept: (): void => {
        this.cancel();
      },
    });
  }

  protected cancel(): void {
    const manageToken: string | null = this.manageToken();
    if (!manageToken) {
      return;
    }
    this.isCancelling.set(true);
    this.cancelNotice.set(null);
    this.bookingService
      .cancelBooking(this.id(), manageToken)
      .pipe(
        finalize((): void => {
          this.isCancelling.set(false);
        }),
      )
      .subscribe({
        next: (managedBooking: ManagedBooking): void => {
          this.managedBooking.set(managedBooking);
          this.messageService.add({ severity: 'success', summary: 'Appointment cancelled' });
        },
        error: (error: unknown): void => {
          if (BOOKING_CHANGED_CODES.includes(getProblemCode(error) ?? '')) {
            this.load();
            return;
          }
          this.cancelNotice.set(toProblemNotice(
            error,
            CHANGE_PROBLEM_NOTICES,
            CANCEL_FAILED_NOTICE,
          ));
        },
      });
  }

  protected reschedule(): void {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const manageToken: string | null = this.manageToken();
    if (!managedBooking || !manageToken) {
      return;
    }
    const reschedulePageState: ReschedulePageState = { manageToken, startAt: managedBooking.startAt };
    void this.router.navigateByUrl(`${toManagePath(managedBooking.id)}/reschedule`, { state: reschedulePageState });
  }

  /** A toast confirms the copy; when the browser refuses, the link stays in its field to select by hand. */
  protected copyManageLink(): void {
    const manageLink: string | null = this.manageLink();
    if (!manageLink) {
      return;
    }
    Promise.resolve()
      .then((): Promise<void> => navigator.clipboard.writeText(manageLink))
      .then(
        (): void => {
          this.messageService.add({ severity: 'success', summary: 'Link copied' });
        },
        (): void => {
          this.isLinkShown.set(true);
          this.messageService.add({
            severity: 'warn',
            summary: 'Couldn’t copy. Select the link and copy it.',
            sticky: true,
          });
        },
      );
  }

  /** The file is a few hundred bytes, so it rides in a `data:` URL: nothing to create or release around the click. */
  protected addToCalendar(): void {
    const calendarFile: string | null = this.calendarFile();
    if (!calendarFile) {
      return;
    }
    const download: HTMLAnchorElement = document.createElement('a');
    download.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarFile)}`;
    download.download = 'appointment.ics';
    document.body.append(download);
    download.click();
    download.remove();
  }

  /**
   * The link's `#t=…`, which then leaves the address bar (it would otherwise show in screenshots and shared tabs) for
   * the navigation state, so a reload still has it; else the one in the navigation state.
   */
  private findManageToken(): string | null {
    const fragmentToken: string | null = new URLSearchParams(this.route.snapshot.fragment ?? '').get('t');
    if (fragmentToken) {
      const managePageState: ManagePageState = { ...this.pageState, manageToken: fragmentToken };
      void this.router.navigateByUrl(
        toManagePath(this.id()),
        {
          replaceUrl: true,
          state: managePageState,
        },
      );
      return fragmentToken;
    }
    return this.pageState.manageToken ?? null;
  }
}
