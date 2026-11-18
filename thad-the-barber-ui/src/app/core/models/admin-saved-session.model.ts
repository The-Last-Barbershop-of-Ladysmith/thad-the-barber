/** The admin sign-in as the tab's storage keeps it: the token, who it is for, and when it ends and was last used. */
export interface AdminSavedSession {
  token: string;
  email: string;
  name: string | null;
  expiresAt: number;
  lastActiveAt: number;
}
