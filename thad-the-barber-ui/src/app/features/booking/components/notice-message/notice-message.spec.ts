import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { PhoneLinks } from '../../../../shared/models/phone-links.model';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingNotice } from '../../models/booking-notice.model';
import { NoticeSeverity } from '../../models/notice-severity.model';
import { NoticeMessage } from './notice-message';

describe(
  'NoticeMessage',
  (): void => {
    let phone: PhoneLinks;
    let bookingUrl: string;

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      const store: Store<AppState> = TestBed.inject<Store<AppState>>(Store);
      store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      phone = store.selectSignal(shopFeature.selectPhoneLinks)();
      bookingUrl = store.selectSignal(shopFeature.selectBookingUrl)();
    });

    function render(notice: BookingNotice): ComponentFixture<NoticeMessage> {
      const fixture: ComponentFixture<NoticeMessage> = TestBed.createComponent(NoticeMessage);
      fixture.componentRef.setInput('notice', notice);
      fixture.detectChanges();
      return fixture;
    }

    function find(fixture: ComponentFixture<NoticeMessage>, testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    it(
      'ends every problem with call, text and Square booking site links, plus a retry when it can be retried',
      (): void => {
        const fixture: ComponentFixture<NoticeMessage> = render({
          severity: NoticeSeverity.Error,
          text: 'Made-up failure',
          canRetry: true,
        });
        let retries: number = 0;
        fixture.componentInstance.retry.subscribe((): void => {
          retries++;
        });

        find(fixture, 'notice-retry')?.click();

        expect(find(fixture, 'notice-booking-site')?.getAttribute('href')).toBe(bookingUrl);
        expect(find(fixture, 'notice-call')?.getAttribute('href')).toBe(phone.tel);
        expect(find(fixture, 'notice-text')?.getAttribute('href')).toBe(phone.sms);
        expect(retries).toBe(1);
      },
    );

    it(
      'shows a success with its title and text, without links or retry',
      (): void => {
        const fixture: ComponentFixture<NoticeMessage> = render({
          severity: NoticeSeverity.Success,
          title: 'Made-up title',
          text: 'Made-up success',
          canRetry: false,
        });

        const host: HTMLElement = fixture.nativeElement as HTMLElement;
        expect(host.textContent).toContain('Made-up title');
        expect(host.textContent).toContain('Made-up success');
        expect(find(fixture, 'booking-notice')).toBeNull();
        expect(find(fixture, 'notice-booking-site')).toBeNull();
        expect(find(fixture, 'notice-call')).toBeNull();
        expect(find(fixture, 'notice-retry')).toBeNull();
      },
    );

    it(
      'shows an icon for each severity, so it is not told apart by colour alone',
      (): void => {
        type IconReader = (severity: NoticeSeverity) => string | undefined;
        const iconFor: IconReader = (severity: NoticeSeverity): string | undefined =>
          (render({
            severity,
            text: 'Made-up notice',
            canRetry: false,
          }).nativeElement as HTMLElement)
            .querySelector('.pi')?.className;

        expect(iconFor(NoticeSeverity.Success)).toContain('pi-check-circle');
        expect(iconFor(NoticeSeverity.Warn)).toContain('pi-exclamation-triangle');
        expect(iconFor(NoticeSeverity.Error)).toContain('pi-exclamation-circle');
        expect(iconFor(NoticeSeverity.Info)).toContain('pi-info-circle');
      },
    );
  },
);
