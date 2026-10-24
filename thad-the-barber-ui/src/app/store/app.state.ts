/** App-wide UI state shared by layout components. Feature data lives in each feature's own state folder. */
export interface LayoutState { menuOpen: boolean; }

export const initialLayoutState: LayoutState = { menuOpen: false };

/**
 * The root store's own state. Every other slice (`shop` and `home` at the root, `booking` with its route) is
 * independent: its `createFeature` selectors read it by key, so nothing here lists them.
 */
export interface AppState {
  layout: LayoutState;
}
