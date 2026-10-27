import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { testSavedConfirmation } from '../../../testing/test-booking';
import { TEST_SHOP } from '../../../testing/test-shop';
import { SessionService } from '../../core/services/session.service';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { RequestStatus } from '../../shared/models/request.models';
import { toIsoDateIn } from '../../shared/utils/date.utils';
import { AppState } from '../../store/app.state';
import * as ShopActions from '../shop/state/shop.actions';
import { shopFeature } from '../shop/state/shop.feature';
import { Booking } from './booking';
import { NoticeMessage } from './components/notice-message/notice-message';
import { BookingConfirmation } from './dtos/booking-confirmation.dto';
import { BookingForm } from './models/booking-form.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingStep } from './models/booking-step.model';
import { BookingRequest } from './dtos/booking-request.dto';
import { SavedConfirmation } from './models/saved-confirmation.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';
import { toBookingWindow, toUpcomingView } from './utils/booking-time.utils';
import { AvailabilityView } from './models/availability-view.model';
import { DateRange } from './models/date-range.model';

/** The page's protected members the spec drives, read by name so the class stays unchanged. */
interface BookingPage {
  bookingForm: BookingForm;
  confirm: () => void;
  bookingNotice: () => BookingNotice | null;
  bookedNotice: () => BookingNotice | null;
  openStep: () => BookingStep;
  showStep: (step: BookingStep) => void;
  changeFromReview: (step: BookingStep) => void;
  confirmLeave: () => boolean | Promise<boolean>;
}

const TODAY: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
const FIRST_TIME: string = `${TODAY}T20:00:00Z`;
const SECOND_TIME: string = `${TODAY}T20:30:00Z`;
const TOMORROW: string = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

/** The view the page opens on for the test shop: today's 31-day block, on the shop's clock. */
function firstBlock(): AvailabilityView {
  const bookingWindow: DateRange | null = toBookingWindow(TEST_SHOP.bookingSettings, TEST_SHOP.timeZone);
  if (!bookingWindow) {
    throw new Error('The test shop has a booking window.');
  }
  return toUpcomingView(bookingWindow.min, bookingWindow);
}

