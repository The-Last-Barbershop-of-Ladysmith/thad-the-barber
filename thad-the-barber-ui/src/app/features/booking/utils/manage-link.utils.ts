import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

/** The URL fragment's key for the manage token: `#t=…`. */
const TOKEN_KEY: string = 't';

/** `/book/manage/{id}`: the page showing one booking. */
export function toManagePath(id: string): string {
  return `/book/manage/${encodeURIComponent(id)}`;
}

/** `/book/manage/{id}/reschedule`: the booking page, moving that booking. */
export function toReschedulePath(id: string): string {
  return `${toManagePath(id)}/reschedule`;
}

/** `t=…`: the fragment carrying the manage token. Browsers never send a fragment to the server (BR-08). */
function toManageFragment(manageToken: string): string {
  return new URLSearchParams({ [TOKEN_KEY]: manageToken }).toString();
}

/** The full manage link a customer keeps: `https://…/book/manage/{id}#t=…`. */
export function toManageLink(
  origin: string,
  { id, manageToken }: Pick<BookingConfirmation, 'id' | 'manageToken'>,
): string {
  return `${origin}${toManagePath(id)}#${toManageFragment(manageToken)}`;
}

/** The manage token in a `t=…` fragment, or null without one (an empty `t=` included). */
export function readManageToken(fragment: string | null): string | null {
  const manageToken: string | null = new URLSearchParams(fragment ?? '').get(TOKEN_KEY);
  const hasToken: boolean = Boolean(manageToken);
  return hasToken ? manageToken : null;
}
