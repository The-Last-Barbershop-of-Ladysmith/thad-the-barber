import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { Mock } from 'vitest';
import { TEST_TELEMETRY_SETTINGS } from '../../../testing/test-telemetry-settings';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { ErrorToastService } from './error-toast.service';
import { startTelemetry } from './start-telemetry';

interface SdkSpies {
  trackException: Mock;
  trackPageView: Mock;
}

const sdk: SdkSpies = vi.hoisted((): SdkSpies => ({
  trackException: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock(
  '@microsoft/applicationinsights-web',
  (): Record<string, unknown> => ({
    DistributedTracingModes: { W3C: 2 },
    ApplicationInsights: class {
      trackException: Mock = sdk.trackException;
      trackPageView: Mock = sdk.trackPageView;
      loadAppInsights: Mock = vi.fn();
      addTelemetryInitializer: Mock = vi.fn();
      getTraceCtx: Mock = vi.fn();
    },
  }),
);

describe(
  'startTelemetry',
  (): void => {
    let router: Router;
    let errorToast: ErrorToastService;

    beforeEach((): void => {
      sdk.trackException.mockClear();
      sdk.trackPageView.mockClear();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: MessageService, useValue: { add: vi.fn() } },
        ],
      });
      router = TestBed.inject(Router);
      errorToast = TestBed.inject(ErrorToastService);
      vi.spyOn(console, 'error').mockReturnValue(undefined);
    });

    afterEach((): void => {
      vi.restoreAllMocks();
    });

    it(
      'sends an uncaught error as an exception',
      (): void => {
        const error: Error = new Error('made-up error');
        startTelemetry(
          TEST_TELEMETRY_SETTINGS,
          router,
          errorToast,
        );

        errorToast.handleError(error);

        expect(sdk.trackException).toHaveBeenCalledExactlyOnceWith({ exception: error });
      },
    );

    it(
      'wraps a thrown value that is not an Error',
      (): void => {
        startTelemetry(
          TEST_TELEMETRY_SETTINGS,
          router,
          errorToast,
        );

        errorToast.handleError('made-up failure');

        expect(sdk.trackException).toHaveBeenCalledExactlyOnceWith({ exception: new Error('made-up failure') });
      },
    );

    it(
      'tracks the page the visitor landed on straight away',
      async (): Promise<void> => {
        await router.navigateByUrl('/made-up-landing?secret=1');

        startTelemetry(
          TEST_TELEMETRY_SETTINGS,
          router,
          errorToast,
        );

        expect(sdk.trackPageView).toHaveBeenCalledOnce();
        expect(sdk.trackPageView).toHaveBeenNthCalledWith(1, { uri: expect.stringContaining('/made-up-landing') as unknown });
      },
    );

    it(
      'leaves the landing page to NavigationEnd while the first navigation is still running',
      async (): Promise<void> => {
        startTelemetry(
          TEST_TELEMETRY_SETTINGS,
          router,
          errorToast,
        );

        expect(sdk.trackPageView).not.toHaveBeenCalled();
        await router.navigateByUrl('/made-up-landing');

        expect(sdk.trackPageView).toHaveBeenCalledOnce();
      },
    );

    it(
      'tracks each later navigation once',
      async (): Promise<void> => {
        await router.navigateByUrl('/made-up-landing');
        startTelemetry(
          TEST_TELEMETRY_SETTINGS,
          router,
          errorToast,
        );

        await router.navigateByUrl('/made-up-next');

        expect(sdk.trackPageView).toHaveBeenCalledTimes(2);
        expect(sdk.trackPageView).toHaveBeenNthCalledWith(2, { uri: expect.stringContaining('/made-up-next') as unknown });
      },
    );
  },
);
