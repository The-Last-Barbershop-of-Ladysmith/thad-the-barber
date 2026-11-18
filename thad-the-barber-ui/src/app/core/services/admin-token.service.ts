import { Injectable } from '@angular/core';

/**
 * The admin JWT from `POST /api/admin/session`, held in memory, and when it ends. The session interceptor reads it for
 * `/api/admin/*` on every page, so this stays small: who is signed in, the 15 minutes of idle time that end a sign-in,
 * and keeping it in the tab's storage across a reload are `AdminSessionStorage` in the lazy admin area.
 */
@Injectable({ providedIn: 'root' })
export class AdminTokenService {
  private token: string = '';
  private expiresAt: number = 0;

  set(token: string, expiresAt: number): void {
    this.token = token;
    this.expiresAt = expiresAt;
  }

  clear(): void {
    this.token = '';
  }

  /** The token while it works, or null once it has expired or was cleared. */
  getToken(): string | null {
    return this.token !== '' && Date.now() < this.expiresAt ? this.token : null;
  }

  isSignedIn(): boolean {
    return this.getToken() !== null;
  }
}
