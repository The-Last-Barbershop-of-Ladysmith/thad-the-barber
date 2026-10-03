import { LayoutActions } from './app.actions';
import { layoutReducer } from './app.reducer';
import { LayoutState, initialLayoutState } from './app.state';

describe(
  'layoutReducer',
  (): void => {
    it(
      'toggles the menu open and closed',
      (): void => {
        const opened: LayoutState = layoutReducer(initialLayoutState, LayoutActions.menuToggled());
        expect(opened.menuOpen).toBe(true);
        expect(layoutReducer(opened, LayoutActions.menuToggled()).menuOpen).toBe(false);
      },
    );

    it(
      'closes the menu whatever its state',
      (): void => {
        const opened: LayoutState = { menuOpen: true };
        expect(layoutReducer(opened, LayoutActions.menuClosed()).menuOpen).toBe(false);
        expect(layoutReducer(initialLayoutState, LayoutActions.menuClosed()).menuOpen).toBe(false);
      },
    );
  },
);
