import { ActionReducer, MetaReducer } from '@ngrx/store';
import { Keys, localStorageSync } from 'ngrx-store-localstorage';
import { homeFeatureKey } from '../../features/home/state/home.feature';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { shopFeatureKey } from '../../features/shop/state/shop.feature';

/**
 * Slices persisted to localStorage, base64-encoded, each with the fields it keeps. Home clears its own with its `State
 * Reset` action.
 */
const keys: Keys = [
  // Only the signup: home's content and load statuses reload on every visit, and a saved status (a gallery that
  // failed last time) would hide that section's nav link on other pages.
  {
    [homeFeatureKey]: {
      encrypt: encodeBase64,
      decrypt: decodeBase64,
      filter: ['smsSignup'],
    },
  },
  // Only the shop itself: a saved load status would stop the next visit refreshing it.
  {
    [shopFeatureKey]: {
      encrypt: encodeBase64,
      decrypt: decodeBase64,
      filter: ['shopInfo'],
    },
  },
];

/**
 * Saves the synced slices after every action and restores them on start-up (deep-merged over their initial state).
 * Dates stay the ISO strings the slices hold: the library would otherwise turn them into `Date` objects.
 */
export function localStorageSyncReducer<State>(reducer: ActionReducer<State>): ActionReducer<State> {
  return localStorageSync({
    keys,
    rehydrate: true,
    restoreDates: false,
    checkStorageAvailability: true,
    storageKeySerializer: (sliceKey: string): string => `ttb-${sliceKey}`,
  })(reducer);
}

export const metaReducers: MetaReducer[] = [localStorageSyncReducer];
