import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
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
import { BookingConfirmation } from './models/booking-confirmation.model';
import { BookingForm } from './models/booking-form.model';
import { BookingNotice } from './models/booking-notice.model';
import { BookingStep } from './models/booking-step.model';
import { BookingRequest } from './models/booking-request.model';
import { SavedConfirmation } from './models/saved-confirmation.model';
import { BookingService } from './services/booking.service';
import * as BookingActions from './state/booking.actions';
import { bookingFeature } from './state/booking.feature';

/** The page's protected members the spec drives, read by name so the class stays unchanged. */
interface BookingPage {
  bookingForm: BookingForm;
  confirm: () => void;
  bookingNotice: () => BookingNotice | null;
  bookedNotice: () => BookingNotice | null;
  openStep: () => BookingStep;
  showStep: (step: BookingStep) => void;
  changeFromReview: (step: BookingStep) => void;
}

const TODAY: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
const FIRST_TIME: string = `${TODAY}T20:00:00Z`;
const SECOND_TIME: string = `${TODAY}T20:30:00Z`;
const TOMORROW: string = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
        expect(dispatched).toContainEqual(BookingActions.SetActiveMonthView({ month: null }));
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
        expect(dispatched).toContainEqual(BookingActions.SetActiveMonthView({ month: null }));
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

        expect(TestBed.inject<Store<AppState>>(Store).selectSignal(bookingFeature.selectVisibleMonth)()).toBeNull();
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
  },
);
