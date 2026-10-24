import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Marks an API call the API allows without a session token, so `sessionInterceptor` sends it as is. */
export const ANONYMOUS_REQUEST: HttpContextToken<boolean> = new HttpContextToken<boolean>((): boolean => false);

export function anonymousRequest(): HttpContext {
  return new HttpContext().set(ANONYMOUS_REQUEST, true);
}
