import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { AppState } from '../../../../../store/app.state';
import { AdminShopInfoDto } from '../../dtos/admin-shop-info.dto';
import { ShopInfoSaveRequestDto } from '../../dtos/shop-info-save-request.dto';
import { AdminShopError } from '../../models/admin-shop-error.model';
import * as AdminShopActions from '../../state/admin-shop.actions';
import { adminShopFeature } from '../../state/admin-shop.feature';
import { ShopInfo } from './shop-info';

const SQUARE_ONLY: AdminShopInfoDto = {
  notice: null,
  isNoticeShown: true,
  squareNotice: 'Read before booking.\n\nPrices stay the same.',
};
const OWN_TEXT: AdminShopInfoDto = { ...SQUARE_ONLY, notice: 'Closed Monday.' };

describe('ShopInfo', (): void => {
  let fixture: ComponentFixture<ShopInfo>;
  let store: Store<AppState>;
  let dispatchSpy: MockInstance<Store<AppState>['dispatch']>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function element(selector: string): HTMLElement {
    const found: HTMLElement | null = host().querySelector<HTMLElement>(selector);
    if (found === null) {
      throw new Error(`Nothing matches ${selector}.`);
    }
    return found;
  }

  function type(value: string): void {
    const field: HTMLTextAreaElement = element('#shop-notice') as HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function lastRequest(): ShopInfoSaveRequestDto | undefined {
    const action: unknown = dispatchSpy.mock.calls.at(-1)?.[0];
    return (action as { request?: ShopInfoSaveRequestDto; }).request;
  }

  async function open(info: AdminShopInfoDto): Promise<void> {
    fixture.detectChanges();
    store.dispatch(AdminShopActions.AdminShopRequestSuccess({ info }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideStore({ [adminShopFeature.name]: adminShopFeature.reducer })],
    });
    store = TestBed.inject<Store<AppState>>(Store);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(ShopInfo);
  });

  it('asks for the shop info when it opens, and says it is loading', (): void => {
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(AdminShopActions.AdminShopRequest());
    expect(element('[data-testid="shop-loading"]')).toBeTruthy();
  });

  it('shows Square’s text and an empty notice while none is saved', async (): Promise<void> => {
    await open(SQUARE_ONLY);

    expect((element('#shop-notice') as HTMLTextAreaElement).value).toBe('');
    expect(element('[data-testid="square-notice"]').textContent).toContain('Read before booking.');
    expect((element('[data-testid="notice-shown"]') as HTMLInputElement).checked).toBe(true);
  });

  it('fills in the saved text, and offers Square’s instead', async (): Promise<void> => {
    await open(OWN_TEXT);

    expect((element('#shop-notice') as HTMLTextAreaElement).value).toBe('Closed Monday.');
    element('[data-testid="use-square"]').click();
    fixture.detectChanges();
    expect((element('#shop-notice') as HTMLTextAreaElement).value).toBe('');
    expect(element('[data-testid="square-notice"]')).toBeTruthy();
  });

  it('saves the typed text, trimmed', async (): Promise<void> => {
    await open(SQUARE_ONLY);

    type('  Closed Monday.  ');
    element('[data-testid="save-shop"]').click();

    expect(lastRequest()).toEqual({ notice: 'Closed Monday.', isNoticeShown: true });
  });

  it('saves blank text as none, so Square’s shows', async (): Promise<void> => {
    await open(OWN_TEXT);

    type('   ');
    element('[data-testid="save-shop"]').click();

    expect(lastRequest()).toEqual({ notice: null, isNoticeShown: true });
  });

  it('saves the switch, and says the notice is off while it is', async (): Promise<void> => {
    await open(SQUARE_ONLY);

    element('[data-testid="notice-shown"]').click();
    fixture.detectChanges();
    expect(element('[data-testid="notice-hidden"]')).toBeTruthy();
    element('[data-testid="save-shop"]').click();

    expect(lastRequest()).toEqual({ notice: null, isNoticeShown: false });
  });

  it('says saved until something is changed again', async (): Promise<void> => {
    await open(SQUARE_ONLY);
    type('Closed Monday.');
    element('[data-testid="save-shop"]').click();

    store.dispatch(AdminShopActions.AdminShopSaveSuccess({ info: OWN_TEXT }));
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="shop-saved"]')).not.toBeNull();

    type('Closed Tuesday.');
    expect(host().querySelector('[data-testid="shop-saved"]')).toBeNull();
  });

  it('says what went wrong', async (): Promise<void> => {
    await open(SQUARE_ONLY);

    store.dispatch(AdminShopActions.AdminShopSaveFailure({ error: AdminShopError.Unavailable }));
    fixture.detectChanges();

    expect(element('[data-testid="shop-error"]').textContent).toContain('could not be reached');
  });
});
