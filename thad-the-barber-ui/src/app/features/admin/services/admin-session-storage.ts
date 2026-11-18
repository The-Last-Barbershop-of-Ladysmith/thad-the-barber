import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AdminSavedSession } from '../../../core/models/admin-saved-session.model';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { AdminSession } from '../models/admin-session.model';

const STORAGE_KEY: string = 'ttb-admin-session';

/** No clicks or keys for this long and the admin is signed out, even with hours left on the token. */
export const ADMIN_IDLE_LIMIT_MS: number = 15 * 60 * 1000;

/** Activity is written at most this often, so typing doesn't write on every key. */
const SAVE_ACTIVITY_EVERY_MS: number = 10_000;

/**
 * Who is signed in to the admin area, kept in this tab's `sessionStorage` so a reload stays signed in and closing
 * the tab ends it. It lives in the lazy admin area, as visitors never need it: `AdminTokenService`, which every page
 * loads, only holds the token. The admin pages start, end and ask about the sign-in here; on its first use (before
 * any admin page can ask) it takes up what an earlier page of the tab kept, unless that has run out or sat idle.
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionStorage {
  private readonly tokens: AdminTokenService = inject(AdminTokenService);
  private readonly storage: Storage | null = this.findStorage();

  private current: AdminSavedSession | null = null;
  private lastSavedAt: number = 0;

  constructor() {
    const saved: AdminSavedSession | null = this.read();
    if (saved === null) {
      return;
    }
    this.current = saved;
    this.lastSavedAt = saved.lastActiveAt;
    if (this.isSignedIn()) {
      this.tokens.set(saved.token, saved.expiresAt);
    } else {
      this.end();
    }
  }

  start(
    token: string,
    expiresAt: string,
    email: string,
    name: string | null,
  ): void {
    this.current = {
      token,
      email,
      name,
      expiresAt: Date.parse(expiresAt),
      lastActiveAt: Date.now(),
    };
    this.tokens.set(token, this.current.expiresAt);
    this.save(this.current);
  }

  end(): void {
    this.current = null;
    this.tokens.clear();
    this.remove();
  }

  /** Whether someone is signed in: the token has not expired and they have been active in the last 15 minutes. */
  isSignedIn(): boolean {
    const now: number = Date.now();
    return this.current !== null
      && now < this.current.expiresAt
      && now - this.current.lastActiveAt < ADMIN_IDLE_LIMIT_MS;
  }

  /** Who is signed in and until when, or null when nobody is. */
  getSession(): AdminSession | null {
    if (this.current === null || !this.isSignedIn()) {
      return null;
    }
    return {
      email: this.current.email,
      name: this.current.name,
      expiresAt: new Date(this.current.expiresAt).toISOString(),
    };
  }

  /** The admin did something (a click, a key): the idle time starts over. */
  recordActivity(): void {
    if (this.current === null || !this.isSignedIn()) {
      return;
    }
    const now: number = Date.now();
    this.current = {
      ...this.current,
      lastActiveAt: now,
    };
    if (now - this.lastSavedAt >= SAVE_ACTIVITY_EVERY_MS) {
      this.save(this.current);
    }
  }

  private save(session: AdminSavedSession): void {
    this.lastSavedAt = Date.now();
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage can be full or blocked (a private window): the sign-in then lasts until the page reloads.
    }
  }

  private remove(): void {
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was saved if storage is blocked.
    }
  }

  private read(): AdminSavedSession | null {
    try {
      const text: string | null | undefined = this.storage?.getItem(STORAGE_KEY);
      if (text === null || text === undefined) {
        return null;
      }
      const saved: Partial<AdminSavedSession> = JSON.parse(text) as Partial<AdminSavedSession>;
      const isWhole: boolean = typeof saved.token === 'string'
        && typeof saved.email === 'string'
        && typeof saved.expiresAt === 'number'
        && typeof saved.lastActiveAt === 'number';
      if (!isWhole) {
        return null;
      }
      return {
        ...saved as AdminSavedSession,
        name: typeof saved.name === 'string' ? saved.name : null,
      };
    } catch {
      return null;
    }
  }

  private findStorage(): Storage | null {
    try {
      return inject(DOCUMENT).defaultView?.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
}
