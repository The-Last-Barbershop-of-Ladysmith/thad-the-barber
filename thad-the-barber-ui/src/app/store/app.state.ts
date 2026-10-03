import { BookingState } from '../features/booking/state/booking.state';
import { HomeState } from '../features/home/state/home.state';

/** App-wide UI state shared by layout components. Feature data lives in each feature's own state folder. */
export interface LayoutState { menuOpen: boolean; }

export const initialLayoutState: LayoutState = { menuOpen: false };

/**
 * Shape of the whole store. `layout` is registered at bootstrap; the feature slices are
 * registered lazily by their routes, so they're optional until that route has loaded.
 */
export interface AppState {
  layout: LayoutState;
  home?: HomeState;
  booking?: BookingState;
}