describe(
  'Booking',
  (): void => {
    let fixture: ComponentFixture<Booking>;
    let page: BookingPage;
    let requests: BookingRequest[];
    let responses: Subject<BookingConfirmation>[];
    let isBotCheckFailed: WritableSignal<boolean>;
    let dispatched: Action[];

    function createBooking(request: BookingRequest): Observable<BookingConfirmation> {
      const response: Subject<BookingConfirmation> = new Subject<BookingConfirmation>();
      requests.push(request);
      responses.push(response);
      return response;
    }

    function confirmation(request: BookingRequest | undefined): BookingConfirmation {
      return {
        id: 'made-up-booking',
        startAt: request?.startAt ?? '',
        manageToken: 'made-up-token',
      };
    }

    function fail(
      index: number,
      status: number,
      code: string,
    ): void {
      responses[index]?.error(new HttpErrorResponse({ status, error: { code } }));
    }

    function pickAndConfirm(startAt: string): void {
      page.bookingForm.setValue({
        name: 'Test Customer',
        phone: '(555) 010-0199',
        date: TODAY,
        startAt,
      });
      page.confirm();
    }

    beforeEach((): void => {
      requests = [];
      responses = [];
      isBotCheckFailed = signal(false);
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          { provide: BookingService, useValue: { createBooking } },
          { provide: SessionService, useValue: { isBotCheckFailed } },
        ],
      });
      // Only the page's own messages render; the steps and summary have their own specs.
      TestBed.overrideComponent(
        Booking,
        { set: { imports: [ReactiveFormsModule, NoticeMessage], schemas: [NO_ERRORS_SCHEMA] } },
      );
    });

    /** Opens the page as after a reload, with `savedConfirmation` as the booking kept from the last 24 hours. */
    function openPage(savedConfirmation: SavedConfirmation | null = null): void {
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      if (savedConfirmation) {
        store.dispatch(BookingActions.BookingConfirm({ savedConfirmation }));
      }
      fixture = TestBed.createComponent(Booking);
      fixture.detectChanges();
      page = fixture.componentInstance as unknown as BookingPage;
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
    }

    function savedBooking(): HTMLElement | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testid="saved-booking"]');
    }

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
      'retries a failed booking with the same key, and a changed time gets a new one',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        fail(
          0,
          503,
          'square_unavailable',
        );
        page.confirm();
        page.bookingForm.controls.startAt.setValue(SECOND_TIME);
        page.confirm();

        expect(requests[1]?.idempotencyKey).toBe(requests[0]?.idempotencyKey);
        expect(requests[2]?.idempotencyKey).not.toBe(requests[0]?.idempotencyKey);
        expect(requests[0]?.phone).toBe('+15550100199');
      },
    );

    it(
      'sends only one booking: confirming again after it went through does nothing',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));
        responses[0]?.complete();
        page.confirm();

        expect(requests).toHaveLength(1);
      },
    );

    it(
      'locks the form while the booking is sent',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);

        expect(page.bookingForm.disabled).toBe(true);
        responses[0]?.next(confirmation(requests[0]));
        responses[0]?.complete();

        expect(page.bookingForm.enabled).toBe(true);
      },
    );

    it(
      'shows the booking with its phone and starts over at the date, keeping the name and phone',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));
        responses[0]?.complete();

        expect(page.bookedNotice()?.text).toContain('(555) 010-0199');
        expect(page.bookingForm.getRawValue()).toEqual({
          name: 'Test Customer',
          phone: '(555) 010-0199',
          date: null,
          startAt: null,
        });
        expect(page.openStep()).toBe(BookingStep.Date);
        expect(dispatched).toContainEqual(BookingActions.SetAvailabilityView({ availabilityView: firstBlock() }));
      },
    );

    it(
      'drops a taken time, opens the time step and reloads the days in view',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        fail(
          0,
          409,
          ProblemCode.SlotUnavailable,
        );

        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.bookingNotice()).not.toBeNull();
        expect(page.openStep()).toBe(BookingStep.Time);
        expect(dispatched).toContainEqual(BookingActions.SetAvailabilityView({ availabilityView: firstBlock() }));
      },
    );

    it(
      'leaves a failed bot check to its own message and sends nothing more',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        isBotCheckFailed.set(true);
        fail(
          0,
          403,
          ProblemCode.BotCheckFailed,
        );
        page.confirm();

        expect(page.bookingNotice()).toBeNull();
        expect(requests).toHaveLength(1);
      },
    );

    it(
      'keeps the booking it confirmed for 24 hours, so a reload still shows it',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));

        expect(dispatched).toContainEqual(BookingActions.BookingConfirm({
          savedConfirmation: { booking: confirmation(requests[0]), savedAt: expect.any(String) as string },
        }));
      },
    );

    it(
      'shows a booking kept from the last 24 hours, without the phone, which is never saved',
      (): void => {
        openPage(testSavedConfirmation(new Date().toISOString(), TOMORROW));

        expect(savedBooking()).not.toBeNull();
        expect(savedBooking()?.textContent).not.toContain('text confirmation');
      },
    );

    it(
      'shows no saved booking when none is kept',
      (): void => {
        openPage();

        expect(savedBooking()).toBeNull();
      },
    );

    it(
      'shows only the booking kept when the page opened, not one made since',
      (): void => {
        openPage();
        TestBed.inject<Store<AppState>>(Store).dispatch(BookingActions.BookingConfirm({
          savedConfirmation: testSavedConfirmation(new Date().toISOString(), TOMORROW),
        }));

        expect(savedBooking()).toBeNull();
      },
    );

    it(
      'loads the next 31 days once the shop is known',
      (): void => {
        openPage();

        expect(TestBed.inject<Store<AppState>>(Store).selectSignal(bookingFeature.selectAvailabilityView)())
          .toEqual(firstBlock());
        expect(TestBed.inject<Store<AppState>>(Store).selectSignal(bookingFeature.selectLoadStatus)())
          .toBe(RequestStatus.Pending);
      },
    );

    it(
      'opens the time step once a day is picked, then the details once a time is',
      (): void => {
        openPage();

        page.bookingForm.controls.date.setValue(TODAY);
        expect(page.openStep()).toBe(BookingStep.Time);
        page.bookingForm.controls.startAt.setValue(FIRST_TIME);
        expect(page.openStep()).toBe(BookingStep.Details);
      },
    );

    it(
      "won't open a step before the ones above it are done",
      (): void => {
        openPage();

        page.showStep(BookingStep.Review);
        expect(page.openStep()).toBe(BookingStep.Date);
        page.bookingForm.controls.date.setValue(TODAY);
        page.bookingForm.controls.startAt.setValue(FIRST_TIME);
        page.showStep(BookingStep.Review);
        expect(page.openStep()).toBe(BookingStep.Details);
      },
    );

    it(
      'comes back to review after a time is changed from it',
      (): void => {
        openPage();
        page.bookingForm.setValue({
          name: 'Test Customer',
          phone: '(555) 010-0199',
          date: TODAY,
          startAt: FIRST_TIME,
        });
        page.showStep(BookingStep.Review);

        page.changeFromReview(BookingStep.Time);
        expect(page.openStep()).toBe(BookingStep.Time);
        page.bookingForm.controls.startAt.setValue(SECOND_TIME);
        expect(page.openStep()).toBe(BookingStep.Review);
      },
    );

    it(
      'shows a failed bot check at the top of the page, with the Square booking site to fall back on',
      (): void => {
        isBotCheckFailed.set(true);
        openPage();

        const botCheck: Element | null = (fixture.nativeElement as HTMLElement)
          .querySelector('[data-testid="bot-check-failed"]');
        expect(botCheck?.querySelector('[data-testid="notice-booking-site"]')?.getAttribute('href'))
          .toBe(TEST_SHOP.squareBookingSiteUrl);
      },
    );

    it(
      'lets the customer leave without asking while nothing is picked (#210)',
      (): void => {
        openPage();

        expect(page.confirmLeave()).toBe(true);
      },
    );

    it(
      'asks before leaving a picked day that is not booked, and Keep booking stays (#210)',
      async (): Promise<void> => {
        openPage();
        page.bookingForm.controls.date.setValue(TODAY);
        const confirmationService: ConfirmationService = fixture.debugElement.injector.get(ConfirmationService);
        let asked: Confirmation | null = null;
        confirmationService.requireConfirmation$.subscribe((confirmation: Confirmation | null): void => {
          asked = confirmation;
        });

        const canLeave: boolean | Promise<boolean> = page.confirmLeave();
        (asked as Confirmation | null)?.reject?.();

        expect((asked as Confirmation | null)?.header).toBe('Leave without booking?');
        expect(await canLeave).toBe(false);
      },
    );

    it(
      'lets the customer go once the booking went through (#210)',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        responses[0]?.next(confirmation(requests[0]));
        responses[0]?.complete();

        expect(page.confirmLeave()).toBe(true);
      },
    );

    it(
      "clears the last day's time when another day is picked",
      (): void => {
        openPage();
        page.bookingForm.controls.date.setValue(TODAY);
        page.bookingForm.controls.startAt.setValue(FIRST_TIME);

        page.bookingForm.controls.date.setValue('2099-01-01');

        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Time);
      },
    );

    it(
      'still asks before leaving while the booking is being sent, since leaving would drop its response (#210)',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);

        expect(page.confirmLeave()).toBeInstanceOf(Promise);
      },
    );

    it(
      'drops the picked day and opens the date step when a taken time left that day with none, keeping the notice',
      (): void => {
        openPage();
        pickAndConfirm(FIRST_TIME);
        fail(
          0,
          409,
          ProblemCode.SlotUnavailable,
        );
        TestBed.inject<Store<AppState>>(Store).dispatch(BookingActions.AvailabilityRequestSuccess({
          availabilityView: firstBlock(),
          availableDays: [{ date: '2099-01-01', times: ['2099-01-01T20:00:00Z'] }],
        }));

        expect(page.bookingForm.controls.date.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Date);
        expect(page.bookingNotice()).not.toBeNull();
      },
    );

    it(
      "moves a 31-day availabilityView left open past midnight to today's block when the customer comes back",
      (): void => {
        openPage();
        const today: AvailabilityView = firstBlock();
        const yesterdaysBlock: AvailabilityView = { ...today, firstDay: '2000-01-01' };
        TestBed.inject<Store<AppState>>(Store)
          .dispatch(BookingActions.SetAvailabilityView({ availabilityView: yesterdaysBlock }));

        document.dispatchEvent(new Event('visibilitychange'));

        expect(dispatched.at(-1)).toEqual(BookingActions.SetAvailabilityView({ availabilityView: today }));
      },
    );
  },
);
