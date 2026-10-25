import { ActionReducer, MetaReducer } from '@ngrx/store';
import { Keys, localStorageSync } from 'ngrx-store-localstorage';
import { bookingFeatureKey } from '../../features/booking/state/booking.feature';
import { toKeptConfirmation } from '../../features/booking/utils/saved-confirmation.utils';
import { homeFeatureKey } from '../../features/home/state/home.feature';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { shopFeatureKey } from '../shop/shop.feature';

/** Prefix for each slice's localStorage entry: `ttb-home`, `ttb-shop`, `ttb-booking`. */
const STORAGE_PREFIX: string = 'ttb';

export function toStorageKey(sliceKey: string): string {
  return `${STORAGE_PREFIX}-${sliceKey}`;
}

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
  // Only the last booking, without name or phone, dropped on load once it's 24 hours old or under way (BR-22); its
  // availability must be fresh.
  {
    [bookingFeatureKey]: {
      encrypt: encodeBase64,
      decrypt: decodeBase64,
      filter: ['savedConfirmation'],
      deserialize: toKeptConfirmation,
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
    storageKeySerializer: toStorageKey,
  })(reducer);
}

export const metaReducers: MetaReducer[] = [localStorageSyncReducer];
