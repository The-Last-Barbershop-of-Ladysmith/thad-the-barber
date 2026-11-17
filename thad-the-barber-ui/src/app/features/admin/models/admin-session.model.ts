/** Who is signed in to the admin area and until when. The token itself stays in `AdminTokenService`. */
export interface AdminSession {
  email: string;
  expiresAt: string;
}
