import { ShopInfo } from '../models/shop-info.model';
import { RequestStatus } from '../../../shared/models/request.models';

export interface ShopState {
  shopInfo: ShopInfo | null;
  loadStatus: RequestStatus;
}

export const initialShopState: ShopState = {
  shopInfo: null,
  loadStatus: RequestStatus.Idle,
};
