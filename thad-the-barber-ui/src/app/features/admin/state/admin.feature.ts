import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { AdminSession } from '../models/admin-session.model';
import { adminReducer } from './admin.reducer';
import { AdminState } from './admin.state';

/** Selectors derived from the generated ones; exposed on `adminFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type AdminExtraSelectors = {
  selectIsSignedIn: MemoizedSelector<object, boolean>;
  selectEmail: MemoizedSelector<object, string>;
  selectName: MemoizedSelector<object, string | null>;
};

export const adminFeatureKey: 'admin' = 'admin' as const;

/**
 * Registered with the admin routes, so the public site never loads it. Not saved: `AdminSessionStorage` keeps the
 * sign-in and restores who is signed in after a reload.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const adminFeature = createFeature({
  name: adminFeatureKey,
  reducer: adminReducer,
  extraSelectors: ({ selectSession }: FeatureSelectors<AdminState>): AdminExtraSelectors => ({
    selectIsSignedIn: createSelector(
      selectSession,
      (session: AdminSession | null): boolean => session !== null,
    ),
    selectEmail: createSelector(
      selectSession,
      (session: AdminSession | null): string => session?.email ?? '',
    ),
    selectName: createSelector(
      selectSession,
      (session: AdminSession | null): string | null => session?.name ?? null,
    ),
  }),
});
