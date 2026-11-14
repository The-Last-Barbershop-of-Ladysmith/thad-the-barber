import { ErrorHandler, Provider } from '@angular/core';
import { appConfig } from './app.config';
import { ErrorToastService } from './core/telemetry/error-toast.service';

describe(
  'appConfig',
  (): void => {
    it(
      'makes the error toast service the one ErrorHandler, so the toast shows with or without App Insights',
      (): void => {
        const errorHandlers: Provider[] = appConfig.providers.filter(
          (provider: unknown): boolean => (provider as { provide?: unknown; }).provide === ErrorHandler,
        ) as Provider[];

        expect(errorHandlers).toEqual([{ provide: ErrorHandler, useExisting: ErrorToastService }]);
      },
    );
  },
);
