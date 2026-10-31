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
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { Backdrop } from '../../../../shared/components/backdrop/backdrop';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../dtos/booking-confirmation.dto';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { CalendarEvent } from '../../models/calendar-event.model';
import { ManagePageState } from '../../models/manage-page-state.model';
import { BookingService } from '../../services/booking.service';
import { bookingFeature } from '../../state/booking.feature';
import {
  BOOKING_CANCELLED_NOTICE,
  BOOKING_NOT_FOUND_NOTICE,
  BOOKING_PASSED_NOTICE,
  JUST_BOOKED_NOTICE,
  toManageLoadNotice,
} from '../../utils/booking-notice.utils';
import { toLongDateTime } from '../../utils/booking-time.utils';
import { toCalendarEvent, toIcsFile } from '../../utils/ics.utils';
import { readManageToken, toManageLink, toManagePath } from '../../utils/manage-link.utils';

/**
 * One booking, opened from its manage link (`/book/manage/{id}#t=…`), from this device's list, or by the booking page
 * right after booking. The token comes from the link's fragment, which then leaves the address bar for the router's
 * navigation state, or from the bookings saved on this device (BR-22); it's sent only in the `X-Manage-Token` header
 * (BR-08). Right after booking, this is its confirmation, with the link to keep first; opened later, the appointment's
 * actions come first. Every time shows on the shop's clock.
 */
@Component({
  selector: 'app-manage-booking',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    Backdrop,
    NoticeMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './manage-booking.html',
  styleUrl: './manage-booking.scss',
})
export class ManageBooking implements OnInit {
  /** The booking ID from the route. */
  readonly id: InputSignal<string> = input.required<string>();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  private readonly addressLine: Signal<string | null> = this.store.selectSignal(shopFeature.selectAddressLine);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);
  private readonly savedConfirmations: Signal<BookingConfirmation[]> =
    this.store.selectSignal(bookingFeature.selectSavedConfirmations);

  /** Read while this page's navigation runs; the router restores it on a reload. */
  private readonly pageState: ManagePageState = this.router.currentNavigation()?.extras.state ?? {};
  private readonly manageToken: WritableSignal<string | null> = signal(null);

  /** Right after booking, the link to keep comes first; opened later, the appointment's actions do. */
  protected readonly isJustBooked: boolean = this.pageState.isJustBooked === true;
  protected readonly justBookedNotice: Notice = JUST_BOOKED_NOTICE;
  protected readonly isLoading: WritableSignal<boolean> = signal(false);
  protected readonly loadNotice: WritableSignal<Notice | null> = signal(null);
  protected readonly managedBooking: WritableSignal<ManagedBooking | null> = signal(null);

  protected readonly appointmentTime: Signal<string | null> = computed((): string | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const timeZone: string | null = this.timeZone();
    return managedBooking && timeZone ? toLongDateTime(timeZone, managedBooking.startAt) : null;
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
    return manageToken ? toManageLink(window.location.origin, { id: this.id(), manageToken }) : null;
  });

  /** Waits for the shop, which holds the appointment's length and address. */
  protected readonly calendarEvent: Signal<CalendarEvent | null> = computed((): CalendarEvent | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const bookingSettings: BookingSettings | null = this.bookingSettings();
    const manageLink: string | null = this.manageLink();
    if (!managedBooking || !bookingSettings || !manageLink) {
      return null;
    }
    return toCalendarEvent(
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
    const savedConfirmation: BookingConfirmation | undefined = this.savedConfirmations()
      .find((confirmation: BookingConfirmation): boolean => confirmation.id === this.id());
    this.manageToken.set(this.findManageToken(savedConfirmation));
    // The booking page just made it: the device holds its time, and it can't be cancelled yet, so there's no need to
    // ask the API (and Square). Once it has started, the API says so.
    const isUpcoming: boolean = savedConfirmation !== undefined && Date.parse(savedConfirmation.startAt) > Date.now();
    if (this.isJustBooked && savedConfirmation && isUpcoming) {
      this.show({
        id: savedConfirmation.id,
        startAt: savedConfirmation.startAt,
        isCancelled: false,
        canChange: true,
      });
      return;
    }
    this.load();
  }

  protected load(): void {
    const manageToken: string | null = this.manageToken();
    if (!manageToken) {
      this.loadNotice.set(BOOKING_NOT_FOUND_NOTICE);
      return;
    }
    this.isLoading.set(true);
    this.loadNotice.set(null);
    this.bookingService
      .getBooking(this.id(), manageToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (managedBooking: ManagedBooking): void => {
          this.isLoading.set(false);
          this.show(managedBooking);
        },
        error: (error: unknown): void => {
          this.isLoading.set(false);
          this.loadNotice.set(toManageLoadNotice(error));
        },
      });
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
          this.messageService.add({
            severity: 'warn',
            summary: 'Couldn’t copy. Select the link and copy it.',
            sticky: true,
          });
        },
      );
  }

  protected addToCalendar(): void {
    const calendarEvent: CalendarEvent | null = this.calendarEvent();
    if (!calendarEvent) {
      return;
    }
    const fileUrl: string = URL.createObjectURL(new Blob([toIcsFile(calendarEvent)], { type: 'text/calendar' }));
    const download: HTMLAnchorElement = document.createElement('a');
    download.href = fileUrl;
    download.download = 'appointment.ics';
    download.click();
    setTimeout((): void => {
      URL.revokeObjectURL(fileUrl);
    });
  }

  private show(managedBooking: ManagedBooking): void {
    this.managedBooking.set(managedBooking);
    afterNextRender(
      (): void => {
        document.getElementById('manage-heading')?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * The link's `#t=…`, which then leaves the address bar (it would otherwise show in screenshots and shared tabs) for
   * the navigation state, so a reload still has it; else the one in the navigation state; else the one saved on this
   * device.
   */
  private findManageToken(savedConfirmation: BookingConfirmation | undefined): string | null {
    const fragmentToken: string | null = readManageToken(this.route.snapshot.fragment);
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
    return this.pageState.manageToken ?? savedConfirmation?.manageToken ?? null;
  }
}
