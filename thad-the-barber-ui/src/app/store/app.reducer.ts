import { ActionReducer, createReducer, on } from '@ngrx/store';
import * as LayoutActions from './app.actions';
import { LayoutState, initialLayoutState } from './app.state';

export const layoutReducer: ActionReducer<LayoutState> = createReducer(
  initialLayoutState,
  on(LayoutActions.MenuToggle, (state: LayoutState): LayoutState => ({ ...state, menuOpen: !state.menuOpen })),
  on(LayoutActions.MenuClose, (state: LayoutState): LayoutState => ({ ...state, menuOpen: false })),
);
