import { AdminSignInError } from '../models/admin-sign-in-error.model';

/** What the sign-in page says for each problem. */
export function toSignInMessage(error: AdminSignInError): string {
  switch (error) {
    case AdminSignInError.NotAuthorized:
      return 'That Google account can’t manage this site. Sign in with the shop owner’s account.';
    case AdminSignInError.InvalidToken:
      return 'We couldn’t verify your Google sign-in. Try again.';
    case AdminSignInError.Unavailable:
      return 'Admin sign-in isn’t set up for this site yet.';
    case AdminSignInError.SessionEnded:
      return 'Your session ended. Sign in again to keep going.';
    default:
      return 'Sign-in didn’t work. Check your connection and try again.';
  }
}
