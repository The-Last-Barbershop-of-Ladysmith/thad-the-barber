import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { galleryFeature } from '../gallery/state/gallery.feature';
import { reviewsFeature } from '../reviews/state/reviews.feature';
import * as galleryEffects from '../gallery/state/gallery.effects';
import * as reviewsEffects from '../reviews/state/reviews.effects';
import * as homeEffects from './state/home.effects';
import { Home } from './home';

/**
 * The gallery and reviews slices and their effects register only when this route activates, so no other page loads
 * them. The `home` slice is a root reducer (`app.config.ts`) because its SMS signup is saved to localStorage.
 */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(galleryFeature),
      provideState(reviewsFeature),
      provideEffects(
        homeEffects,
        galleryEffects,
        reviewsEffects,
      ),
    ],
    component: Home,
  },
];
