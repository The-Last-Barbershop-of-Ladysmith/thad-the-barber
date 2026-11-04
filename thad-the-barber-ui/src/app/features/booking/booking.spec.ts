import { NO_ERRORS_SCHEMA, Signal, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Navigation, ParamMap, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';
import { testFirstMonth } from '../../../testing/test-availability';
import { testConfirmationIn } from '../../../testing/test-booking';
import { TEST_SHOP } from '../../../testing/test-shop';
import { SessionService } from '../../core/services/session.service';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { Notice } from '../../shared/models/notice.model';
import { NoticeSeverity } from '../../shared/models/notice-severity.model';
import { RequestStatus } from '../../shared/models/request.models';
import { toIsoDateIn } from '../../shared/utils/date.utils';
import { AppState } from '../../store/app.state';
import * as ShopActions from '../shop/state/shop.actions';
import { shopFeature } from '../shop/state/shop.feature';
import { Booking } from './booking';
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { BookingForm } from './models/booking-form.model';
import { BookingStep } from './models/booking-step.model';
import { ReschedulePageState } from './models/reschedule-page-state.model';
import * as BookingActions from './state/booking.actions';
import { openFirstMonth } from './state/booking.effects';
import { bookingFeature } from './state/booking.feature';

/** The page's protected members the spec drives, read by name so the class stays unchanged. */
interface BookingPage {
  bookingForm: BookingForm;
  confirm: () => void;
  returnToBooking: () => void;
  canConfirm: Signal<boolean>;
  openStep: Signal<BookingStep>;
  hasUnconfirmedPick: Signal<boolean>;
  isRescheduling: Signal<boolean>;
}

type BookingRequestAction = ReturnType<typeof BookingActions.BookingRequest>;

const TODAY: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
const FIRST_TIME: string = `${TODAY}T20:00:00Z`;
const SECOND_TIME: string = `${TODAY}T20:30:00Z`;

const failedNotice: Notice = {
  severity: NoticeSeverity.Error,
  text: 'Made-up failure.',
  canRetry: true,
};

describe(
  'Booking',
  (): void => {
    let fixture: ComponentFixture<Booking>;
    let page: BookingPage;
    let store: Store<AppState>;
    let isBotCheckFailed: WritableSignal<boolean>;
    let dispatched: Action[];
    let routeParams: BehaviorSubject<ParamMap>;

    beforeEach((): void => {
      isBotCheckFailed = signal(false);
      routeParams = new BehaviorSubject<ParamMap>(convertToParamMap({}));
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          // The page opens its days through this; sending is left to the effects' own spec.
          provideEffects({ openFirstMonth }),
          provideRouter([]),
          { provide: SessionService, useValue: { isBotCheckFailed } },
          { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
        ],
      });
      // Only the page's own markup renders; the day, time and details components have their own specs.
      TestBed.overrideComponent(
        Booking,
        { set: { imports: [ReactiveFormsModule, NoticeMessage], schemas: [NO_ERRORS_SCHEMA] } },
      );
      store = TestBed.inject<Store<AppState>>(Store);
    });

    /** Opens the page; with `bookingId`, to move it, handed `reschedulePageState` as the manage page does. */
    function openPage(bookingId?: string, reschedulePageState: ReschedulePageState = {}): void {
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      handOver(reschedulePageState);
      routeParams.next(convertToParamMap(bookingId ? { id: bookingId } : {}));
      fixture = TestBed.createComponent(Booking);
      fixture.detectChanges();
      page = fixture.componentInstance as unknown as BookingPage;
      store.dispatch(BookingActions.AvailabilityRequestSuccess({
        availableDays: [{ date: TODAY, times: [FIRST_TIME, SECOND_TIME] }],
      }));
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
    }

    function handOver(reschedulePageState: ReschedulePageState): void {
      vi.spyOn(TestBed.inject(Router), 'currentNavigation')
        .mockReturnValue({ extras: { state: reschedulePageState } } as unknown as Navigation);
    }

    /** Picks today, then `startAt`, one after the other as the customer does. */
    function pick(startAt: string): void {
      page.bookingForm.controls.date.setValue(TODAY);
      page.bookingForm.controls.startAt.setValue(startAt);
    }

    function fillInAndConfirm(startAt: string): void {
      page.bookingForm.controls.name.setValue('Test Customer');
      page.bookingForm.controls.phone.setValue('(555) 010-0199');
      pick(startAt);
      page.confirm();
    }

    function sentBookings(): BookingRequestAction[] {
      return dispatched.filter((action: Action): action is BookingRequestAction =>
        'bookingRequest' in action);
    }

    function succeed(): void {
      store.dispatch(BookingActions.BookingRequestSuccess({ bookingConfirmation: testConfirmationIn(1, 'made-up') }));
      fixture.detectChanges();
    }

    function byTestId(testId: string): HTMLElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    it(
      'starts the booking over each time it opens, and loads the next 31 days once the shop is known',
      (): void => {
        store.dispatch(BookingActions.BookingRequestFailure({ notice: failedNotice, takenStartAt: null }));
        store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        fixture = TestBed.createComponent(Booking);

        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toBeNull();
        expect(store.selectSignal(bookingFeature.selectDayRange)()).toEqual(testFirstMonth());
        expect(store.selectSignal(bookingFeature.selectLoadStatus)()).toBe(RequestStatus.Pending);
      },
    );

    it(
      'needs a name of at least 2 characters once trimmed',
      (): void => {
        openPage();
        const isValidName: (name: string) => boolean = (name: string): boolean => {
          page.bookingForm.controls.name.setValue(name);
          return page.bookingForm.controls.name.valid;
        };

        expect(isValidName('')).toBe(false);
        expect(isValidName('   ')).toBe(false);
        expect(isValidName('  J  ')).toBe(false);
        expect(isValidName('Jo')).toBe(true);
        expect(isValidName('  Jo  ')).toBe(true);
        expect(isValidName('Jo Ann')).toBe(true);
      },
    );

    it(
      'can confirm once a day, a time, a name and a phone are in',
      (): void => {
        openPage();
        expect(page.canConfirm()).toBe(false);

        pick(FIRST_TIME);
        expect(page.canConfirm()).toBe(false);
        page.bookingForm.controls.name.setValue('Test Customer');
        page.bookingForm.controls.phone.setValue('(555) 010-0199');

        expect(page.canConfirm()).toBe(true);
      },
    );

    it(
      'sends the booking with an E.164 phone, retries it with the same key, and a changed time gets a new one',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingRequestFailure({ notice: failedNotice, takenStartAt: null }));
        page.confirm();
        store.dispatch(BookingActions.BookingRequestFailure({ notice: failedNotice, takenStartAt: null }));
        page.bookingForm.controls.startAt.setValue(SECOND_TIME);
        page.confirm();

        const [
          first,
          retry,
          changed]: BookingRequestAction[
        ] = sentBookings();
        expect(first?.bookingRequest).toEqual(expect.objectContaining({
          startAt: FIRST_TIME,
          name: 'Test Customer',
          phone: '+15550100199',
        }));
        expect(retry?.bookingRequest.idempotencyKey).toBe(first?.bookingRequest.idempotencyKey);
        expect(changed?.bookingRequest.idempotencyKey).not.toBe(first?.bookingRequest.idempotencyKey);
      },
    );

    it(
      'locks the form while the booking is sent, and sends nothing more once it went through',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        fixture.detectChanges();
        expect(page.bookingForm.disabled).toBe(true);

        succeed();
        page.confirm();

        expect(page.bookingForm.enabled).toBe(true);
        expect(sentBookings()).toHaveLength(1);
      },
    );

    it(
      'drops a taken time once it comes off the open times, keeping the day and the notice',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingRequestFailure({ notice: failedNotice, takenStartAt: FIRST_TIME }));

        expect(page.bookingForm.controls.date.value).toBe(TODAY);
        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Time);
        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toEqual(failedNotice);
      },
    );

    it(
      'drops the picked day once it has no open times left',
      (): void => {
        openPage();
        pick(FIRST_TIME);
        store.dispatch(BookingActions.AvailabilityRequestSuccess({
          availableDays: [{ date: '2099-01-01', times: ['2099-01-01T20:00:00Z'] }],
        }));

        expect(page.bookingForm.controls.date.value).toBeNull();
        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Day);
      },
    );

    it(
      'keeps the pick while another month loads and shows',
      (): void => {
        openPage();
        pick(FIRST_TIME);
        store.dispatch(BookingActions.AvailabilityRequest({ dayRange: { firstDay: '2099-01-01', lastDay: '2099-01-31' } }));
        store.dispatch(BookingActions.AvailabilityRequestSuccess({
          availableDays: [{ date: '2099-01-01', times: ['2099-01-01T20:00:00Z'] }],
        }));

        expect(page.bookingForm.controls.date.value).toBe(TODAY);
        expect(page.bookingForm.controls.startAt.value).toBe(FIRST_TIME);
      },
    );

    it(
      "clears the last day's time when another day is picked, and keeps it when the same day is picked again",
      (): void => {
        openPage();
        pick(FIRST_TIME);

        page.bookingForm.controls.date.setValue(TODAY);
        expect(page.bookingForm.controls.startAt.value).toBe(FIRST_TIME);
        page.bookingForm.controls.date.setValue('2099-01-01');
        expect(page.bookingForm.controls.startAt.value).toBeNull();
      },
    );

    it(
      'opens the time step once a day is picked, then the confirm step once a time is',
      (): void => {
        openPage();
        expect(page.openStep()).toBe(BookingStep.Day);

        page.bookingForm.controls.date.setValue(TODAY);
        expect(page.openStep()).toBe(BookingStep.Time);
        page.bookingForm.controls.startAt.setValue(FIRST_TIME);
        expect(page.openStep()).toBe(BookingStep.Confirm);
      },
    );

    it(
      'sends nothing while the bot check has failed, and shows it with the Square booking site to fall back on',
      (): void => {
        isBotCheckFailed.set(true);
        openPage();
        fillInAndConfirm(FIRST_TIME);

        expect(sentBookings()).toEqual([]);
        expect(byTestId('bot-check-failed')?.querySelector('[data-testid="notice-booking-site"]')?.getAttribute('href'))
          .toBe(TEST_SHOP.squareBookingSiteUrl);
      },
    );

    it(
      'has something to lose once a day is picked, still while it is sent, and not once it went through (#210)',
      (): void => {
        openPage();
        expect(page.hasUnconfirmedPick()).toBe(false);

        fillInAndConfirm(FIRST_TIME);
        expect(page.hasUnconfirmedPick()).toBe(true);
        succeed();
        expect(page.hasUnconfirmedPick()).toBe(false);
      },
    );

    it(
      "links anyone already booked to Square's booking site",
      (): void => {
        openPage();

        expect(byTestId('manage-bookings-link')?.getAttribute('href')).toBe(TEST_SHOP.squareBookingSiteUrl);
      },
    );

    describe(
      'moving a booking (/book/manage/{id}/reschedule)',
      (): void => {
        const booked: BookingConfirmation = testConfirmationIn(3, 'made-up-booking');
        const bookedPageState: ReschedulePageState = { manageToken: booked.manageToken, startAt: booked.startAt };

        it(
          'needs no details and has no link to Square, so it can confirm once a time is picked',
          (): void => {
            openPage(booked.id, bookedPageState);
            pick(SECOND_TIME);

            expect(page.isRescheduling()).toBe(true);
            expect(byTestId('manage-bookings-link')).toBeNull();
            expect(page.canConfirm()).toBe(true);
          },
        );

        it(
          'moves it with the token the manage page handed over, and never sends a new booking',
          (): void => {
            openPage(booked.id, bookedPageState);
            pick(SECOND_TIME);
            page.confirm();

            expect(dispatched).toContainEqual(BookingActions.RescheduleRequest({
              bookingId: booked.id,
              manageToken: booked.manageToken,
              startAt: SECOND_TIME,
            }));
            expect(sentBookings()).toEqual([]);
          },
        );

        it(
          'goes back to the booking with its token',
          (): void => {
            openPage(booked.id, bookedPageState);
            const navigateByUrl: ReturnType<typeof vi.spyOn> =
              vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

            page.returnToBooking();

            expect(navigateByUrl).toHaveBeenCalledWith(
              '/book/manage/made-up-booking',
              { state: { manageToken: booked.manageToken } },
            );
          },
        );

        it(
          'starts over for another booking when the router reuses the page, using that booking’s own token',
          (): void => {
            const otherBooked: BookingConfirmation = testConfirmationIn(4, 'made-up-other-booking');
            openPage(booked.id, bookedPageState);
            pick(SECOND_TIME);

            handOver({ manageToken: otherBooked.manageToken, startAt: otherBooked.startAt });
            routeParams.next(convertToParamMap({ id: otherBooked.id }));
            expect(page.bookingForm.controls.date.value).toBeNull();
            expect(page.openStep()).toBe(BookingStep.Day);
            store.dispatch(BookingActions.AvailabilityRequestSuccess({
              availableDays: [{ date: TODAY, times: [FIRST_TIME, SECOND_TIME] }],
            }));
            pick(SECOND_TIME);
            page.confirm();

            expect(dispatched).toContainEqual(BookingActions.RescheduleRequest({
              bookingId: otherBooked.id,
              manageToken: otherBooked.manageToken,
              startAt: SECOND_TIME,
            }));
          },
        );

        it(
          "says the booking can't be found, with no form, without its token",
          (): void => {
            openPage('made-up-unknown-booking');

            expect(byTestId('reschedule-not-found')).not.toBeNull();
            expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
          },
        );
      },
    );
  },
);
