import { TestBed } from '@angular/core/testing';
import { AdminTokenService } from '../../../core/services/admin-token.service';
import { ADMIN_IDLE_LIMIT_MS, AdminSessionStorage } from './admin-session-storage';

const STORAGE_KEY: string = 'ttb-admin-session';
const MINUTE_MS: number = 60 * 1000;

describe(
  'AdminSessionStorage',
  (): void => {
    const now: Date = new Date('2031-02-28T12:00:00Z');
    const fourHoursLater: string = '2031-02-28T16:00:00Z';
    let session: AdminSessionStorage;

    /** A page load: new services, the storage taking up what an earlier page of the tab kept. */
    function openPage(): AdminSessionStorage {
      TestBed.resetTestingModule();
      return TestBed.inject(AdminSessionStorage);
    }

    function saved(): Record<string, unknown> | null {
      const text: string | null = sessionStorage.getItem(STORAGE_KEY);
      return text === null ? null : JSON.parse(text) as Record<string, unknown>;
    }

    beforeEach((): void => {
      sessionStorage.clear();
      vi.useFakeTimers();
      vi.setSystemTime(now);
      session = openPage();
    });

    afterEach((): void => {
      vi.useRealTimers();
      sessionStorage.clear();
    });

    it(
      'starts a sign-in: the token for the interceptor, and who it is for',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          'Q. Testperson',
        );

        expect(TestBed.inject(AdminTokenService).getToken()).toBe('jwt-1');
        expect(session.getSession()).toEqual({
          email: 'owner@example.test',
          name: 'Q. Testperson',
          expiresAt: '2031-02-28T16:00:00.000Z',
        });
        expect(saved()?.['token']).toBe('jwt-1');
      },
    );

    it(
      'ends it: nobody signed in, and nothing kept',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          null,
        );

        session.end();

        expect(TestBed.inject(AdminTokenService).getToken()).toBeNull();
        expect(session.getSession()).toBeNull();
        expect(saved()).toBeNull();
      },
    );

    it(
      'keeps the sign-in across a reload of the page, with its name',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          'Q. Testperson',
        );
        vi.setSystemTime(now.getTime() + 5 * MINUTE_MS);
        session.recordActivity();

        const reloaded: AdminSessionStorage = openPage();

        expect(TestBed.inject(AdminTokenService).getToken()).toBe('jwt-1');
        expect(reloaded.getSession()?.email).toBe('owner@example.test');
        expect(reloaded.getSession()?.name).toBe('Q. Testperson');
      },
    );

    it(
      'writes activity at most every ten seconds, and activity keeps the sign-in going',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          null,
        );
        const firstWrite: unknown = saved()?.['lastActiveAt'];

        vi.setSystemTime(now.getTime() + 5_000);
        session.recordActivity();
        expect(saved()?.['lastActiveAt']).toBe(firstWrite);

        vi.setSystemTime(now.getTime() + 14 * MINUTE_MS);
        session.recordActivity();
        vi.setSystemTime(now.getTime() + 28 * MINUTE_MS);
        expect(session.getSession()).not.toBeNull();
        expect(saved()?.['lastActiveAt']).toBe(now.getTime() + 14 * MINUTE_MS);
      },
    );

    it(
      'does not restore a sign-in that sat idle while the page was closed, and clears what was kept',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          null,
        );
        vi.setSystemTime(now.getTime() + ADMIN_IDLE_LIMIT_MS + MINUTE_MS);

        const reloaded: AdminSessionStorage = openPage();

        expect(TestBed.inject(AdminTokenService).getToken()).toBeNull();
        expect(reloaded.getSession()).toBeNull();
        expect(saved()).toBeNull();
      },
    );

    it(
      'does not restore a sign-in whose token has expired',
      (): void => {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            token: 'jwt-1',
            email: 'owner@example.test',
            expiresAt: now.getTime() - 1,
            lastActiveAt: now.getTime(),
          }),
        );

        openPage();

        expect(TestBed.inject(AdminTokenService).getToken()).toBeNull();
      },
    );

    it(
      'keeps a sign-in that Google gave no name for, and one saved before names were kept',
      (): void => {
        session.start(
          'jwt-1',
          fourHoursLater,
          'owner@example.test',
          null,
        );
        expect(openPage().getSession()?.name).toBeNull();

        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            token: 'jwt-1',
            email: 'owner@example.test',
            expiresAt: Date.parse(fourHoursLater),
            lastActiveAt: Date.now(),
          }),
        );
        expect(openPage().getSession()?.name).toBeNull();
      },
    );

    it(
      'ignores saved text it cannot read',
      (): void => {
        sessionStorage.setItem(STORAGE_KEY, '{not json');
        expect(openPage().getSession()).toBeNull();

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 7 }));
        expect(openPage().getSession()).toBeNull();
      },
    );
  },
);
