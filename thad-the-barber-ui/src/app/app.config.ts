import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  CSP_NONCE,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { MessageService } from 'primeng/api';
import { PrimeNG, providePrimeNG } from 'primeng/config';
import { PRIMEUI_LICENSE } from './core/config/primeui-license';
import { sessionInterceptor } from './core/interceptors/session.interceptor';
import { routes } from './app.routes';
import * as appEffects from './store/app.effects';
import { layoutFeature } from './store/app.feature';
import { AppState } from './store/app.state';
import { metaReducers } from './store/meta/meta.reducers';
import { ThadPreset, themeOptions } from './theme';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideStore<AppState>({ [layoutFeature.name]: layoutFeature.reducer }, { metaReducers }),
    provideEffects(appEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    providePrimeNG({
      ripple: false,
      theme: { preset: ThadPreset, options: themeOptions },
      ...(PRIMEUI_LICENSE ? { license: PRIMEUI_LICENSE } : {}),
    }),
    // PrimeNG injects its theme styles at runtime, so they need the page's CSP nonce (from ngCspNonce in index.html).
    provideEnvironmentInitializer((): void => {
      inject(PrimeNG).csp.set({ nonce: inject(CSP_NONCE) ?? undefined });
    }),
    provideClientHydration(),
    MessageService,
  ],
};
