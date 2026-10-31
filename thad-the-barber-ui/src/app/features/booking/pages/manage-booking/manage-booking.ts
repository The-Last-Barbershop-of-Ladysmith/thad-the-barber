import { Location } from '@angular/common';
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { Backdrop } from '../../../../shared/components/backdrop/backdrop';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AppState } from '../../../../store/app.state';
import { BookingSettings } from '../../../shop/models/booking-settings.model';
import { ShopAddress } from '../../../shop/models/shop-address.model';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../dtos/booking-confirmation.dto';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { CalendarEvent } from '../../models/calendar-event.model';
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
import { toIcsFile } from '../../utils/ics.utils';
import { readManageToken, toManageLink, toManagePath } from '../../utils/manage-link.utils';

/** What this page keeps in `history.state`, so a reload still has it once the link's fragment is gone. */
interface ManagePageState {
  /** Set by the booking page when it opens this page after a booking. */
  isJustBooked?: boolean;
  manageToken?: string;
}

/**
 * One booking, opened from its manage link (`/book/manage/{id}#t=…`) or from this device's list. The token comes from
 * the link's fragment, which is then cleared from the address bar and kept in `history.state` instead, or from the
 * bookings saved on this device (BR-22); it's sent only in the `X-Manage-Token` header (BR-08). Right after a booking,
 * this is its confirmation, with the link to keep, a copy button and an "Add to calendar" file. Every time shows on the
 * shop's clock.
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
  private readonly location: Location = inject(Location);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly injector: Injector = inject(Injector);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly shopName: Signal<string> = this.store.selectSignal(shopFeature.selectShopName);
  private readonly address: Signal<ShopAddress | null> = this.store.selectSignal(shopFeature.selectAddress);
  private readonly bookingSettings: Signal<BookingSettings | null> =
    this.store.selectSignal(shopFeature.selectBookingSettings);

  private readonly pageState: ManagePageState = (this.location.getState() as ManagePageState | null) ?? {};
  private readonly manageToken: WritableSignal<string | null> = signal(null);

  /** Right after booking, the link to keep comes first; opened later, the appointment's actions do. */
  protected readonly isJustBooked: boolean = this.pageState.isJustBooked === true;
  protected readonly justBookedNotice: Notice = JUST_BOOKED_NOTICE;
  protected readonly loadStatus: WritableSignal<RequestStatus> = signal(RequestStatus.Idle);
  protected readonly loadNotice: WritableSignal<Notice | null> = signal(null);
  protected readonly managedBooking: WritableSignal<ManagedBooking | null> = signal(null);
  protected readonly requestStatus: typeof RequestStatus = RequestStatus;

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
  private readonly calendarEvent: Signal<CalendarEvent | null> = computed((): CalendarEvent | null => {
    const managedBooking: ManagedBooking | null = this.managedBooking();
    const bookingSettings: BookingSettings | null = this.bookingSettings();
    const manageLink: string | null = this.manageLink();
    if (!managedBooking || !bookingSettings || !manageLink) {
      return null;
    }
    return {
      uid: `${managedBooking.id}@thad-the-barber`,
      startAt: managedBooking.startAt,
      durationMinutes: bookingSettings.slotMinutes,
      title: `Appointment at ${this.shopName()}`,
      location: toAddressLine(this.address()),
      description: `Change or cancel: ${manageLink}`,
      url: manageLink,
    };
  });

  protected readonly canAddToCalendar: Signal<boolean> = computed((): boolean => this.calendarEvent() !== null);

  ngOnInit(): void {
    this.manageToken.set(this.findManageToken());
    this.load();
  }

  protected load(): void {
    const manageToken: string | null = this.manageToken();
    if (!manageToken) {
      this.loadStatus.set(RequestStatus.Error);
      this.loadNotice.set(BOOKING_NOT_FOUND_NOTICE);
      return;
    }
    this.loadStatus.set(RequestStatus.Pending);
    this.loadNotice.set(null);
    this.bookingService
      .getBooking(this.id(), manageToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (managedBooking: ManagedBooking): void => {
          this.managedBooking.set(managedBooking);
          this.loadStatus.set(RequestStatus.Success);
          this.focusHeading();
        },
        error: (error: unknown): void => {
          this.loadStatus.set(RequestStatus.Error);
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

  /**
   * The link's `#t=…`, which then leaves the address bar (it would otherwise show in screenshots and shared tabs) and
   * moves into `history.state`; else a token kept there from before a reload; else one saved on this device.
   */
  private findManageToken(): string | null {
    const fragmentToken: string | null = readManageToken(this.route.snapshot.fragment);
    if (fragmentToken) {
      this.location.replaceState(
        toManagePath(this.id()),
        '',
        { ...this.pageState, manageToken: fragmentToken },
      );
      return fragmentToken;
    }
    if (this.pageState.manageToken) {
      return this.pageState.manageToken;
    }
    const savedConfirmation: BookingConfirmation | undefined = this.store
      .selectSignal(bookingFeature.selectSavedConfirmations)()
      .find((confirmation: BookingConfirmation): boolean => confirmation.id === this.id());
    return savedConfirmation?.manageToken ?? null;
  }

  private focusHeading(): void {
    afterNextRender(
      (): void => {
        document.getElementById('manage-heading')?.focus();
      },
      { injector: this.injector },
    );
  }
}

/** "1 Made-up St, Testville, VA 22401" */
function toAddressLine(address: ShopAddress | null): string | null {
  if (!address) {
    return null;
  }
  return [
    address.street,
    address.city,
    `${address.state} ${address.postalCode}`,
  ].join(', ');
}
