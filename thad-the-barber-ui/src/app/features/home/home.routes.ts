import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import * as homeEffects from './state/home.effects';
import { Home } from './home';

/** The home effects register only when this route activates; the slice is a root reducer (`app.config.ts`). */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    providers: [provideEffects(homeEffects)],
    component: Home,
  },
];
