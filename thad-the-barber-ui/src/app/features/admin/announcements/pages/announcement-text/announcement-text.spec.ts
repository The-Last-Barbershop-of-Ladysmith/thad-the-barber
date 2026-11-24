import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../../testing/axe';
import { TEST_SHOP } from '../../../../../../testing/test-shop';
import { AppState } from '../../../../../store/app.state';
import * as ShopActions from '../../../../shop/state/shop.actions';
import { shopFeature } from '../../../../shop/state/shop.feature';
import { AdminAnnouncementDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementTextPreviewDto } from '../../dtos/announcement-text-preview.dto';
import { AnnouncementTextStatusDto } from '../../dtos/announcement-text-status.dto';
import { AdminAnnouncementStatus } from '../../models/admin-announcement-status.model';
import { AnnouncementSendState } from '../../models/announcement-send-state.model';
import { AnnouncementTextError } from '../../models/announcement-text-error.model';
import * as AdminAnnouncementTextsActions from '../../state/admin-announcement-texts.actions';
import { adminAnnouncementTextsFeature } from '../../state/admin-announcement-texts.feature';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { AnnouncementText } from './announcement-text';

const SAVED: AdminAnnouncementDto = {
  title: 'Open late',
  bodyHtml: '<p>Until 8 PM.</p>',
  startDate: '2026-11-20',
  endDate: '2026-12-20',
  image: null,
  buttons: [],
  status: AdminAnnouncementStatus.Showing,
};

const PREVIEW: AnnouncementTextPreviewDto = {
  message: 'Shop: Open late. Until 8 PM. Reply STOP to opt out.',
  subscriberCount: 12,
  isEnabled: true,
  isScheduled: false,
  alreadyTexted: null,
};

const STATUS: AnnouncementTextStatusDto = {
  id: '20261120-abc',
  state: AnnouncementSendState.Queued,
  sendOn: '2026-11-20',
  total: 12,
  sentCount: 0,
  failedCount: 0,
};

