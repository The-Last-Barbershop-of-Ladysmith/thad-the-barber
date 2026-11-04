import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { App } from './app';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({ template: '' })
class SlowPage {}

describe(
  'App',
  (): void => {
    let fixture: ComponentFixture<App>;
    let messages: MessageService;

    function toastsShowing(): number {
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelectorAll('p-toast [role="alert"]').length;
    }

    beforeEach((): void => {
      vi.useFakeTimers();
      TestBed.configureTestingModule({ providers: [provideRouter([]), MessageService] });
      TestBed.overrideComponent(App, { remove: { imports: [Header, Footer] }, add: { schemas: [NO_ERRORS_SCHEMA] } });
      fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      messages = TestBed.inject(MessageService);
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'hosts exactly one toast',
      (): void => {
        expect(fixture.debugElement.queryAll(By.directive(Toast))).toHaveLength(1);
      },
    );

    it(
      'shows the loading bar while a page loads, and hides it once the navigation ends',
      async (): Promise<void> => {
        let finishLoading: () => void = (): void => undefined;
        const router: Router = TestBed.inject(Router);
        router.resetConfig([
          {
            path: 'slow',
            loadComponent: (): Promise<typeof SlowPage> => new Promise<typeof SlowPage>(
              (resolve: (component: typeof SlowPage) => void): void => {
                finishLoading = (): void => {
                  resolve(SlowPage);
                };
              },
            ),
          },
        ]);

        const navigation: Promise<boolean> = router.navigateByUrl('/slow');
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('p-progressbar'))).not.toBeNull();

        finishLoading();
        await navigation;
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('p-progressbar'))).toBeNull();
      },
    );

    it(
      'dismisses a success toast after 4 s',
      (): void => {
        messages.add({ severity: 'success', summary: 'Saved' });
        expect(toastsShowing()).toBe(1);

        vi.advanceTimersByTime(4000);

        expect(toastsShowing()).toBe(0);
      },
    );

    it(
      'keeps a sticky error toast until it is closed',
      (): void => {
        messages.add({
          severity: 'error',
          summary: 'Not saved',
          sticky: true,
        });

        vi.advanceTimersByTime(60_000);

        expect(toastsShowing()).toBe(1);
      },
    );

    it(
      'shows a message raised twice while showing only once, and a different one beside it',
      (): void => {
        messages.add({ severity: 'info', summary: 'Link copied' });
        messages.add({ severity: 'info', summary: 'Link copied' });

        expect(toastsShowing()).toBe(1);

        messages.add({ severity: 'success', summary: 'Booking cancelled' });

        expect(toastsShowing()).toBe(2);
      },
    );
  },
);
