/** `POST /api/session`'s response: a JWT for `Authorization: Bearer` and when it stops working. */
export interface SessionToken {
  token: string;
  expiresAt: string;
}
