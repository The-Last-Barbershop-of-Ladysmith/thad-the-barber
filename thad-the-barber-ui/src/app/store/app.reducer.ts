import {
  ActionReducer,
  createReducer,
  on,
} from '@ngrx/store';
import { LayoutActions } from './app.actions';
import { LayoutState, initialLayoutState } from './app.state';

export const layoutReducer: ActionReducer<LayoutState> = createReducer(
  initialLayoutState,
  on(LayoutActions.menuToggled, (state: LayoutState): LayoutState => ({ ...state, menuOpen: !state.menuOpen })),
  on(LayoutActions.menuClosed, (state: LayoutState): LayoutState => ({ ...state, menuOpen: false })),
);
