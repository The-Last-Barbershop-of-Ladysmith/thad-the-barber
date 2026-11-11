import { RequestStatus } from '../../../shared/models/request.models';

export interface SmsSignupState {
  status: RequestStatus;
  phone: string | null;
  error: string | null;
}

export interface HomeState {
  /** The next open times as UTC instants; a failed refresh keeps the last ones. */
  nextTimes: string[];
  nextTimesStatus: RequestStatus;
  smsSignup: SmsSignupState;
}

export const initialHomeState: HomeState = {
  nextTimes: [],
  nextTimesStatus: RequestStatus.Idle,
  smsSignup: {
    status: RequestStatus.Idle,
    phone: null,
    error: null,
  },
};
