import { type MemoizedSelector } from '@ngrx/store';

/**
 * The per-property selectors `createFeature` generates (`selectSlots`, `selectStatus`, ...), which it
 * passes to `extraSelectors`. NgRx does not export this type, so it is mirrored here.
 */
export type FeatureSelectors<State> = {
  [Key in keyof State & string as `select${Capitalize<Key>}`]: MemoizedSelector<object, State[Key]>;
};
