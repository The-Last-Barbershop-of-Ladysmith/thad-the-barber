import { NO_ERRORS_SCHEMA, Signal, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { testFirstBlock } from '../../../testing/test-availability';
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
import { AvailabilityView } from './models/availability-view.model';
import { BookingForm } from './models/booking-form.model';
import { BookingStep } from './models/booking-step.model';
import { StepView } from './models/step-view.model';
import * as BookingActions from './state/booking.actions';
import { openUpcomingDays, reloadAvailability } from './state/booking.effects';
import { bookingFeature } from './state/booking.feature';

/** The page's protected members the spec drives, read by name so the class stays unchanged. */
interface BookingPage {
  bookingForm: BookingForm;
  confirm: () => void;
  openStep: () => BookingStep;
  showStep: (step: BookingStep) => void;
  changeFromReview: (step: BookingStep) => void;
  stepViews: () => StepView[];
  hasUnconfirmedPick: Signal<boolean>;
  isRescheduling: Signal<boolean>;
}

type BookingRequestAction = ReturnType<typeof BookingActions.BookingRequest>;

const TODAY: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
const FIRST_TIME: string = `${TODAY}T20:00:00Z`;
const SECOND_TIME: string = `${TODAY}T20:30:00Z`;

const takenTimeNotice: Notice = {
  severity: NoticeSeverity.Warn,
  text: 'Made-up taken time.',
  canRetry: false,
};

describe(
  'Booking',
  (): void => {
    let fixture: ComponentFixture<Booking>;
    let page: BookingPage;
    let store: Store<AppState>;
    let isBotCheckFailed: WritableSignal<boolean>;
    let dispatched: Action[];

    beforeEach((): void => {
      isBotCheckFailed = signal(false);
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          // The page opens and reloads its days through these; sending is left to the effects' own spec.
          provideEffects({ openUpcomingDays, reloadAvailability }),
          provideRouter([]),
          { provide: SessionService, useValue: { isBotCheckFailed } },
        ],
      });
      // Only the page's own messages render; the steps and the layout have their own specs.
      TestBed.overrideComponent(
        Booking,
        { set: { imports: [ReactiveFormsModule, NoticeMessage], schemas: [NO_ERRORS_SCHEMA] } },
      );
      store = TestBed.inject<Store<AppState>>(Store);
    });

    /** Opens the page as after a reload, with `savedConfirmations` on this device; with `bookingId`, to move it. */
    function openPage(savedConfirmations: BookingConfirmation[] = [], bookingId?: string): void {
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      store.dispatch(BookingActions.SavedConfirmationsAdopt({ savedConfirmations }));
      fixture = TestBed.createComponent(Booking);
      if (bookingId) {
        fixture.componentRef.setInput('id', bookingId);
      }
      fixture.detectChanges();
      page = fixture.componentInstance as unknown as BookingPage;
      dispatched = [];
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
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
        store.dispatch(BookingActions.BookingShownHere({ bookingId: 'made-up-earlier-visit' }));
        openPage();

        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toBeNull();
        expect(store.selectSignal(bookingFeature.selectAvailabilityView)()).toEqual(testFirstBlock());
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
      'sends the booking with an E.164 phone, retries it with the same key, and a changed time gets a new one',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingRequestFailure({ notice: takenTimeNotice }));
        page.confirm();
        store.dispatch(BookingActions.BookingRequestFailure({ notice: takenTimeNotice }));
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
      'drops a taken time and opens the time step, keeping the notice that follows',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingTimeTaken());
        store.dispatch(BookingActions.BookingRequestFailure({ notice: takenTimeNotice }));

        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Time);
        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toEqual(takenTimeNotice);
      },
    );

    it(
      'drops the picked day and opens the date step when reloaded days leave it with none, keeping the notice',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingRequestFailure({ notice: takenTimeNotice }));
        store.dispatch(BookingActions.AvailabilityRequestSuccess({
          availabilityView: testFirstBlock(),
          availableDays: [{ date: '2099-01-01', times: ['2099-01-01T20:00:00Z'] }],
        }));

        expect(page.bookingForm.controls.date.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Date);
        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toEqual(takenTimeNotice);
      },
    );

    it(
      'clears a failure notice once the customer changes anything',
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        store.dispatch(BookingActions.BookingRequestFailure({ notice: takenTimeNotice }));
        page.bookingForm.controls.name.setValue('Other Customer');

        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()).toBeNull();
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
      "confirms the booking here, ready for another, when the booking's own page doesn't open",
      (): void => {
        openPage();
        fillInAndConfirm(FIRST_TIME);
        succeed();
        store.dispatch(BookingActions.BookingShownHere({ bookingId: 'made-up' }));
        fixture.detectChanges();

        expect(store.selectSignal(bookingFeature.selectSubmitNotice)()?.link?.path).toBe('/book/manage/made-up');
        expect(page.bookingForm.controls.date.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Date);
        fillInAndConfirm(SECOND_TIME);
        expect(sentBookings()).toHaveLength(2);
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
        pick(FIRST_TIME);
        page.showStep(BookingStep.Review);
        expect(page.openStep()).toBe(BookingStep.Details);
      },
    );

    it(
      'comes back to review after a time is changed from it',
      (): void => {
        openPage();
        page.bookingForm.controls.name.setValue('Test Customer');
        page.bookingForm.controls.phone.setValue('(555) 010-0199');
        pick(FIRST_TIME);
        page.showStep(BookingStep.Review);

        page.changeFromReview(BookingStep.Time);
        expect(page.openStep()).toBe(BookingStep.Time);
        page.bookingForm.controls.startAt.setValue(SECOND_TIME);
        expect(page.openStep()).toBe(BookingStep.Review);
      },
    );

    it(
      "clears the last day's time when another day is picked",
      (): void => {
        openPage();
        pick(FIRST_TIME);

        page.bookingForm.controls.date.setValue('2099-01-01');

        expect(page.bookingForm.controls.startAt.value).toBeNull();
        expect(page.openStep()).toBe(BookingStep.Time);
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
      'says there is an upcoming booking, with no time, and links to the list of them',
      (): void => {
        openPage([testConfirmationIn(1, 'made-up-tomorrow')]);

        expect(byTestId('upcoming-booking')?.querySelector('[data-testid="notice-link"]')?.getAttribute('href'))
          .toBe('/book/manage');
        expect(byTestId('upcoming-booking')?.textContent).not.toMatch(/\d:\d\d/);
      },
    );

    it(
      'says nothing when no booking is kept or every kept one has started',
      (): void => {
        openPage([testConfirmationIn(-1, 'made-up-yesterday')]);

        expect(byTestId('upcoming-booking')).toBeNull();
      },
    );

    it(
      'shows a booking saved in another tab while the page is open',
      (): void => {
        openPage();
        store.dispatch(BookingActions.SavedConfirmationsAdopt({
          savedConfirmations: [testConfirmationIn(1, 'made-up-other-tab')],
        }));

        expect(byTestId('upcoming-booking')).not.toBeNull();
      },
    );

    it(
      "moves a 31-day view left open past midnight to today's block when the customer comes back",
      (): void => {
        openPage();
        const today: AvailabilityView = testFirstBlock();
        store.dispatch(BookingActions.SetAvailabilityView({ availabilityView: { ...today, firstDay: '2000-01-01' } }));

        document.dispatchEvent(new Event('visibilitychange'));

        expect(store.selectSignal(bookingFeature.selectAvailabilityView)()).toEqual(today);
      },
    );

    describe(
      'moving a booking (/book/manage/{id}/reschedule)',
      (): void => {
        const booked: BookingConfirmation = testConfirmationIn(3, 'made-up-booking');

        it(
          'asks for a date and time, then review, with no details step and no upcoming-booking notice',
          (): void => {
            openPage([booked], booked.id);
            pick(SECOND_TIME);

            expect(page.isRescheduling()).toBe(true);
            expect(page.stepViews().map((stepView: StepView): BookingStep => stepView.step)).toEqual([
              BookingStep.Date,
              BookingStep.Time,
              BookingStep.Review,
            ]);
            expect(page.openStep()).toBe(BookingStep.Review);
            expect(byTestId('upcoming-booking')).toBeNull();
          },
        );

        it(
          'moves it with its saved token, and never sends a new booking',
          (): void => {
            openPage([booked], booked.id);
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
          "says the booking can't be found, with no form, without its token",
          (): void => {
            openPage([], 'made-up-unknown-booking');

            expect(byTestId('reschedule-not-found')).not.toBeNull();
            expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
          },
        );
      },
    );
  },
);
