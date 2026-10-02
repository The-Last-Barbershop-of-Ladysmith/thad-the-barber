import { environment } from '../../../environments/environment';

/** `'/bookings'` → `'<this environment's API>/api/bookings'`. Services build every request URL with this. */
export function apiUrl(path: `/${string}`): string {
  return `${environment.apiBaseUrl}${path}`;
}
