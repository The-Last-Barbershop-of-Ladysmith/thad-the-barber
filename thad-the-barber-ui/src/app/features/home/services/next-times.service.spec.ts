import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ANONYMOUS_REQUEST } from '../../../core/interceptors/anonymous-request.token';
import { NEXT_TIMES_URL, NextTimesService } from './next-times.service';

describe(
  'NextTimesService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'asks for six times without a session token',
      (): void => {
        let times: string[] | undefined;
        TestBed.inject(NextTimesService).getNextTimes().subscribe((result: string[]): void => {
          times = result;
        });

        const request: TestRequest = TestBed.inject(HttpTestingController)
          .expectOne((candidate: HttpRequest<unknown>): boolean => candidate.url === NEXT_TIMES_URL);
        request.flush(['2026-10-04T20:00:00Z']);

        expect(request.request.params.get('count')).toBe('6');
        expect(request.request.context.get(ANONYMOUS_REQUEST)).toBe(true);
        expect(times).toEqual(['2026-10-04T20:00:00Z']);
      },
    );
  },
);
