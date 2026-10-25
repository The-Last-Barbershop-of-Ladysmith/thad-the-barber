import { RequestStatus } from '../models/request.models';

/** True once a load settles with nothing to show, so prerendered pages and loading states keep what depends on it. */
export function isSettledEmpty(status: RequestStatus, count: number): boolean {
  const isFailed: boolean = status === RequestStatus.Error;
  const isLoadedEmpty: boolean = status === RequestStatus.Success && count === 0;
  return isFailed || isLoadedEmpty;
}
