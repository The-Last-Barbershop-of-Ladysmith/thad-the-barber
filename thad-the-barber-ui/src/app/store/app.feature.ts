import { createFeature } from '@ngrx/store';
import { layoutReducer } from './app.reducer';

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const layoutFeature = createFeature({
  name: 'layout',
  reducer: layoutReducer,
});

export const {
  selectLayoutState,
  selectMenuOpen,
}: typeof layoutFeature = layoutFeature;
