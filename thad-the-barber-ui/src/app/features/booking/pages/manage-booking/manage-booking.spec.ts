import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { Confirmation, ConfirmationService, MessageService, ToastMessageOptions } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { Mock } from 'vitest';
import { testConfirmationIn } from '../../../../../testing/test-booking';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../dtos/booking-confirmation.dto';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { BookingService } from '../../services/booking.service';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { ManageBooking } from './manage-booking';

const BOOKING_ID: string = 'made-up-booking';
const savedTomorrow: BookingConfirmation = testConfirmationIn(1, BOOKING_ID);

const upcoming: ManagedBooking = {
  id: BOOKING_ID,
  startAt: savedTomorrow.startAt,
  isCancelled: false,
  canChange: true,
};

const cancelled: ManagedBooking = {
  ...upcoming,
  isCancelled: true,
  canChange: false,
};

interface PageSetup {
  fragment?: string | null;
  navigationState?: object | null;
  savedConfirmations?: BookingConfirmation[];
}

describe(
  'ManageBooking',
  (): void => {
    let fixture: ComponentFixture<ManageBooking>;
    let tokensSent: string[];
    let responses: Subject<ManagedBooking>[];
    let navigateByUrl: Mock;
    let toasts: ToastMessageOptions[];
    let cancelTokens: string[];
    let cancelResponses: Subject<ManagedBooking>[];
    let dispatched: Action[];

    function getBooking(_id: string, manageToken: string): Observable<ManagedBooking> {
      const response: Subject<ManagedBooking> = new Subject<ManagedBooking>();
      tokensSent.push(manageToken);
      responses.push(response);
      return response;
    }

    function cancelBooking(_id: string, manageToken: string): Observable<ManagedBooking> {
      const response: Subject<ManagedBooking> = new Subject<ManagedBooking>();
      cancelTokens.push(manageToken);
      cancelResponses.push(response);
      return response;
    }

    async function openPage({
      fragment = 't=made-up-link-token',
      navigationState = null,
      savedConfirmations = [],
    }: PageSetup = {}): Promise<void> {
      TestBed.configureTestingModule({
        providers: [
          // The booking routes provide it in the app.
          ConfirmationService,
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          { provide: BookingService, useValue: { getBooking, cancelBooking } },
          { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
          {
            provide: Router,
            useValue: {
              currentNavigation: (): object | null => (navigationState ? { extras: { state: navigationState } } : null),
              navigateByUrl,
            },
          },
          {
            provide: MessageService,
            useValue: {
              add: (toast: ToastMessageOptions): void => {
                toasts.push(toast);
              },
            },
          },
        ],
      });
      // Only the page's own messages render; the PrimeNG parts and the backdrop are left out.
      TestBed.overrideComponent(
        ManageBooking,
        { set: { imports: [NoticeMessage], schemas: [NO_ERRORS_SCHEMA] } },
      );
      // Compiled with the overridden imports before anything is injected.
      await TestBed.compileComponents();
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      store.dispatch(BookingActions.SavedConfirmationsAdopt({ savedConfirmations }));
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
      fixture = TestBed.createComponent(ManageBooking);
      fixture.componentRef.setInput('id', BOOKING_ID);
      fixture.detectChanges();
    }

    function respond(managedBooking: ManagedBooking): void {
      responses.at(-1)?.next(managedBooking);
      fixture.detectChanges();
    }

    function fail(status: number, code: string): void {
      responses.at(-1)?.error(new HttpErrorResponse({ status, error: { code } }));
      fixture.detectChanges();
    }

    function byTestId(testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
    }

    beforeEach((): void => {
      tokensSent = [];
      responses = [];
      navigateByUrl = vi.fn().mockResolvedValue(true);
      toasts = [];
      cancelTokens = [];
      cancelResponses = [];
      dispatched = [];
    });

    it(
      "loads the booking with the link's token, then moves the token from the address bar into the navigation state",
      async (): Promise<void> => {
        await openPage({ navigationState: { isJustBooked: true } });

        expect(tokensSent).toEqual(['made-up-link-token']);
        expect(navigateByUrl).toHaveBeenCalledWith(
          '/book/manage/made-up-booking',
          {
            replaceUrl: true,
            state: { isJustBooked: true, manageToken: 'made-up-link-token' },
          },
        );
        expect(byTestId('manage-loading')).not.toBeNull();
      },
    );

    it(
      'uses the token kept in the navigation state after a reload',
      async (): Promise<void> => {
        await openPage({ fragment: null, navigationState: { manageToken: 'made-up-kept-token' } });

        expect(tokensSent).toEqual(['made-up-kept-token']);
        expect(navigateByUrl).not.toHaveBeenCalled();
      },
    );

    it(
      'uses the token saved on this device when opened from the list',
      async (): Promise<void> => {
        await openPage({ fragment: null, savedConfirmations: [savedTomorrow] });

        expect(tokensSent).toEqual([savedTomorrow.manageToken]);
      },
    );

    it(
      "shows the booking as not found, without asking the API, when there's no token",
      async (): Promise<void> => {
        await openPage({ fragment: null });

        expect(tokensSent).toEqual([]);
        expect(byTestId('booking-notice')).not.toBeNull();
        expect(byTestId('notice-retry')).toBeNull();
      },
    );

    it(
      'right after booking, shows it from the device at once, with the link to keep first, and still loads it',
      async (): Promise<void> => {
        await openPage({
          fragment: null,
          navigationState: { isJustBooked: true },
          savedConfirmations: [savedTomorrow],
        });

        expect(tokensSent).toEqual([savedTomorrow.manageToken]);
        expect(byTestId('manage-loading')).toBeNull();
        expect(byTestId('booking-confirmation')).not.toBeNull();
        expect(byTestId('appointment-time')?.textContent).toBeTruthy();
        expect((byTestId('manage-link') as HTMLInputElement | null)?.value)
          .toBe(`${window.location.origin}/book/manage/made-up-booking#t=${savedTomorrow.manageToken}`);
        expect(byTestId('copy-link')).not.toBeNull();
        expect(byTestId('add-to-calendar')).not.toBeNull();
        expect(byTestId('booking-status')).toBeNull();
      },
    );

    it(
      'replaces the saved booking with what the API says, since a reload or Back restores the just-booked state',
      async (): Promise<void> => {
        await openPage({
          fragment: null,
          navigationState: { isJustBooked: true },
          savedConfirmations: [savedTomorrow],
        });
        respond({
          ...upcoming,
          isCancelled: true,
          canChange: false,
        });

        expect(byTestId('booking-status')).not.toBeNull();
        expect(byTestId('booking-confirmation')).toBeNull();
      },
    );

    it(
      'asks the API when the booking it was opened as just booked has since started',
      async (): Promise<void> => {
        await openPage({
          fragment: null,
          navigationState: { isJustBooked: true },
          savedConfirmations: [testConfirmationIn(-1, BOOKING_ID)],
        });

        expect(tokensSent).toEqual([testConfirmationIn(-1, BOOKING_ID).manageToken]);
      },
    );

    it(
      'opened later, shows the appointment and its actions, with copy but no link field or confirmation',
      async (): Promise<void> => {
        await openPage();
        respond(upcoming);

        expect(byTestId('appointment-time')?.textContent).toBeTruthy();
        expect(byTestId('add-to-calendar')).not.toBeNull();
        expect(byTestId('copy-link')).not.toBeNull();
        expect(byTestId('manage-link')).toBeNull();
        expect(byTestId('booking-confirmation')).toBeNull();
      },
    );

    for (const changedBooking of [
      { ...upcoming, canChange: false },
      {
        ...upcoming,
        isCancelled: true,
        canChange: false,
      },
    ]) {
      it(
        `shows a ${changedBooking.isCancelled ? 'cancelled' : 'started'} booking's status and no link or actions`,
        async (): Promise<void> => {
          await openPage({ navigationState: { isJustBooked: true } });
          respond(changedBooking);

          expect(byTestId('booking-status')).not.toBeNull();
          expect(byTestId('manage-link')).toBeNull();
          expect(byTestId('copy-link')).toBeNull();
          expect(byTestId('booking-confirmation')).toBeNull();
        },
      );
    }

    it(
      "shows a booking the API can't find as not found, with no retry",
      async (): Promise<void> => {
        await openPage();
        fail(404, ProblemCode.BookingNotFound);

        expect(byTestId('booking-notice')).not.toBeNull();
        expect(byTestId('notice-retry')).toBeNull();
        expect(byTestId('managed-booking')).toBeNull();
      },
    );

    it(
      'offers a retry for any other failure, which loads again with the same token',
      async (): Promise<void> => {
        await openPage();
        fail(503, 'square_unavailable');
        byTestId('notice-retry')?.click();
        fixture.detectChanges();
        respond(upcoming);

        expect(tokensSent).toEqual(['made-up-link-token', 'made-up-link-token']);
        expect(byTestId('booking-notice')).toBeNull();
        expect(byTestId('managed-booking')).not.toBeNull();
      },
    );

    it(
      'confirms a copied link with a toast that closes on its own',
      async (): Promise<void> => {
        const writeText: Mock = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        await openPage();
        respond(upcoming);

        byTestId('copy-link')?.click();
        await vi.waitFor((): void => {
          expect(toasts).toHaveLength(1);
        });

        expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/book/manage/made-up-booking#t=made-up-link-token`);
        expect(toasts[0]?.severity).toBe('success');
        expect(toasts[0]?.sticky).toBeFalsy();
        vi.unstubAllGlobals();
      },
    );

    it(
      'warns, until closed, when the browser refuses to copy or has no clipboard',
      async (): Promise<void> => {
        for (const clipboard of [{ writeText: vi.fn().mockRejectedValue(new Error('denied')) }, undefined]) {
          vi.stubGlobal('navigator', { clipboard });
          toasts = [];
          await openPage();
          respond(upcoming);

          byTestId('copy-link')?.click();
          await vi.waitFor((): void => {
            expect(toasts).toHaveLength(1);
          });

          expect(toasts[0]?.severity).toBe('warn');
          expect(toasts[0]?.sticky).toBe(true);
          fixture.detectChanges();
          expect(byTestId('manage-link')).not.toBeNull();
          vi.unstubAllGlobals();
          TestBed.resetTestingModule();
        }
      },
    );

    it(
      'downloads the appointment as an .ics file with its length from the shop',
      async (): Promise<void> => {
        const downloads: HTMLAnchorElement[] = [];
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement): void {
          downloads.push(this);
        });
        await openPage();
        respond({ ...upcoming, startAt: '2030-10-05T20:00:00Z' });

        byTestId('add-to-calendar')?.click();
        const [download]: HTMLAnchorElement[] = downloads;
        const icsFile: string = decodeURIComponent(download?.href.replace('data:text/calendar;charset=utf-8,', '') ?? '');

        expect(downloads).toHaveLength(1);
        expect(download?.download).toBe('appointment.ics');
        expect(download?.isConnected).toBe(false);
        expect(icsFile).toContain('DTSTART:20301005T200000Z');
        // The test shop's appointments are 30 minutes long.
        expect(icsFile).toContain('DTEND:20301005T203000Z');
        expect(icsFile).toContain(`SUMMARY:Appointment at ${TEST_SHOP.name}`);
        vi.restoreAllMocks();
      },
    );

    /** Opens the page later (not just booked) on an upcoming booking, and catches the cancel dialog it asks. */
    async function openUpcoming(): Promise<() => Confirmation | null> {
      await openPage();
      respond(upcoming);
      let asked: Confirmation | null = null;
      fixture.debugElement.injector.get(ConfirmationService).requireConfirmation$
        .subscribe((confirmation: Confirmation | null): void => {
          asked = confirmation;
        });
      return (): Confirmation | null => asked;
    }

    it(
      'offers Reschedule and Cancel on an upcoming booking, opened later or right after booking',
      async (): Promise<void> => {
        await openPage();
        respond(upcoming);

        expect(byTestId('reschedule')).not.toBeNull();
        expect(byTestId('cancel-booking')).not.toBeNull();

        TestBed.resetTestingModule();
        await openPage({
          fragment: null,
          navigationState: { isJustBooked: true },
          savedConfirmations: [savedTomorrow],
        });

        expect(byTestId('reschedule')).not.toBeNull();
        expect(byTestId('cancel-booking')).not.toBeNull();
      },
    );

    it(
      'asks before cancelling, with Keep appointment as the default, and sends nothing when kept',
      async (): Promise<void> => {
        const asked: () => Confirmation | null = await openUpcoming();

        byTestId('cancel-booking')?.click();
        asked()?.reject?.();

        expect(asked()?.header).toBe('Cancel this appointment?');
        expect(asked()?.defaultFocus).toBe('reject');
        expect(cancelTokens).toEqual([]);
      },
    );

    it(
      'cancels with the token once confirmed: the page shows it cancelled, a toast says so, and the device drops it',
      async (): Promise<void> => {
        const asked: () => Confirmation | null = await openUpcoming();

        byTestId('cancel-booking')?.click();
        asked()?.accept?.();
        cancelResponses[0]?.next(cancelled);
        cancelResponses[0]?.complete();
        fixture.detectChanges();

        expect(cancelTokens).toEqual(['made-up-link-token']);
        expect(byTestId('booking-status')).not.toBeNull();
        expect(byTestId('cancel-booking')).toBeNull();
        expect(toasts).toEqual([{ severity: 'success', summary: 'Appointment cancelled' }]);
        expect(dispatched).toContainEqual(BookingActions.SavedConfirmationRemove({ bookingId: BOOKING_ID }));
      },
    );

    it(
      'keeps the booking and offers a retry when the cancel fails, which sends it again',
      async (): Promise<void> => {
        const asked: () => Confirmation | null = await openUpcoming();
        byTestId('cancel-booking')?.click();
        asked()?.accept?.();

        cancelResponses[0]?.error(new HttpErrorResponse({ status: 500, error: { code: 'internal_error' } }));
        fixture.detectChanges();

        expect(byTestId('cancel-notice')).not.toBeNull();
        expect(byTestId('booking-status')).toBeNull();
        expect(toasts).toEqual([]);
        byTestId('cancel-notice')?.querySelector<HTMLElement>('[data-testid="notice-retry"]')?.click();
        expect(cancelTokens).toHaveLength(2);
      },
    );

    it(
      'reloads a booking that started meanwhile, so its own status says why, with no second message',
      async (): Promise<void> => {
        const asked: () => Confirmation | null = await openUpcoming();
        byTestId('cancel-booking')?.click();
        asked()?.accept?.();

        cancelResponses[0]?.error(new HttpErrorResponse({ status: 409, error: { code: ProblemCode.BookingStarted } }));
        respond({ ...upcoming, canChange: false });

        expect(tokensSent).toHaveLength(2);
        expect(byTestId('booking-status')).not.toBeNull();
        expect(byTestId('cancel-notice')).toBeNull();
      },
    );

    it(
      'opens the booking page to move it, with the token and current time in the navigation state, not the URL',
      async (): Promise<void> => {
        await openUpcoming();

        byTestId('reschedule')?.click();

        expect(navigateByUrl).toHaveBeenCalledWith(
          '/book/manage/made-up-booking/reschedule',
          { state: { manageToken: 'made-up-link-token', startAt: upcoming.startAt } },
        );
      },
    );
  },
);
