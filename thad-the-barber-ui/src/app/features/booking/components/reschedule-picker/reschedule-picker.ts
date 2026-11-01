import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InputSignal,
  OutputEmitterRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { filter, finalize, take } from 'rxjs';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../../shared/utils/problem.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { AvailabilityView } from '../../models/availability-view.model';
import { DateRange } from '../../models/date-range.model';
import { BookingService } from '../../services/booking.service';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { toRescheduleNotice } from '../../utils/booking-notice.utils';
import { toBookingWindow, toLongDateTime, toUpcomingView } from '../../utils/booking-time.utils';
import { DateStep } from '../date-step/date-step';
import { TimeStep } from '../time-step/time-step';

/**
 * Moving a booking: the booking page's date and time steps over the same availability, then "Move to …" sends the
 * new time. A time taken meanwhile is dropped and the days reload, as on /book.
 */
@Component({
  selector: 'app-reschedule-picker',
  imports: [
    ButtonModule,
    NoticeMessage,
    DateStep,
    TimeStep,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reschedule-picker.html',
  styleUrl: './reschedule-picker.scss',
})
export class ReschedulePicker {
  readonly bookingId: InputSignal<string> = input.required<string>();
  readonly manageToken: InputSignal<string> = input.required<string>();
  readonly rescheduled: OutputEmitterRef<ManagedBooking> = output<ManagedBooking>();
  readonly closed: OutputEmitterRef<void> = output();

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly bookingService: BookingService = inject(BookingService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly bookingWindow: Signal<DateRange | null> = computed((): DateRange | null =>
    toBookingWindow(this.store.selectSignal(shopFeature.selectBookingSettings)(), this.timeZone()));
  private readonly availabilityView: Signal<AvailabilityView | null> =
    this.store.selectSignal(bookingFeature.selectAvailabilityView);

  protected readonly dateControl: FormControl<string | null> = new FormControl<string | null>(null);
  protected readonly startAtControl: FormControl<string | null> = new FormControl<string | null>(null);
  protected readonly pickedDate: Signal<string | null> = toSignal(
    this.dateControl.valueChanges,
    { initialValue: null },
  );
  private readonly pickedStartAt: Signal<string | null> = toSignal(
    this.startAtControl.valueChanges,
    { initialValue: null },
  );

  protected readonly isSaving: WritableSignal<boolean> = signal(false);
  protected readonly notice: WritableSignal<Notice | null> = signal(null);
  protected readonly availabilityNotice: Signal<Notice | null> = this.store.selectSignal(bookingFeature.selectNotice);

  /** "Saturday, November 8 at 10:30 AM", the new time the button names. */
  protected readonly pickedTimeLabel: Signal<string | null> = computed((): string | null => {
    const startAt: string | null = this.pickedStartAt();
    const timeZone: string | null = this.timeZone();
    return startAt && timeZone ? toLongDateTime(timeZone, startAt) : null;
  });

  constructor() {
    // The first days wait for the shop, so "today" and the booking window are the shop's, not the browser's.
    toObservable(this.bookingWindow)
      .pipe(
        filter((bookingWindow: DateRange | null): bookingWindow is DateRange => bookingWindow !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((bookingWindow: DateRange): void => {
        this.store.dispatch(BookingActions.SetAvailabilityView({
          availabilityView: toUpcomingView(bookingWindow.min, bookingWindow),
        }));
      });
    this.dateControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.startAtControl.reset();
        this.notice.set(null);
      });
  }

  protected reloadDays(): void {
    const availabilityView: AvailabilityView | null = this.availabilityView();
    if (availabilityView) {
      this.store.dispatch(BookingActions.SetAvailabilityView({ availabilityView }));
    }
  }

  /** The "Move to …" button, and a failed move's retry. */
  protected move(): void {
    const startAt: string | null = this.startAtControl.value;
    if (!startAt || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.notice.set(null);
    this.bookingService
      .rescheduleBooking(
        this.bookingId(),
        this.manageToken(),
        { startAt },
      )
      .pipe(
        finalize((): void => {
          this.isSaving.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (managedBooking: ManagedBooking): void => {
          this.rescheduled.emit(managedBooking);
        },
        error: (error: unknown): void => {
          this.onMoveFailed(error);
        },
      });
  }

  /** A taken time is gone for good: it's dropped and the days reload to show what's still open. */
  private onMoveFailed(error: unknown): void {
    const isTaken: boolean = getProblemCode(error) === ProblemCode.SlotUnavailable;
    if (isTaken) {
      this.startAtControl.reset();
      this.reloadDays();
    }
    this.notice.set(toRescheduleNotice(error));
  }
}
