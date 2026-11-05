import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { AppointmentSummary } from './appointment-summary';

describe(
  'AppointmentSummary',
  (): void => {
    let fixture: ComponentFixture<AppointmentSummary>;

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideStore({ [shopFeature.name]: shopFeature.reducer })] });
      fixture = TestBed.createComponent(AppointmentSummary);
      fixture.componentRef.setInput('dayLabel', 'Wednesday, November 4');
      fixture.componentRef.setInput('timeLabel', '10:00 AM');
    });

    it(
      'shows the picked day and time with the shop name and address',
      (): void => {
        TestBed.inject<Store>(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
        fixture.detectChanges();

        const text: string = (fixture.nativeElement as HTMLElement).textContent;

        expect(text).toContain('Wednesday, November 4');
        expect(text).toContain('10:00 AM');
        expect(text).toContain(TEST_SHOP.name);
        expect(text).toContain(TEST_SHOP.address.street);
      },
    );
  },
);
