import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { TEST_TELEMETRY_SETTINGS } from '../../../testing/test-telemetry-settings';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { provideTelemetry } from './provide-telemetry';
import { ErrorToastService } from './error-toast.service';

vi.mock(
  '@microsoft/applicationinsights-web',
  (): Record<string, unknown> => ({
    DistributedTracingModes: { W3C: 2 },
    ApplicationInsights: class {
      loadAppInsights: () => void = vi.fn();
      addTelemetryInitializer: () => void = vi.fn();
      getTraceCtx: () => void = vi.fn();
      trackPageView: () => void = vi.fn();
    },
  }),
);

function configure(appInsightsConnectionString: string): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideStore({ [shopFeature.name]: shopFeature.reducer }),
      { provide: MessageService, useValue: { add: vi.fn() } },
      provideTelemetry({ ...TEST_TELEMETRY_SETTINGS, appInsightsConnectionString }),
    ],
  });
}

describe(
  'provideTelemetry',
  (): void => {
    it(
      'does not load the SDK when the connection string is empty',
      async (): Promise<void> => {
        configure('');

        TestBed.inject(ApplicationRef).tick();
        await vi.dynamicImportSettled();

        expect(TestBed.inject(ErrorToastService).reportError).toBeUndefined();
      },
    );

    it(
      'loads the SDK after the first render, not before',
      async (): Promise<void> => {
        configure(TEST_TELEMETRY_SETTINGS.appInsightsConnectionString);

        await vi.dynamicImportSettled();
        expect(TestBed.inject(ErrorToastService).reportError).toBeUndefined();

        TestBed.inject(ApplicationRef).tick();

        await vi.waitFor((): void => {
          expect(TestBed.inject(ErrorToastService).reportError).toBeDefined();
        });
      },
    );
  },
);
