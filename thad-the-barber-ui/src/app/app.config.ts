import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  CSP_NONCE,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { MessageService } from 'primeng/api';
import { PrimeNG, providePrimeNG } from 'primeng/config';
import { PRIMEUI_LICENSE } from './core/config/primeui-license';
import { sessionInterceptor } from './core/interceptors/session.interceptor';
import { routes } from './app.routes';
import * as bookingTabsEffects from './features/booking/state/booking-tabs.effects';
import * as announcementsEffects from './store/announcements/announcements.effects';
import { announcementsFeature } from './store/announcements/announcements.feature';
import * as appEffects from './store/app.effects';
import { layoutFeature } from './store/app.feature';
import { metaReducers } from './store/meta/meta.reducers';
import * as shopEffects from './features/shop/state/shop.effects';
import { shopFeature } from './features/shop/state/shop.feature';
import { bookingFeature } from './features/booking/state/booking.feature';
import { homeFeature } from './features/home/state/home.feature';
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
    // Shop, home and announcements are root reducers, not `provideState`, because the header and footer read them on
    // every page.
    // Shop and booking also save only part of their slice (`shopInfo`, `savedConfirmation`), and a partial saved copy
    // merged before `provideState` would drop the rest.
    provideStore(
      {
        [layoutFeature.name]: layoutFeature.reducer,
        [shopFeature.name]: shopFeature.reducer,
        [homeFeature.name]: homeFeature.reducer,
        [announcementsFeature.name]: announcementsFeature.reducer,
        [bookingFeature.name]: bookingFeature.reducer,
      },
      { metaReducers },
    ),
    provideEffects(
      appEffects,
      shopEffects,
      announcementsEffects,
      bookingTabsEffects,
    ),
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
