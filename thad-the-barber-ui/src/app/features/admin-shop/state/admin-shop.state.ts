import { RequestStatus } from '../../../shared/models/request.models';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { AdminShopError } from '../models/admin-shop-error.model';

export interface AdminShopState {
  info: AdminShopInfoDto | null;
  loadStatus: RequestStatus;
  saveStatus: RequestStatus;
  error: AdminShopError | null;
}

export const initialAdminShopState: AdminShopState = {
  info: null,
  loadStatus: RequestStatus.Idle,
  saveStatus: RequestStatus.Idle,
  error: null,
};
