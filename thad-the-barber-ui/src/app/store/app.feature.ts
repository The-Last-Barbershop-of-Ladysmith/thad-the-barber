import { createFeature, createReducer, on } from '@ngrx/store';
import { LayoutActions } from './app.actions';

/** App-wide UI state shared by layout components. Feature data lives in each feature's own state folder. */
export interface LayoutState { menuOpen: boolean; }

export const initialLayoutState: LayoutState = { menuOpen: false };

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const layoutFeature = createFeature({
  name: 'layout',
  reducer: createReducer(
    initialLayoutState,
    on(
      LayoutActions.menuToggled,
      (state: LayoutState): LayoutState => ({
        ...state,
        menuOpen: !state.menuOpen,
      }),
    ),
    on(
      LayoutActions.menuClosed,
      (state: LayoutState): LayoutState => ({
        ...state,
        menuOpen: false,
      }),
    ),
  ),
});

export const {
  selectLayoutState,
  selectMenuOpen,
}: typeof layoutFeature = layoutFeature;
