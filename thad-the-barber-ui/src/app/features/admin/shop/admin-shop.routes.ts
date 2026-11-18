import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { RouteSeo } from '../../../shared/models/route-seo.model';
import { ShopInfo } from './pages/shop-info/shop-info';
import * as adminShopEffects from './state/admin-shop.effects';
import { adminShopFeature } from './state/admin-shop.feature';

/** Not shown to search engines; the server sends `noindex` for `/admin` too. */
const shopSeo: RouteSeo = {
  title: 'Admin shop info · {shopName}',
  description: 'The owner’s page for editing the notice on {shopName}’s booking page and choosing whether it shows. '
    + 'This area is not shown in search results.',
  isIndexed: false,
};

// The slice and effects register once for the shop info page, under the admin guard and shell.
export const ADMIN_SHOP_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(adminShopFeature),
      provideEffects(adminShopEffects),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { seo: shopSeo },
        component: ShopInfo,
      },
    ],
  },
];
