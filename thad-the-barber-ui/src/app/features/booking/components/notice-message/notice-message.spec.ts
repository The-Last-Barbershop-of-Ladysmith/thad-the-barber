import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneLinks } from '../../../../core/models/shop/phone-links.model';
import { BookingNotice } from '../../models/booking-notice.model';
import { NoticeFallback } from '../../models/notice-fallback.model';
import { NoticeSeverity } from '../../models/notice-severity.model';
import { NoticeMessage } from './notice-message';

describe(
  'NoticeMessage',
  (): void => {
    const phone: PhoneLinks = {
      display: '(000) 555-01x9',
      tel: 'tel:+10005550109',
      sms: 'sms:+10005550109',
    };
    const bookingUrl: string = 'https://square.example/book/MADE-UP';

    function render(notice: BookingNotice): ComponentFixture<NoticeMessage> {
      const fixture: ComponentFixture<NoticeMessage> = TestBed.createComponent(NoticeMessage);
      fixture.componentRef.setInput('notice', notice);
      fixture.componentRef.setInput('phone', phone);
      fixture.componentRef.setInput('bookingUrl', bookingUrl);
      fixture.detectChanges();
      return fixture;
    }

    function find(fixture: ComponentFixture<NoticeMessage>, testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    }

    it(
      'offers the Square booking site, call and text links and a retry when the notice asks for them',
      (): void => {
        const fixture: ComponentFixture<NoticeMessage> = render({
          severity: NoticeSeverity.Error,
          text: 'Made-up failure',
          fallback: NoticeFallback.BookingSite,
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
      'shows only the text for a notice without links or retry',
      (): void => {
        const fixture: ComponentFixture<NoticeMessage> = render({
          severity: NoticeSeverity.Warn,
          text: 'Made-up warning',
          fallback: NoticeFallback.None,
          canRetry: false,
        });

        expect(find(fixture, 'booking-notice')?.textContent).toContain('Made-up warning');
        expect(find(fixture, 'notice-booking-site')).toBeNull();
        expect(find(fixture, 'notice-call')).toBeNull();
        expect(find(fixture, 'notice-retry')).toBeNull();
      },
    );
  },
);
