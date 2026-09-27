import type { BookingState } from '../features/booking/state/booking.state';
import type { HomeState } from '../features/home/state/home.state';
import type { LayoutState } from './app.feature';

/**
 * Shape of the whole store. `layout` is registered at bootstrap; the feature slices are
 * registered lazily by their routes, so they're optional until that route has loaded.
 */
export interface AppState {
  layout: LayoutState;
  home?: HomeState;
  booking?: BookingState;
}