describe('AnnouncementText', (): void => {
  let fixture: ComponentFixture<AnnouncementText>;
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

  async function open(
    announcements: AdminAnnouncementDto[],
    preview: AnnouncementTextPreviewDto | null,
  ): Promise<void> {
    fixture.componentRef.setInput('title', 'Open late');
    fixture.componentRef.setInput('startDate', '2026-11-20');
    fixture.detectChanges();
    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ announcements }));
    fixture.detectChanges();
    await fixture.whenStable();
    if (preview !== null) {
      store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({ preview }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideStore({
          [adminAnnouncementsFeature.name]: adminAnnouncementsFeature.reducer,
          [adminAnnouncementTextsFeature.name]: adminAnnouncementTextsFeature.reducer,
          [shopFeature.name]: shopFeature.reducer,
        }),
      ],
    });
    store = TestBed.inject<Store<AppState>>(Store);
    store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AnnouncementText);
  });

  it('asks for the preview of the saved announcement it is about', async (): Promise<void> => {
    await open([SAVED], null);

    expect(dispatchSpy).toHaveBeenCalledWith(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequest({
      request: {
        title: 'Open late',
        bodyHtml: '<p>Until 8 PM.</p>',
        startDate: '2026-11-20',
      },
    }));
  });

  it('shows the suggested wording to change, and who gets it', async (): Promise<void> => {
    await open([SAVED], PREVIEW);

    expect((element('[data-testid="text-message"]') as HTMLTextAreaElement).value).toBe(PREVIEW.message);
    expect(element('[data-testid="text-who"]').textContent).toContain('now to 12 people');
    expect(element('[data-testid="text-length"]').textContent).toContain(`${PREVIEW.message.length} characters`);
  });

  it('sends the wording as it stands, and only when the button is pressed', async (): Promise<void> => {
    await open([SAVED], PREVIEW);
    const area: HTMLTextAreaElement = element('[data-testid="text-message"]') as HTMLTextAreaElement;
    area.value = 'Late Fridays! Reply STOP to opt out.';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const dispatchedBefore: number = dispatchSpy.mock.calls.length;

    element('[data-testid="text-send"]').click();

    expect(dispatchSpy.mock.calls.length).toBe(dispatchedBefore + 1);
    expect(dispatchSpy).toHaveBeenCalledWith(AdminAnnouncementTextsActions.AnnouncementTextSend({
      request: {
        title: 'Open late',
        startDate: '2026-11-20',
        message: 'Late Fridays! Reply STOP to opt out.',
      },
    }));
  });

  it('cannot send while texts are off, nobody has signed up, or it was already texted', async (): Promise<void> => {
    await open([SAVED], { ...PREVIEW, isEnabled: false });
    expect((element('[data-testid="text-send"]') as HTMLButtonElement).disabled).toBe(true);
    expect(host().querySelector('[data-testid="text-off"]')).not.toBeNull();

    store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({
      preview: { ...PREVIEW, subscriberCount: 0 },
    }));
    fixture.detectChanges();
    expect((element('[data-testid="text-send"]') as HTMLButtonElement).disabled).toBe(true);
    expect(host().querySelector('[data-testid="text-nobody"]')).not.toBeNull();

    store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextPreviewRequestSuccess({
      preview: { ...PREVIEW, alreadyTexted: STATUS },
    }));
    fixture.detectChanges();
    expect((element('[data-testid="text-send"]') as HTMLButtonElement).disabled).toBe(true);
    expect(host().querySelector('[data-testid="text-already"]')).not.toBeNull();
  });

  it('cannot send an empty or too long message', async (): Promise<void> => {
    await open([SAVED], PREVIEW);
    const area: HTMLTextAreaElement = element('[data-testid="text-message"]') as HTMLTextAreaElement;

    area.value = '   ';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((element('[data-testid="text-send"]') as HTMLButtonElement).disabled).toBe(true);

    area.value = 'x'.repeat(481);
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((element('[data-testid="text-send"]') as HTMLButtonElement).disabled).toBe(true);
    expect(element('[data-testid="text-length"]').textContent).toContain('too long');
  });

  it('says a text for a future first day waits for it', async (): Promise<void> => {
    await open([SAVED], { ...PREVIEW, isScheduled: true });

    expect(element('[data-testid="text-who"]').textContent).toContain('first day, 2026-11-20');
  });

  it('says where the text stands once it is sent, and does not offer to send again', async (): Promise<void> => {
    await open([SAVED], PREVIEW);

    store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextSendSuccess({ status: STATUS }));
    fixture.detectChanges();

    expect(element('[data-testid="text-sent"]').textContent).toContain('going out now to 12 people');
    expect(host().querySelector('[data-testid="text-send"]')).toBeNull();
  });

  it('says a scheduled text is saved for its day', async (): Promise<void> => {
    await open([SAVED], { ...PREVIEW, isScheduled: true });

    store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextSendSuccess({
      status: { ...STATUS, state: AnnouncementSendState.Scheduled },
    }));
    fixture.detectChanges();

    expect(element('[data-testid="text-sent"]').textContent).toContain('will go out on 2026-11-20');
  });

  it('says why a send failed', async (): Promise<void> => {
    await open([SAVED], PREVIEW);

    store.dispatch(AdminAnnouncementTextsActions.AnnouncementTextSendFailure({
      error: AnnouncementTextError.AlreadyTexted,
    }));
    fixture.detectChanges();

    expect(element('[data-testid="text-error"]').textContent).toContain('already texted');
  });

  it('says so when the announcement is not in the list', async (): Promise<void> => {
    await open([], null);

    expect(host().querySelector('[data-testid="text-missing"]')).not.toBeNull();
  });

  it('starts the next announcement from nothing when it is left', async (): Promise<void> => {
    await open([SAVED], PREVIEW);

    fixture.destroy();

    expect(dispatchSpy).toHaveBeenCalledWith(AdminAnnouncementTextsActions.AnnouncementTextReset());
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await open([SAVED], PREVIEW);

    await expectNoAxeViolations(host());
  });
});
