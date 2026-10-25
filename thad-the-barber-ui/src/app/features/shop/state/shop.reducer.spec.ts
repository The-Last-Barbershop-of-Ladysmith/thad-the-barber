import { TEST_SHOP } from '../../../../testing/test-shop';
import { RequestStatus } from '../../../shared/models/request.models';
import * as ShopActions from './shop.actions';
import { shopReducer } from './shop.reducer';
import { ShopState, initialShopState } from './shop.state';

describe(
  'shop reducer',
  (): void => {
    const loaded: ShopState = {
      shopInfo: TEST_SHOP,
      loadStatus: RequestStatus.Success,
    };

    it(
      'marks a requested load pending and keeps the shop it has',
      (): void => {
        const state: ShopState = shopReducer(loaded, ShopActions.ShopInfoRequest());

        expect(state).toEqual({ shopInfo: TEST_SHOP, loadStatus: RequestStatus.Pending });
      },
    );

    it(
      'holds the loaded shop',
      (): void => {
        const state: ShopState = shopReducer(
          initialShopState,
          ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }),
        );

        expect(state).toEqual(loaded);
      },
    );

    it(
      'keeps a saved shop when a load fails, so it keeps showing while the API is down',
      (): void => {
        const state: ShopState = shopReducer(loaded, ShopActions.ShopInfoRequestFailure({ error: 'Could not load the shop details.' }));

        expect(state).toEqual({ shopInfo: TEST_SHOP, loadStatus: RequestStatus.Error });
      },
    );
  },
);
