import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AvailableDay } from '../dtos/available-day.dto';
import { AVAILABILITY_URL, AvailabilityService } from './availability.service';

describe(
  'AvailabilityService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      "gets a day range's open days from the API, both days included",
      (): void => {
        const availableDays: AvailableDay[] = [{ date: '2026-10-03', times: ['2026-10-03T20:00:00Z'] }];
        let result: AvailableDay[] | undefined;
        TestBed.inject(AvailabilityService).getAvailableDays({ firstDay: '2026-10-01', lastDay: '2026-10-31' }).subscribe((days: AvailableDay[]): void => {
          result = days;
        });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(`${AVAILABILITY_URL}?from=2026-10-01&to=2026-10-31`);
        call.flush(availableDays);

        expect(call.request.method).toBe('GET');
        expect(result).toEqual(availableDays);
      },
    );
  },
);
