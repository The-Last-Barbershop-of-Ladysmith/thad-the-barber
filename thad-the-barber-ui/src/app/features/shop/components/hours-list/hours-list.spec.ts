import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { Weekday } from '../../../../shared/models/weekday.model';
import { HoursListVariant } from '../../models/hours-list-variant.model';
import { ShopInfo } from '../../models/shop-info.model';
import * as ShopActions from '../../state/shop.actions';
import { shopFeature } from '../../state/shop.feature';
import { HoursList } from './hours-list';

describe(
  'HoursList',
  (): void => {
    const splitShiftShop: ShopInfo = {
      ...TEST_SHOP,
      hours: [
        {
          day: Weekday.Wednesday,
          opens: '09:00:00',
          closes: '12:00:00',
        },
        {
          day: Weekday.Wednesday,
          opens: '13:00:00',
          closes: '17:30:00',
        },
        {
          day: Weekday.Saturday,
          opens: '10:00:00',
          closes: '14:00:00',
        },
      ],
    };

    afterEach((): void => {
      vi.useRealTimers();
    });

    function render(shopInfo: ShopInfo, variant: HoursListVariant): HTMLElement {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      TestBed.inject<Store>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo }));
      const fixture: ComponentFixture<HoursList> = TestBed.createComponent(HoursList);
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    function toTexts(elements: NodeListOf<Element>): string[] {
      return Array.from(elements).map((element: Element): string => element.textContent.replace(/\s+/g, ' ').trim());
    }

    function toRowTexts(element: HTMLElement): string[] {
      return Array.from(element.querySelectorAll('dl > div')).map((row: Element): string => {
        const day: Element | null = row.querySelector('dt');
        day?.querySelector('.today-badge')?.remove();
        return `${toTexts(row.querySelectorAll('dt'))[0]}: ${toTexts(row.querySelectorAll('dd'))[0]}`;
      });
    }

    describe(
      'table',
      (): void => {
        it(
          'pairs every weekday with its times in a description list, Monday first, closed days included',
          (): void => {
            const element: HTMLElement = render(TEST_SHOP, HoursListVariant.Table);

            expect(toRowTexts(element)).toEqual([
              'Monday: Closed',
              'Tuesday: Closed',
              'Wednesday: Closed',
              'Thursday: Closed',
              'Friday: Closed',
              'Saturday: 10:00 AM – 7:30 PM',
              'Sunday: 10:00 AM – 4:00 PM',
            ]);
          },
        );

        it(
          'dims only the closed rows',
          (): void => {
            const element: HTMLElement = render(TEST_SHOP, HoursListVariant.Table);

            expect(element.querySelectorAll('.table-row.closed')).toHaveLength(5);
            expect(element.querySelectorAll('.table-row')).toHaveLength(7);
          },
        );

        it(
          "marks the shop's current day, on the shop's clock rather than the browser's",
          (): void => {
            // Sunday 05:00 UTC is still Saturday 7 PM in Honolulu.
            vi.useFakeTimers({ now: new Date('2026-09-27T05:00:00Z'), toFake: ['Date'] });
            const element: HTMLElement = render(TEST_SHOP, HoursListVariant.Table);

            const today: NodeListOf<Element> = element.querySelectorAll('.table-row.today');
            expect(today).toHaveLength(1);
            expect(today[0]?.querySelector('dt')?.textContent).toContain('Saturday');
          },
        );

        it(
          'shows every period of a split shift on its day',
          (): void => {
            const element: HTMLElement = render(splitShiftShop, HoursListVariant.Table);

            expect(toRowTexts(element)).toContain('Wednesday: 9:00 AM – 12:00 PM, 1:00 PM – 5:30 PM');
          },
        );
      },
    );

    describe(
      'stacked',
      (): void => {
        it(
          'writes each day and its short times on one line, closed spans last',
          (): void => {
            const element: HTMLElement = render(TEST_SHOP, HoursListVariant.Stacked);

            expect(toTexts(element.querySelectorAll('.stack > span'))).toEqual([
              'Saturday · 10 AM – 7:30 PM',
              'Sunday · 10 AM – 4 PM',
              'Closed Monday – Friday',
            ]);
          },
        );
      },
    );

    describe(
      'compact',
      (): void => {
        it(
          'uses short day names and short times',
          (): void => {
            const element: HTMLElement = render(splitShiftShop, HoursListVariant.Compact);

            expect(toTexts(element.querySelectorAll('.compact > span'))).toEqual([
              'Wed · 9 AM – 12 PM, 1 PM – 5:30 PM',
              'Sat · 10 AM – 2 PM',
              'Closed Thu – Fri',
              'Closed Sun – Tue',
            ]);
          },
        );
      },
    );

    it(
      'shows nothing before the shop has loaded',
      (): void => {
        TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
        const fixture: ComponentFixture<HoursList> = TestBed.createComponent(HoursList);
        fixture.detectChanges();

        expect(toTexts((fixture.nativeElement as HTMLElement).querySelectorAll('dl > div'))).toEqual([]);
      },
    );
  },
);
