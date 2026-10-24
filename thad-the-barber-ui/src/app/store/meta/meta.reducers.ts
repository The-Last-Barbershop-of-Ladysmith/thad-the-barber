import { ActionReducer, MetaReducer } from '@ngrx/store';
import { Keys, localStorageSync } from 'ngrx-store-localstorage';
import { bookingFeatureKey } from '../../features/booking/state/booking.feature';
import { homeFeatureKey } from '../../features/home/state/home.feature';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { shopFeatureKey } from '../shop/shop.feature';

/** Prefix for each slice's localStorage entry: `ttb-home`, `ttb-booking`, `ttb-shop`. */
const STORAGE_PREFIX: string = 'ttb';

/**
 * Slices persisted to localStorage, base64-encoded, each with the fields it keeps. Each feature clears its own with
 * its `State Reset` action.
 */
const keys: Keys = [
  { [bookingFeatureKey]: { encrypt: encodeBase64, decrypt: decodeBase64 } },
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
 * Saves the synced slices after every action and restores them on start-up, or when a lazy slice
 * registers (deep-merged over its initial state).
 */
export function localStorageSyncReducer<State>(reducer: ActionReducer<State>): ActionReducer<State> {
  return localStorageSync({
    keys,
    rehydrate: true,
    checkStorageAvailability: true,
    storageKeySerializer: (key: string): string => `${STORAGE_PREFIX}-${key}`,
  })(reducer);
}

export const metaReducers: MetaReducer[] = [localStorageSyncReducer];
