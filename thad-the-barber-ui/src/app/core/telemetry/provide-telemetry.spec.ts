import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { MockInstance } from 'vitest';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { ErrorToastService } from './error-toast.service';
import { provideTelemetry } from './provide-telemetry';
import { TelemetrySettings } from './telemetry-settings.model';

const SETTINGS: TelemetrySettings = {
  appInsightsConnectionString: 'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://ingest.example.com/',
  apiBaseUrl: 'https://api.example.com/api',
};

function configure(settings: TelemetrySettings): MockInstance<ErrorToastService['addReporter']> {
  const addReporter: MockInstance<ErrorToastService['addReporter']> = vi.spyOn(ErrorToastService.prototype, 'addReporter');
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideStore({ [shopFeature.name]: shopFeature.reducer }),
      { provide: MessageService, useValue: { add: vi.fn() } },
      provideTelemetry(settings),
    ],
  });
  return addReporter;
}

describe(
  'provideTelemetry',
  (): void => {
    afterEach((): void => {
      vi.restoreAllMocks();
    });

    it(
      'does not load the SDK when the connection string is empty',
      async (): Promise<void> => {
        const addReporter: MockInstance<ErrorToastService['addReporter']> = configure({
          ...SETTINGS,
          appInsightsConnectionString: '',
        });

        TestBed.inject(ApplicationRef).tick();
        await TestBed.inject(ApplicationRef).whenStable();

        expect(addReporter).not.toHaveBeenCalled();
      },
    );

    it(
      'does not load the SDK before the first render',
      (): void => {
        const addReporter: MockInstance<ErrorToastService['addReporter']> = configure(SETTINGS);

        TestBed.inject(ApplicationRef);

        expect(addReporter).not.toHaveBeenCalled();
      },
    );

    it(
      'loads the SDK after the first render and reports errors to it',
      async (): Promise<void> => {
        const addReporter: MockInstance<ErrorToastService['addReporter']> = configure(SETTINGS);

        TestBed.inject(ApplicationRef).tick();

        await vi.waitFor((): void => {
          expect(addReporter).toHaveBeenCalledOnce();
        }, 15000);
      },
    );
  },
);
