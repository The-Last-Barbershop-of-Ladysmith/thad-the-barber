import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ANONYMOUS_REQUEST } from '../../../core/interceptors/anonymous-request.token';
import { HomeContent } from '../models/home.models';
import { HomeContentService, REVIEWS_URL } from './home-content.service';

describe(
  'HomeContentService',
  (): void => {
    const content: HomeContent = {
      testimonials: [
        {
          id: 'review-0',
          quote: 'Made-up text',
          author: 'Avery Testwell',
          source: 'Customer review',
          rating: 5,
        },
      ],
      rating: {
        score: 4.5,
        count: 12,
        url: null,
      },
    };

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'gets the reviews from the API without a session token',
      (): void => {
        let loaded: HomeContent | undefined;
        TestBed.inject(HomeContentService).getContent().subscribe((result: HomeContent): void => {
          loaded = result;
        });

        const request: TestRequest = TestBed.inject(HttpTestingController)
          .expectOne((candidate: HttpRequest<unknown>): boolean => candidate.url === REVIEWS_URL);
        request.flush(content);

        expect(request.request.context.get(ANONYMOUS_REQUEST)).toBe(true);
        expect(loaded).toEqual(content);
      },
    );
  },
);
