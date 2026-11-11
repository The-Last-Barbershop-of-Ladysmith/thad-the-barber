import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { galleryFeature } from '../gallery/state/gallery.feature';
import * as galleryEffects from '../gallery/state/gallery.effects';
import * as homeEffects from './state/home.effects';
import { Home } from './home';

/**
 * The gallery slice and the effects register only when this route activates, so no other page loads the gallery. The
 * `home` slice is a root reducer (`app.config.ts`) because the header and footer read it.
 */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(galleryFeature),
      provideEffects(homeEffects, galleryEffects),
    ],
    component: Home,
  },
];
