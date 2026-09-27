import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  type Signal,
  type WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { type DatePickerMonthChangeEvent } from 'primeng/types/datepicker';
import { type Weekday } from '../../core/models/shop.models';
import { ShopHoursService } from '../../core/services/shop-hours.service';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { fromIsoDate, toIsoDate, toMonthKey } from '../../shared/utils/date.utils';
import { PHONE_PATTERN, nameValidators, phoneValidators } from '../../shared/validators/form.validators';
import { type AppState } from '../../store/app.state';
import { BookingSummary, type SummaryRow } from './components/booking-summary/booking-summary';
import { DateStep } from './components/date-step/date-step';
import { type BookingDetailsForm, DetailsStep } from './components/details-step/details-step';
import { TimeStep } from './components/time-step/time-step';
import {
  type BookingConfirmation,
  type BookingDetails,
  type DateRange,
  type TimeSlot,
} from './models/booking.models';
import { AvailabilityService } from './services/availability.service';
import { BookingPageActions } from './state/booking.actions';
import {
  selectConfirmation,
  selectDisabledDates,
  selectError,
  selectIsBooked,
  selectIsSubmitting,
  selectOpenSlotCount,
  selectSelectedDay,
  selectSelectedSlot,
  selectSelectedTime,
  selectSlots,
  selectSlotsLoading,
} from './state/booking.feature';

/** "Saturday, October 3" */
function longDate(date: Date): string {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    },
  );
}

/** "Sat, Oct 3" */
function shortDate(date: Date): string {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    },
  );
}

/** Booking page: date → time → details, with a live summary. Selection lives in the booking slice. */
@Component({
  selector: 'app-booking',
  imports: [
    Backdrop,
    DateStep,
    TimeStep,
    DetailsStep,
    BookingSummary,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements OnInit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly window: DateRange = inject(AvailabilityService).bookingWindow();
  protected readonly closedDays: Weekday[] = inject(ShopHoursService).closedWeekdays();

  protected readonly selectedDay: Signal<Date | null> = this.store.selectSignal(selectSelectedDay);
  protected readonly selectedTime: Signal<string | null> = this.store.selectSignal(selectSelectedTime);
  protected readonly selectedSlot: Signal<TimeSlot | null> = this.store.selectSignal(selectSelectedSlot);
  protected readonly disabledDates: Signal<Date[]> = this.store.selectSignal(selectDisabledDates);
  protected readonly slots: Signal<TimeSlot[]> = this.store.selectSignal(selectSlots);
  protected readonly slotsLoading: Signal<boolean> = this.store.selectSignal(selectSlotsLoading);
  protected readonly openSlotCount: Signal<number> = this.store.selectSignal(selectOpenSlotCount);
  protected readonly submitting: Signal<boolean> = this.store.selectSignal(selectIsSubmitting);
  protected readonly booked: Signal<boolean> = this.store.selectSignal(selectIsBooked);
  protected readonly error: Signal<string | null> = this.store.selectSignal(selectError);
  private readonly confirmation: Signal<BookingConfirmation | null> = this.store.selectSignal(selectConfirmation);

  protected readonly form: BookingDetailsForm = new FormGroup({
    name: new FormControl(
      '',
      {
        nonNullable: true,
        validators: nameValidators,
      },
    ),
    phone: new FormControl(
      '',
      {
        nonNullable: true,
        validators: phoneValidators,
      },
    ),
  });

  private readonly details: Signal<Partial<BookingDetails>> = toSignal(
    this.form.valueChanges,
    { initialValue: this.form.getRawValue() },
  );

  private readonly attempted: WritableSignal<boolean> = signal(false);

  protected readonly dayLabel: Signal<string | null> = computed((): string | null => {
    const day: Date | null = this.selectedDay();
    return day ? longDate(day) : null;
  });

  private readonly missing: Signal<string[]> = computed((): string[] => {
    const details: Partial<BookingDetails> = this.details();
    const name: string = details.name ?? '';
    const phone: string = details.phone ?? '';
    const missing: string[] = [];
    if (!this.selectedDay()) {
      missing.push('a date');
    }
    if (!this.selectedSlot()) {
      missing.push('a time');
    }
    if (name.trim().length < 2) {
      missing.push('your name');
    }
    if (!PHONE_PATTERN.test(phone)) {
      missing.push('a 10-digit phone');
    }
    return missing;
  });

  protected readonly hint: Signal<string | null> = computed((): string | null =>
    this.attempted() && this.missing().length > 0 ? `Still need ${this.missing().join(', ')}.` : null);

  protected readonly summaryRows: Signal<SummaryRow[]> = computed((): SummaryRow[] => {
    const day: Date | null = this.selectedDay();
    const details: Partial<BookingDetails> = this.details();
    const name: string = details.name?.trim() ?? '';
    const phone: string = details.phone ?? '';
    return [
      {
        label: 'Date',
        value: day ? shortDate(day) : '—',
      },
      {
        label: 'Time',
        value: this.selectedSlot()?.label ?? '—',
      },
      {
        label: 'Name',
        value: name || '—',
      },
      {
        label: 'Phone',
        value: phone || '—',
      },
    ];
  });

  protected readonly confirmationText: Signal<string | null> = computed((): string | null => {
    const booking: BookingConfirmation | null = this.confirmation();
    if (!booking) {
      return null;
    }
    const time: string = this.slots().find((slot: TimeSlot): boolean => slot.time === booking.time)?.label
      ?? booking.time;
    return `${longDate(fromIsoDate(booking.date))} at ${time}. A text confirmation goes to ${booking.phone}.`;
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.store.dispatch(BookingPageActions.detailsEdited());
      });
  }

  ngOnInit(): void {
    this.store.dispatch(BookingPageActions.monthViewed({ month: toMonthKey(this.window.min) }));
  }

  protected onMonthChange(event: DatePickerMonthChangeEvent): void {
    if (event.month === undefined || event.year === undefined) {
      return;
    }
    this.store.dispatch(BookingPageActions.monthViewed({
      month: toMonthKey(new Date(
        event.year,
        event.month - 1,
        1,
      )),
    }));
  }

  protected onDateSelect(date: Date): void {
    this.store.dispatch(BookingPageActions.dateSelected({ date: toIsoDate(date) }));
  }

  protected onTimeSelect(time: string): void {
    this.store.dispatch(BookingPageActions.timeSelected({ time }));
  }

  protected confirm(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    const day: Date | null = this.selectedDay();
    const time: string | null = this.selectedTime();
    if (this.missing().length > 0 || !day || !time || this.submitting()) {
      return;
    }

    const details: BookingDetails = this.form.getRawValue();
    this.store.dispatch(BookingPageActions.confirmRequested({
      request: {
        date: toIsoDate(day),
        time,
        name: details.name.trim(),
        phone: details.phone,
      },
    }));
  }
}
