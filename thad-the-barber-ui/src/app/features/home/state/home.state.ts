import { RequestStatus } from '../../../shared/models/request.models';

export interface HomeState {
  /** The next open times as UTC instants; a failed refresh keeps the last ones. */
  nextTimes: string[];
  nextTimesStatus: RequestStatus;
}

export const initialHomeState: HomeState = {
  nextTimes: [],
  nextTimesStatus: RequestStatus.Idle,
};
