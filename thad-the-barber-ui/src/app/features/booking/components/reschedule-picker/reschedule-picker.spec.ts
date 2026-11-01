import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Action, ActionsSubject, Store, provideStore } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { NoticeMessage } from '../../../../shared/components/notice-message/notice-message';
import { Notice } from '../../../../shared/models/notice.model';
import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { ManagedBooking } from '../../dtos/managed-booking.dto';
import { RescheduleRequest } from '../../dtos/reschedule-request.dto';
import { AvailabilityView } from '../../models/availability-view.model';
import { DateRange } from '../../models/date-range.model';
import { BookingService } from '../../services/booking.service';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { toBookingWindow, toUpcomingView } from '../../utils/booking-time.utils';
import { ReschedulePicker } from './reschedule-picker';

/** The picker's protected members the spec drives, read by name so the class stays unchanged. */
interface PickerPage {
  dateControl: FormControl<string | null>;
  startAtControl: FormControl<string | null>;
  notice: () => Notice | null;
  move: () => void;
}

interface RescheduleCall {
  id: string;
  manageToken: string;
  request: RescheduleRequest;
}

const NEW_TIME: string = '2030-11-02T20:30:00Z';

function firstBlock(): AvailabilityView {
  const bookingWindow: DateRange | null = toBookingWindow(TEST_SHOP.bookingSettings, TEST_SHOP.timeZone);
  if (!bookingWindow) {
    throw new Error('The test shop has a booking window.');
  }
  return toUpcomingView(bookingWindow.min, bookingWindow);
}

describe(
  'ReschedulePicker',
  (): void => {
    let fixture: ComponentFixture<ReschedulePicker>;
    let picker: PickerPage;
    let calls: RescheduleCall[];
    let responses: Subject<ManagedBooking>[];
    let dispatched: Action[];
    let rescheduled: ManagedBooking[];
    let closedCount: number;

    function rescheduleBooking(
      id: string,
      manageToken: string,
      request: RescheduleRequest,
    ): Observable<ManagedBooking> {
      const response: Subject<ManagedBooking> = new Subject<ManagedBooking>();
      calls.push({
        id,
        manageToken,
        request,
      });
      responses.push(response);
      return response;
    }

    beforeEach((): void => {
      calls = [];
      responses = [];
      dispatched = [];
      rescheduled = [];
      closedCount = 0;
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          { provide: BookingService, useValue: { rescheduleBooking } },
        ],
      });
      // The date and time steps have their own specs; only the picker's messages render here.
      TestBed.overrideComponent(
        ReschedulePicker,
        { set: { imports: [NoticeMessage], schemas: [NO_ERRORS_SCHEMA] } },
      );
      TestBed.inject(ActionsSubject).subscribe((action: Action): void => {
        dispatched.push(action);
      });
      TestBed.inject<Store<AppState>>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      fixture = TestBed.createComponent(ReschedulePicker);
      fixture.componentRef.setInput('bookingId', 'made-up-booking');
      fixture.componentRef.setInput('manageToken', 'made-up-token');
      fixture.componentInstance.rescheduled.subscribe((managedBooking: ManagedBooking): void => {
        rescheduled.push(managedBooking);
      });
      fixture.componentInstance.closed.subscribe((): void => {
        closedCount++;
      });
      fixture.detectChanges();
      picker = fixture.componentInstance as unknown as PickerPage;
    });

    function pickNewTime(): void {
      picker.dateControl.setValue('2030-11-02');
      picker.startAtControl.setValue(NEW_TIME);
      fixture.detectChanges();
    }

    function byTestId(testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
    }

    it(
      "loads the next 31 days on the shop's clock, as /book does",
      (): void => {
        expect(dispatched).toContainEqual(BookingActions.SetAvailabilityView({ availabilityView: firstBlock() }));
      },
    );

    it(
      'clears the picked time when another day is picked',
      (): void => {
        pickNewTime();

        picker.dateControl.setValue('2030-11-03');

        expect(picker.startAtControl.value).toBeNull();
      },
    );

    it(
      'moves the booking to the picked time with its token, and hands the moved booking to the page',
      (): void => {
        pickNewTime();
        byTestId('confirm-reschedule')?.click();
        const moved: ManagedBooking = {
          id: 'made-up-booking',
          startAt: NEW_TIME,
          isCancelled: false,
          canChange: true,
        };
        responses[0]?.next(moved);

        expect(calls).toEqual([
          {
            id: 'made-up-booking',
            manageToken: 'made-up-token',
            request: { startAt: NEW_TIME },
          },
        ]);
        expect(rescheduled).toEqual([moved]);
      },
    );

    it(
      'sends nothing until a new time is picked',
      (): void => {
        picker.move();

        expect(calls).toEqual([]);
      },
    );

    it(
      'drops a taken time, reloads the days and says so, with no retry',
      (): void => {
        pickNewTime();
        picker.move();
        dispatched = [];
        responses[0]?.error(new HttpErrorResponse({ status: 409, error: { code: ProblemCode.SlotUnavailable } }));

        expect(picker.startAtControl.value).toBeNull();
        expect(dispatched).toContainEqual(BookingActions.SetAvailabilityView({ availabilityView: firstBlock() }));
        expect(picker.notice()?.canRetry).toBe(false);
        expect(rescheduled).toEqual([]);
      },
    );

    it(
      'offers a retry for any other failure, which sends the same time again',
      (): void => {
        pickNewTime();
        picker.move();
        responses[0]?.error(new HttpErrorResponse({ status: 503, error: { code: 'square_unavailable' } }));
        fixture.detectChanges();

        expect(picker.notice()?.canRetry).toBe(true);
        byTestId('notice-retry')?.click();

        expect(calls.map((call: RescheduleCall): string => call.request.startAt)).toEqual([NEW_TIME, NEW_TIME]);
      },
    );

    it(
      'closes without a change on Keep current time',
      (): void => {
        byTestId('close-reschedule')?.click();

        expect(closedCount).toBe(1);
        expect(calls).toEqual([]);
      },
    );
  },
);
