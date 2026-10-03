import { createActionGroup, emptyProps } from '@ngrx/store';

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionGroup type.
export const LayoutActions = createActionGroup({
  source: 'Layout',
  events: { 'Menu Toggled': emptyProps(), 'Menu Closed': emptyProps() },
});
