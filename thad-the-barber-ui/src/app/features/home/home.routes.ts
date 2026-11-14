import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { galleryFeature } from '../gallery/state/gallery.feature';
import { homeFeature } from './state/home.feature';
import { reviewsFeature } from '../reviews/state/reviews.feature';
import * as galleryEffects from '../gallery/state/gallery.effects';
import * as reviewsEffects from '../reviews/state/reviews.effects';
import * as homeEffects from './state/home.effects';
import { Home } from './home';

/**
 * The home, gallery and reviews slices and their effects register only when this route activates, so no other page
 * loads them.
 */
export const HOME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(homeFeature),
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
