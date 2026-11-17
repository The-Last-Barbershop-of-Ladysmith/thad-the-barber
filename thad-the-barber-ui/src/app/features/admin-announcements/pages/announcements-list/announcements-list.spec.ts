import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../testing/axe';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { addDays, fromIsoDate, toIsoDate, toIsoDateIn } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { shopFeature } from '../../../shop/state/shop.feature';
import * as ShopActions from '../../../shop/state/shop.actions';
import { AdminAnnouncementDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../../models/admin-announcement-status.model';
import { AdminAnnouncementsError } from '../../models/admin-announcements-error.model';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { AnnouncementsList } from './announcements-list';

function announcement(
  title: string,
  status: AdminAnnouncementStatus,
  startDate: string,
): AdminAnnouncementDto {
  return {
    title,
    bodyHtml: '<p>Body</p>',
    startDate,
    endDate: '2099-12-31',
    image: null,
    buttons: [],
    status,
  };
}

describe('AnnouncementsList', (): void => {
  let fixture: ComponentFixture<AnnouncementsList>;
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

  function tab(position: number): HTMLElement {
    const found: HTMLElement | undefined = Array.from(host().querySelectorAll<HTMLElement>('.tab'))[position];
    if (found === undefined) {
      throw new Error(`No tab at ${position}.`);
    }
    return found;
  }

  function savedItems(): AnnouncementInputDto[] {
    const action: unknown = dispatchSpy.mock.calls.at(-1)?.[0];
    return (action as { items?: AnnouncementInputDto[]; }).items ?? [];
  }

  function titles(): string[] {
    return Array.from(host().querySelectorAll('.item-title')).map((title: Element): string => title.textContent);
  }

  function load(items: AdminAnnouncementDto[]): void {
    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ items }));
    fixture.detectChanges();
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideStore({
          [adminAnnouncementsFeature.name]: adminAnnouncementsFeature.reducer,
          [shopFeature.name]: shopFeature.reducer,
        }),
      ],
    });
    store = TestBed.inject<Store<AppState>>(Store);
    store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AnnouncementsList);
    fixture.detectChanges();
  });

  it('asks for the list when it opens, and says it is loading', (): void => {
    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequest());
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(AdminAnnouncementsActions.AdminAnnouncementsRequest());
    expect(host().querySelector('[data-testid="announcements-loading"]')).not.toBeNull();
  });

  it('lists every announcement with its status and a count on each tab', (): void => {
    load([
      announcement(
        'Now',
        AdminAnnouncementStatus.Showing,
        '2026-01-01',
      ),
      announcement(
        'Soon',
        AdminAnnouncementStatus.Scheduled,
        '2098-01-01',
      ),
      announcement(
        'Past',
        AdminAnnouncementStatus.Ended,
        '2020-01-01',
      ),
    ]);

    expect(titles()).toEqual([
      'Now',
      'Soon',
      'Past',
    ]);
    expect(Array.from(host().querySelectorAll('.tab')).map((tab: Element): string => tab.textContent.trim())).toEqual([
      'All 3',
      'Showing 1',
      'Scheduled 1',
      'Ended 1',
    ]);
  });

  it('shows one status at a time from the tabs', (): void => {
    load([
      announcement(
        'Now',
        AdminAnnouncementStatus.Showing,
        '2026-01-01',
      ),
      announcement(
        'Soon',
        AdminAnnouncementStatus.Scheduled,
        '2098-01-01',
      ),
    ]);

    tab(2).click();
    fixture.detectChanges();

    expect(titles()).toEqual(['Soon']);
    expect(tab(2).getAttribute('aria-pressed')).toBe('true');
  });

  it('says so when there is nothing to show', (): void => {
    load([]);

    expect(host().querySelector('[data-testid="announcements-empty"]')).not.toBeNull();
  });

  it("ends a running announcement on the shop's yesterday, from End now", (): void => {
    load([
      announcement(
        'Now',
        AdminAnnouncementStatus.Showing,
        '2026-01-01',
      ),
    ]);
    const today: string = toIsoDateIn(TEST_SHOP.timeZone, new Date());
    const yesterday: string = toIsoDate(addDays(fromIsoDate(today), -1));

    element('.item-actions button').click();

    const saved: AnnouncementInputDto[] = savedItems();
    expect(saved.map((item: AnnouncementInputDto): string => item.endDate)).toEqual([yesterday]);
  });

  it('offers End now only for what is showing', (): void => {
    load([
      announcement(
        'Soon',
        AdminAnnouncementStatus.Scheduled,
        '2098-01-01',
      ),
    ]);

    expect(host().querySelector('.item-actions button')).toBeNull();
  });

  it('says what went wrong', (): void => {
    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequestFailure({
      error: AdminAnnouncementsError.Unavailable,
    }));
    fixture.detectChanges();

    expect(host().querySelector('[data-testid="announcements-error"]')?.textContent).toContain('could not be reached');
  });

  it('has no accessibility violations', async (): Promise<void> => {
    load([
      announcement(
        'Now',
        AdminAnnouncementStatus.Showing,
        '2026-01-01',
      ),
      announcement(
        'Past',
        AdminAnnouncementStatus.Ended,
        '2020-01-01',
      ),
    ]);

    await expectNoAxeViolations(host());
  });
});
