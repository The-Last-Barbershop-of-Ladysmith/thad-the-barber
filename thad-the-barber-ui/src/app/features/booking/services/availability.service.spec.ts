import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AvailableDay } from '../models/available-day.model';
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
      "gets a month's open days from the API",
      (): void => {
        const availableDays: AvailableDay[] = [{ date: '2026-10-03', times: ['2026-10-03T20:00:00Z'] }];
        let result: AvailableDay[] | undefined;
        TestBed.inject(AvailabilityService).getAvailableDays('2026-10').subscribe((days: AvailableDay[]): void => {
          result = days;
        });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(`${AVAILABILITY_URL}?month=2026-10`);
        call.flush(availableDays);

        expect(call.request.method).toBe('GET');
        expect(result).toEqual(availableDays);
      },
    );
  },
);
