import { HttpErrorResponse } from '@angular/common/http';
import { Mock } from 'vitest';
import { ExceptionReporter } from './exception-reporter';

describe(
  'ExceptionReporter',
  (): void => {
    let reporter: ExceptionReporter;
    let report: Mock<(error: unknown) => void>;

    beforeEach((): void => {
      reporter = new ExceptionReporter();
      report = vi.fn();
      reporter.report = report;
    });

    it(
      'names the section and the HTTP status, and nothing else from the failure',
      (): void => {
        const failure: HttpErrorResponse = new HttpErrorResponse({
          status: 503,
          url: 'https://api.test/api/reviews?phone=%2B15550100000',
          error: 'made-up body with a name',
        });

        reporter.reportLoadFailure('reviews', failure);

        expect(report).toHaveBeenCalledExactlyOnceWith(new Error('reviews failed to load (status 503)'));
      },
    );

    it(
      'says there was no response when the request never reached the server',
      (): void => {
        reporter.reportLoadFailure('gallery', new HttpErrorResponse({ status: 0 }));

        expect(report).toHaveBeenCalledExactlyOnceWith(new Error('gallery failed to load (no response)'));
      },
    );

    it(
      'does nothing before telemetry has loaded',
      (): void => {
        reporter.report = undefined;

        expect((): void => {
          reporter.reportLoadFailure('gallery', new Error('made-up'));
        }).not.toThrow();
      },
    );
  },
);
