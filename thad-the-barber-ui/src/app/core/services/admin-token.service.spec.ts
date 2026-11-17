import { TestBed } from '@angular/core/testing';
import { AdminTokenService } from './admin-token.service';

describe(
  'AdminTokenService',
  (): void => {
    const now: Date = new Date('2031-02-28T12:00:00Z');
    let service: AdminTokenService;

    beforeEach((): void => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      service = TestBed.inject(AdminTokenService);
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'has no token until one is set',
      (): void => {
        expect(service.getToken()).toBeNull();
        expect(service.isSignedIn()).toBe(false);
      },
    );

    it(
      'gives the token while it works',
      (): void => {
        service.set('jwt-1', '2031-02-28T12:30:00Z');

        expect(service.getToken()).toBe('jwt-1');
        expect(service.isSignedIn()).toBe(true);
      },
    );

    it(
      'stops giving it once it has expired',
      (): void => {
        service.set('jwt-1', '2031-02-28T12:30:00Z');

        vi.setSystemTime(new Date('2031-02-28T12:30:01Z'));

        expect(service.getToken()).toBeNull();
        expect(service.isSignedIn()).toBe(false);
      },
    );

    it(
      'forgets the token when cleared',
      (): void => {
        service.set('jwt-1', '2031-02-28T12:30:00Z');

        service.clear();

        expect(service.getToken()).toBeNull();
      },
    );
  },
);
