import { RequestStatus } from '../../../shared/models/request.models';
import { AdminSession } from '../models/admin-session.model';
import { AdminSignInError } from '../models/admin-sign-in-error.model';

export interface AdminState {
  session: AdminSession | null;
  signInStatus: RequestStatus;
  signInError: AdminSignInError | null;
  /** From `GET /api/admin/config`; the sign-in page draws Google's button once it has it. */
  googleClientId: string | null;
  configStatus: RequestStatus;
}

export const initialAdminState: AdminState = {
  session: null,
  signInStatus: RequestStatus.Idle,
  signInError: null,
  googleClientId: null,
  configStatus: RequestStatus.Idle,
};
