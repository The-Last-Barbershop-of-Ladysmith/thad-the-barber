import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { Mock } from 'vitest';
import { testConfirmation } from '../../../../../testing/test-booking';
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
const TOMORROW: string = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const upcoming: ManagedBooking = {
  id: BOOKING_ID,
  startAt: TOMORROW,
  isCancelled: false,
  canChange: true,
};

interface PageSetup {
  fragment?: string | null;
  historyState?: object | null;
  savedConfirmations?: BookingConfirmation[];
}

describe(
  'ManageBooking',
  (): void => {
    let fixture: ComponentFixture<ManageBooking>;
    let tokensSent: string[];
    let responses: Subject<ManagedBooking>[];
    let replaceState: Mock;
    let toasts: ToastMessageOptions[];

    function getBooking(_id: string, manageToken: string): Observable<ManagedBooking> {
      const response: Subject<ManagedBooking> = new Subject<ManagedBooking>();
      tokensSent.push(manageToken);
      responses.push(response);
      return response;
    }

    function openPage({
      fragment = 't=made-up-link-token',
      historyState = null,
      savedConfirmations = [],
    }: PageSetup = {}): void {
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          { provide: BookingService, useValue: { getBooking } },
          { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
          { provide: Location, useValue: { getState: (): unknown => historyState, replaceState } },
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
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      store.dispatch(BookingActions.SavedConfirmationsAdopt({ savedConfirmations }));
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
      replaceState = vi.fn();
      toasts = [];
    });

    it(
      "loads the booking with the link's token, then clears the token from the address bar into history.state",
      (): void => {
        openPage({ historyState: { isJustBooked: true } });

        expect(tokensSent).toEqual(['made-up-link-token']);
        expect(replaceState).toHaveBeenCalledWith(
          '/book/manage/made-up-booking',
          '',
          { isJustBooked: true, manageToken: 'made-up-link-token' },
        );
        expect(byTestId('manage-loading')).not.toBeNull();
      },
    );

    it(
      'uses the token kept in history.state after a reload',
      (): void => {
        openPage({ fragment: null, historyState: { manageToken: 'made-up-kept-token' } });

        expect(tokensSent).toEqual(['made-up-kept-token']);
        expect(replaceState).not.toHaveBeenCalled();
      },
    );

    it(
      'uses the token saved on this device when opened from the list',
      (): void => {
        openPage({ fragment: null, savedConfirmations: [testConfirmation(TOMORROW, BOOKING_ID)] });

        expect(tokensSent).toEqual([testConfirmation(TOMORROW, BOOKING_ID).manageToken]);
      },
    );

    it(
      "shows the booking as not found, without asking the API, when there's no token",
      (): void => {
        openPage({ fragment: null });

        expect(tokensSent).toEqual([]);
        expect(byTestId('booking-notice')).not.toBeNull();
        expect(byTestId('notice-retry')).toBeNull();
      },
    );

    it(
      "right after booking, says it's booked and puts the link to keep first, with copy and calendar buttons",
      (): void => {
        openPage({ historyState: { isJustBooked: true } });
        respond(upcoming);

        expect(byTestId('booking-confirmation')).not.toBeNull();
        expect(byTestId('appointment-time')?.textContent).toBeTruthy();
        expect((byTestId('manage-link') as HTMLInputElement | null)?.value)
          .toBe(`${window.location.origin}/book/manage/made-up-booking#t=made-up-link-token`);
        expect(byTestId('copy-link')).not.toBeNull();
        expect(byTestId('add-to-calendar')).not.toBeNull();
        expect(byTestId('booking-status')).toBeNull();
      },
    );

    it(
      'opened later, shows the appointment and its actions, with copy but no link field or confirmation',
      (): void => {
        openPage();
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
        (): void => {
          openPage({ historyState: { isJustBooked: true } });
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
      (): void => {
        openPage();
        fail(404, ProblemCode.BookingNotFound);

        expect(byTestId('booking-notice')).not.toBeNull();
        expect(byTestId('notice-retry')).toBeNull();
        expect(byTestId('managed-booking')).toBeNull();
      },
    );

    it(
      'offers a retry for any other failure, which loads again with the same token',
      (): void => {
        openPage();
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
        openPage();
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
          openPage();
          respond(upcoming);

          byTestId('copy-link')?.click();
          await vi.waitFor((): void => {
            expect(toasts).toHaveLength(1);
          });

          expect(toasts[0]?.severity).toBe('warn');
          expect(toasts[0]?.sticky).toBe(true);
          vi.unstubAllGlobals();
          TestBed.resetTestingModule();
        }
      },
    );

    it(
      'downloads the appointment as an .ics file with its length from the shop',
      async (): Promise<void> => {
        let file: Blob | null = null;
        vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource): string => {
          file = blob as Blob;
          return 'blob:made-up';
        });
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => undefined);
        const click: Mock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation((): void => undefined);
        openPage();
        respond({ ...upcoming, startAt: '2030-10-05T20:00:00Z' });

        byTestId('add-to-calendar')?.click();
        const icsFile: string = await (file as Blob | null)?.text() ?? '';

        expect(click).toHaveBeenCalledTimes(1);
        expect(icsFile).toContain('DTSTART:20301005T200000Z');
        // The test shop's appointments are 30 minutes long.
        expect(icsFile).toContain('DTEND:20301005T203000Z');
        expect(icsFile).toContain(`SUMMARY:Appointment at ${TEST_SHOP.name}`);
        vi.restoreAllMocks();
      },
    );
  },
);
