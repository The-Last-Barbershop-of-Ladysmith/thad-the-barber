import { RequestStatus } from '../models/request.models';
import { isLoading, isSettledEmpty } from './request.utils';

describe(
  'isLoading',
  (): void => {
    it(
      'is true before a load starts and while it runs',
      (): void => {
        expect(isLoading(RequestStatus.Idle)).toBe(true);
        expect(isLoading(RequestStatus.Pending)).toBe(true);
      },
    );

    it(
      'is false once a load has succeeded or failed',
      (): void => {
        expect(isLoading(RequestStatus.Success)).toBe(false);
        expect(isLoading(RequestStatus.Error)).toBe(false);
      },
    );
  },
);

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
