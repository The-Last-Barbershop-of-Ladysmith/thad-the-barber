import * as HomeActions from './home.actions';
import { homeReducer } from './home.reducer';
import { HomeState, initialHomeState } from './home.state';
import { RequestStatus } from '../../../shared/models/request.models';

describe(
  'home reducer next times',
  (): void => {
    const startAts: string[] = ['2026-10-04T20:00:00Z', '2026-10-04T20:30:00Z'];

    it(
      'replaces the times with the loaded ones',
      (): void => {
        const before: HomeState = { ...initialHomeState, nextTimes: ['2026-10-03T20:00:00Z'] };

        const state: HomeState = homeReducer(before, HomeActions.NextTimesRequestSuccess({ startAts }));

        expect(state.nextTimes).toEqual(startAts);
        expect(state.nextTimesStatus).toBe(RequestStatus.Success);
      },
    );

    it(
      'keeps the last times when a refresh fails',
      (): void => {
        const before: HomeState = {
          ...initialHomeState,
          nextTimes: startAts,
          nextTimesStatus: RequestStatus.Success,
        };

        const state: HomeState = homeReducer(before, HomeActions.NextTimesRequestFailure());

        expect(state.nextTimes).toEqual(startAts);
        expect(state.nextTimesStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
