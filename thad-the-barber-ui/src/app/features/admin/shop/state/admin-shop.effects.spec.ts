import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AdminShopInfoDto } from '../dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../dtos/shop-info-save-request.dto';
import { AdminShopError } from '../models/admin-shop-error.model';
import { AdminShopService } from '../services/admin-shop.service';
import * as AdminShopActions from './admin-shop.actions';
import { loadAdminShop, saveAdminShop } from './admin-shop.effects';

const INFO: AdminShopInfoDto = {
  notice: null,
  isNoticeShown: true,
  squareNotice: 'From Square',
};
const REQUEST: Action = AdminShopActions.AdminShopRequest();
const SAVE: Action = AdminShopActions.AdminShopSave({ request: { notice: 'x', isNoticeShown: true } });

describe('admin shop effects', (): void => {
  let actions: Subject<Action>;
  let service: {
    get: () => Observable<AdminShopInfoDto>;
    save: (request: ShopInfoSaveRequestDto) => Observable<AdminShopInfoDto>;
  };

  beforeEach((): void => {
    actions = new Subject<Action>();
    service = {
      get: (): Observable<AdminShopInfoDto> => of(INFO),
      save: (): Observable<AdminShopInfoDto> => of(INFO),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Actions, useValue: actions },
        { provide: AdminShopService, useFactory: (): unknown => service },
      ],
    });
  });

  function emitted(effect: unknown, action: Action): Action[] {
    const results: Action[] = [];
    TestBed.runInInjectionContext((): Observable<Action> => (effect as () => Observable<Action>)())
      .subscribe((result: Action): void => {
        results.push(result);
      });
    actions.next(action);
    return results;
  }

  it('loads the shop info', (): void => {
    expect(emitted(loadAdminShop, REQUEST)).toEqual([AdminShopActions.AdminShopRequestSuccess({ info: INFO })]);
  });

  it('says the file is unavailable when the API says so', (): void => {
    service.get = (): Observable<AdminShopInfoDto> =>
      throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 503, error: { code: 'shop_info_unavailable' } }));

    const failure: Action = AdminShopActions.AdminShopRequestFailure({ error: AdminShopError.Unavailable });

    expect(emitted(loadAdminShop, REQUEST)).toEqual([failure]);
  });

  it('saves what it is given and answers with what the API read back', (): void => {
    const sent: ShopInfoSaveRequestDto[] = [];
    service.save = (request: ShopInfoSaveRequestDto): Observable<AdminShopInfoDto> => {
      sent.push(request);
      return of(INFO);
    };

    const results: Action[] = emitted(saveAdminShop, SAVE);

    expect(sent).toEqual([{ notice: 'x', isNoticeShown: true }]);
    expect(results).toEqual([AdminShopActions.AdminShopSaveSuccess({ info: INFO })]);
  });

  it('says a refused save was invalid, and any other failure failed', (): void => {
    service.save = (): Observable<AdminShopInfoDto> =>
      throwError((): HttpErrorResponse => new HttpErrorResponse({ status: 400, error: { code: 'validation_failed' } }));
    const invalid: Action = AdminShopActions.AdminShopSaveFailure({ error: AdminShopError.Invalid });
    expect(emitted(saveAdminShop, SAVE)).toEqual([invalid]);
  });
});
