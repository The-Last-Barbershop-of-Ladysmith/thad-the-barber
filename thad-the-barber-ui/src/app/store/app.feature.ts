import { createFeature } from '@ngrx/store';
import { layoutReducer } from './app.reducer';

/** Consumers import `layoutFeature` and read its generated selectors from it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const layoutFeature = createFeature({
  name: 'layout',
  reducer: layoutReducer,
});
