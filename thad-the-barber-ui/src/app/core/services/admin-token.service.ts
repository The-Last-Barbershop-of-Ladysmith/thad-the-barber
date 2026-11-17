import { Injectable } from '@angular/core';

/**
 * The admin JWT from `POST /api/admin/session`, kept in memory only, never in storage, so a reload or a closed tab
 * signs the admin out. The interceptor reads it for `/api/admin/*`; the admin state holds only who is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AdminTokenService {
  private token: string = '';
  private expiresAt: number = 0;

  set(token: string, expiresAt: string): void {
    this.token = token;
    this.expiresAt = Date.parse(expiresAt);
  }

  clear(): void {
    this.token = '';
    this.expiresAt = 0;
  }

  /** The token while it works, or null once it has expired or was cleared. */
  getToken(): string | null {
    return this.token !== '' && Date.now() < this.expiresAt ? this.token : null;
  }

  isSignedIn(): boolean {
    return this.getToken() !== null;
  }
}
