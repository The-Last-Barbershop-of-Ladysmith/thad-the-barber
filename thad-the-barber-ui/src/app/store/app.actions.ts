import { createAction } from '@ngrx/store';

export enum LayoutActionTypes {
  MenuToggle = '[Layout] Menu Toggled',
  MenuClose = '[Layout] Menu Closed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MenuToggle = createAction(
  LayoutActionTypes.MenuToggle,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MenuClose = createAction(
  LayoutActionTypes.MenuClose,
);
