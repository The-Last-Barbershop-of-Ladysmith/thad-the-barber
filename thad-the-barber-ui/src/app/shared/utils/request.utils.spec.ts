import { RequestStatus } from '../models/request.models';
import { isSettledEmpty } from './request.utils';

describe(
  'isSettledEmpty',
  (): void => {
    it(
      'is false before and during a load, whatever it holds',
      (): void => {
        expect(isSettledEmpty(RequestStatus.Idle, 0)).toBe(false);
        expect(isSettledEmpty(RequestStatus.Pending, 0)).toBe(false);
      },
    );

    it(
      'is true once a load fails, even with something left from before',
      (): void => {
        expect(isSettledEmpty(RequestStatus.Error, 3)).toBe(true);
      },
    );

    it(
      'is true only for a load that returned nothing',
      (): void => {
        expect(isSettledEmpty(RequestStatus.Success, 0)).toBe(true);
        expect(isSettledEmpty(RequestStatus.Success, 1)).toBe(false);
      },
    );
  },
);
