/**
 * Who is signed in to the admin area (the name as Google gave it, if it did) and until when. The token itself stays in
 * `AdminTokenService`, and `AdminSessionStorage` keeps who it is.
 */
export interface AdminSession {
  email: string;
  name: string | null;
  expiresAt: string;
}
