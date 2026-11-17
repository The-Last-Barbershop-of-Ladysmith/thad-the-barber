/** Why the sign-in page is showing a problem. */
export enum AdminSignInError {
  /** A real Google account that isn't on the allowlist (403). */
  NotAuthorized = 'not-authorized',
  /** Google's token didn't check out (401). */
  InvalidToken = 'invalid-token',
  /** Sign-in isn't set up in this environment yet (503). */
  Unavailable = 'unavailable',
  /** Anything else, such as the network. */
  Failed = 'failed',
  /** The admin was signed in and the session ran out. */
  SessionEnded = 'session-ended',
}
