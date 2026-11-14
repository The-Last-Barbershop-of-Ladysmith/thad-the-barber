import { TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { ToastMessageOptions, MessageService } from 'primeng/api';
import { TEST_SHOP } from '../../../testing/test-shop';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { ErrorToastService } from './error-toast.service';

describe(
  'ErrorToastService',
  (): void => {
    let added: ToastMessageOptions[];
    let service: ErrorToastService;

    beforeEach((): void => {
      added = [];
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [shopFeature.name]: shopFeature.reducer }),
          { provide: MessageService, useValue: { add: (message: ToastMessageOptions): number => added.push(message) } },
        ],
      });
      service = TestBed.inject(ErrorToastService);
    });

    it(
      'raises a sticky error toast with the shop phone and none of the error',
      (): void => {
        TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        vi.spyOn(console, 'error').mockReturnValue(undefined);
        service.handleError(new Error('made-up error'));

        expect(added).toHaveLength(1);
        expect(added[0]?.severity).toBe('error');
        expect(added[0]?.sticky).toBe(true);
        expect(added[0]?.summary).toContain('(555) 010-0142');
      },
    );

    it(
      'logs the error to the console like Angular does',
      (): void => {
        const consoleError: MockInstance<typeof console.error> = vi.spyOn(console, 'error').mockReturnValue(undefined);
        const error: Error = new Error('made-up error');

        service.handleError(error);

        expect(consoleError).toHaveBeenCalledExactlyOnceWith('ERROR', error);
        consoleError.mockRestore();
      },
    );

    it(
      'never shows the error text',
      (): void => {
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        service.handleError(new Error('boom'));

        expect(JSON.stringify(added)).not.toContain('boom');
      },
    );
  },
);
