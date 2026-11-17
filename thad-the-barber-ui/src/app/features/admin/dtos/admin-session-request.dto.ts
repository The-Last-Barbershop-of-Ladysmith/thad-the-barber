/** `POST /api/admin/session`'s body: the Google ID token ("credential") from Google Identity Services. */
export interface AdminSessionRequestDto {
  idToken: string;
}
