export interface Environment {
  production: boolean;
  /** Base URL for the booking / SMS API once it exists. Services use in-memory mocks until then. */
  apiBaseUrl: string;
}
