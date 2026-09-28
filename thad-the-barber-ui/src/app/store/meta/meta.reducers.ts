import { type ActionReducer, type MetaReducer } from '@ngrx/store';
import { type Keys, localStorageSync } from 'ngrx-store-localstorage';
import { bookingFeatureKey } from '../../features/booking/state/booking.feature';
import { homeFeatureKey } from '../../features/home/state/home.feature';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { type AppState } from '../app.state';

/** Prefix for each slice's localStorage entry: `ttb-home`, `ttb-booking`. */
const STORAGE_PREFIX: string = 'ttb';

/** Slices persisted to localStorage. Each feature clears its own with its `State Reset` action. */
const syncKeys: string[] = [
  homeFeatureKey,
  bookingFeatureKey,
];

/** Every synced slice is stored base64-encoded. */
const keys: Keys = syncKeys.map((key: string): Keys[number] => ({
  [key]: {
    encrypt: encodeBase64,
    decrypt: decodeBase64,
  },
}));

/**
 * Saves the synced slices after every action and restores them on start-up, or when a lazy slice
 * registers (deep-merged over its initial state).
 */
export function localStorageSyncReducer(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return localStorageSync({
    keys,
    rehydrate: true,
    checkStorageAvailability: true,
    storageKeySerializer: (key: string): string => `${STORAGE_PREFIX}-${key}`,
  })(reducer);
}

export const metaReducers: MetaReducer<AppState>[] = [localStorageSyncReducer];
