import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { OfflineBanner } from './offline-banner';

describe(
  'OfflineBanner',
  (): void => {
    let fixture: ComponentFixture<OfflineBanner>;
    let onLine: MockInstance<() => boolean>;

    function banner(): Element | null {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="offline-banner"]');
    }

    function create(isOnline: boolean): void {
      onLine = vi.spyOn(
        window.navigator,
        'onLine',
        'get',
      ).mockReturnValue(isOnline);
      fixture = TestBed.createComponent(OfflineBanner);
      fixture.detectChanges();
    }

    afterEach((): void => {
      onLine.mockRestore();
    });

    it(
      'shows nothing while online',
      (): void => {
        create(true);

        expect(banner()).toBeNull();
      },
    );

    it(
      'shows when the page opens offline',
      (): void => {
        create(false);

        expect(banner()).not.toBeNull();
      },
    );

    it(
      'shows when the connection drops and hides when it is back, as a live region that cannot be closed',
      (): void => {
        create(true);

        window.dispatchEvent(new Event('offline'));
        expect(banner()?.getAttribute('role')).toBe('alert');
        expect(banner()?.querySelector('button')).toBeNull();

        window.dispatchEvent(new Event('online'));
        expect(banner()).toBeNull();
      },
    );
  },
);
