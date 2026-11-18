/**
 * `POST /api/admin/session`'s response: an admin JWT for `Authorization: Bearer`, when it stops working, and whose it
 * is.
 */
export interface AdminSessionDto {
  token: string;
  expiresAt: string;
  email: string;
  /** What Google shows for the account; null when it gave none. */
  name: string | null;
}
