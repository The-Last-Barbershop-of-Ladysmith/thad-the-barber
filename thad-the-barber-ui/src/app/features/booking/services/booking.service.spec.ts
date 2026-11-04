import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { BOOKINGS_URL, BookingService } from './booking.service';

describe(
  'BookingService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'posts the booking and returns its confirmation',
      (): void => {
        const request: BookingRequest = {
          startAt: '2026-10-03T20:30:00Z',
          name: 'Test',
          phone: '+15550100199',
          idempotencyKey: '00000000-0000-4000-8000-000000000001',
        };
        const confirmation: BookingConfirmation = {
          id: 'made-up-booking',
          startAt: request.startAt,
          manageToken: 'made-up-token',
        };
        let result: BookingConfirmation | undefined;
        TestBed.inject(BookingService).createBooking(request).subscribe((booking: BookingConfirmation): void => {
          result = booking;
        });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(BOOKINGS_URL);
        call.flush(confirmation, { status: 201, statusText: 'Created' });

        expect(call.request.method).toBe('POST');
        expect(call.request.body).toEqual(request);
        expect(result).toEqual(confirmation);
      },
    );

    it(
      'cancels and reschedules a booking with its manage token in the header only',
      (): void => {
        const managedBooking: ManagedBooking = {
          id: 'made-up-booking',
          startAt: '2026-10-03T20:30:00Z',
          isCancelled: true,
          canChange: false,
        };
        const results: ManagedBooking[] = [];
        const service: BookingService = TestBed.inject(BookingService);
        service.cancelBooking('made-up-booking', 'made-up-token').subscribe((booking: ManagedBooking): void => {
          results.push(booking);
        });
        service
          .rescheduleBooking(
            'made-up-booking',
            'made-up-token',
            { startAt: '2026-10-04T20:00:00Z' },
          )
          .subscribe((booking: ManagedBooking): void => {
            results.push(booking);
          });

        const controller: HttpTestingController = TestBed.inject(HttpTestingController);
        const cancel: TestRequest = controller.expectOne(`${BOOKINGS_URL}/made-up-booking/cancel`);
        const reschedule: TestRequest = controller.expectOne(`${BOOKINGS_URL}/made-up-booking/reschedule`);
        cancel.flush(managedBooking);
        reschedule.flush(managedBooking);

        expect(cancel.request.method).toBe('POST');
        expect(cancel.request.headers.get('X-Manage-Token')).toBe('made-up-token');
        expect(reschedule.request.method).toBe('POST');
        expect(reschedule.request.body).toEqual({ startAt: '2026-10-04T20:00:00Z' });
        expect(reschedule.request.headers.get('X-Manage-Token')).toBe('made-up-token');
        expect(results).toEqual([managedBooking, managedBooking]);
      },
    );

    it(
      'gets a booking with its manage token in the header only, never the URL (BR-08)',
      (): void => {
        const managedBooking: ManagedBooking = {
          id: 'made-up/booking',
          startAt: '2026-10-03T20:30:00Z',
          isCancelled: false,
          canChange: true,
        };
        let result: ManagedBooking | undefined;
        TestBed.inject(BookingService)
          .getBooking(managedBooking.id, 'made-up-token')
          .subscribe((booking: ManagedBooking): void => {
            result = booking;
          });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(`${BOOKINGS_URL}/made-up%2Fbooking`);
        call.flush(managedBooking);

        expect(call.request.method).toBe('GET');
        expect(call.request.headers.get('X-Manage-Token')).toBe('made-up-token');
        expect(call.request.urlWithParams).not.toContain('made-up-token');
        expect(result).toEqual(managedBooking);
      },
    );
  },
);
