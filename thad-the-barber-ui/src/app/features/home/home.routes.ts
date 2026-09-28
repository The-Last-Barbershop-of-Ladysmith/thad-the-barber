import { type Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import * as homeEffects from './state/home.effects';
import { homeFeature } from './state/home.feature';
import type { Home } from './home';

/** The home slice and effects register only when this route loads. */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(homeFeature),
      provideEffects(homeEffects),
    ],
    loadComponent: (): Promise<typeof Home> => import('./home').then((m: { Home: typeof Home; }): typeof Home => m.Home),
  },
];
