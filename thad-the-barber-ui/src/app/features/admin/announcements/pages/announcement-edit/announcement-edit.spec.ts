import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../../testing/axe';
import { TEST_SHOP } from '../../../../../../testing/test-shop';
import { RichTextEditor } from '../../../../../shared/components/rich-text-editor/rich-text-editor';
import { AppState } from '../../../../../store/app.state';
import * as ShopActions from '../../../../shop/state/shop.actions';
import { shopFeature } from '../../../../shop/state/shop.feature';
import { AdminAnnouncementDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../../models/admin-announcement-status.model';
import { AnnouncementButtonVariant } from '../../models/announcement-button-variant.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { AnnouncementEdit } from './announcement-edit';

const SAVED: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<p>We are <strong>closed</strong>.</p>',
  startDate: '2026-11-20',
  endDate: '2026-12-26',
  image: {
    fileName: 'hours.webp',
    altText: 'A sign',
    position: AnnouncementImagePosition.Left,
    src: 'https://example.test/announcements/hours.webp',
  },
  buttons: [
    {
      label: 'Book',
      url: '/book',
      variant: AnnouncementButtonVariant.Primary,
    },
  ],
  status: AdminAnnouncementStatus.Showing,
};

const OTHER: AdminAnnouncementDto = {
  ...SAVED,
  title: 'Other',
  image: null,
  buttons: [],
};

describe('AnnouncementEdit', (): void => {
  let fixture: ComponentFixture<AnnouncementEdit>;
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

  function input(selector: string): HTMLInputElement {
    return element(selector) as HTMLInputElement;
  }

  function buttonByText(text: string): HTMLElement {
    const found: HTMLElement | undefined = Array.from(host().querySelectorAll<HTMLElement>('button, .segment'))
      .find((button: HTMLElement): boolean => button.textContent.trim() === text);
    if (found === undefined) {
      throw new Error(`No button says ${text}.`);
    }
    return found;
  }

  function type(selector: string, value: string): void {
    const field: HTMLInputElement = input(selector);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  function writeMessage(html: string): void {
    const editor: RichTextEditor = fixture.debugElement.query(By.directive(RichTextEditor))
      .componentInstance as RichTextEditor;
    editor.htmlChange.emit(html);
    fixture.detectChanges();
  }

  /** Opens the page the way the router does: the page asks for the list, then the list arrives. */
  async function open(index: string | undefined, announcements: AdminAnnouncementDto[]): Promise<void> {
    if (index !== undefined) {
      fixture.componentRef.setInput('index', index);
    }
    fixture.detectChanges();
    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequestSuccess({ announcements }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function lastSaved(): AnnouncementInputDto[] {
    const action: unknown = dispatchSpy.mock.calls.at(-1)?.[0];
    return (action as { announcements?: AnnouncementInputDto[]; }).announcements ?? [];
  }

  beforeEach((): void => {
    // The file chooser previews an image through an object URL, which the test DOM doesn't have.
    URL.createObjectURL = (): string => 'blob:preview';
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
    fixture = TestBed.createComponent(AnnouncementEdit);
  });

  it('starts a new announcement today, ending 30 days on', async (): Promise<void> => {
    await open(undefined, []);

    expect(host().querySelector('h1')?.textContent.trim()).toBe('New announcement');
    expect(host().querySelector('#announcement-start')).toBeNull();
    element('[data-testid="show-on-dates"]').click();
    fixture.detectChanges();
    const start: string = input('#announcement-start').value;
    const end: string = input('#announcement-end').value;
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((Date.parse(end) - Date.parse(start)) / 86_400_000).toBe(30);
  });

  it('adds a new announcement to the end of the saved list', async (): Promise<void> => {
    await open(undefined, [SAVED]);

    type('#announcement-title', '  Open late  ');
    writeMessage('<p>Until <strong>8</strong></p>');
    element('[data-testid="save-announcement"]').click();

    const saved: AnnouncementInputDto[] = lastSaved();
    expect(saved).toHaveLength(2);
    expect(saved[1]?.title).toBe('Open late');
    expect(saved[1]?.bodyHtml).toBe('<p>Until <strong>8</strong></p>');
    expect(saved[1]?.image).toBeNull();
  });

  it('does not save without a title, and says why', async (): Promise<void> => {
    await open(undefined, []);
    const before: number = dispatchSpy.mock.calls.length;

    element('[data-testid="save-announcement"]').click();
    fixture.detectChanges();

    expect(dispatchSpy.mock.calls.length).toBe(before);
    expect(host().querySelector('[data-testid="title-error"]')).not.toBeNull();
  });

  it('does not save a last day before the first', async (): Promise<void> => {
    await open('0', [SAVED]);

    type('#announcement-end', '2026-11-01');
    element('[data-testid="save-announcement"]').click();
    fixture.detectChanges();

    expect(host().querySelector('[data-testid="dates-error"]')).not.toBeNull();
  });

  it('fills the form from the saved announcement and saves changes in its place', async (): Promise<void> => {
    await open('1', [SAVED, OTHER]);

    expect(input('#announcement-title').value).toBe('Other');
    type('#announcement-title', 'Renamed');
    element('[data-testid="save-announcement"]').click();

    expect(lastSaved().map((item: AnnouncementInputDto): string => item.title)).toEqual(['Holiday hours', 'Renamed']);
  });

  it('keeps the picture, with its description and side', async (): Promise<void> => {
    await open('0', [SAVED]);

    type('#announcement-alt', 'A new sign');
    element('[data-testid="save-announcement"]').click();

    expect(lastSaved()[0]?.image).toEqual({
      fileName: 'hours.webp',
      altText: 'A new sign',
      position: AnnouncementImagePosition.Left,
    });
  });

  it('asks twice before removing the picture, then saves without it', async (): Promise<void> => {
    await open('0', [SAVED]);

    element('[data-testid="remove-photo"]').click();
    fixture.detectChanges();
    expect(host().querySelector('.photo-row')).not.toBeNull();

    element('[data-testid="confirm-remove-photo"]').click();
    fixture.detectChanges();
    element('[data-testid="save-announcement"]').click();

    expect(lastSaved()[0]?.image).toBeNull();
  });

  it('needs a description before a picture can be saved', async (): Promise<void> => {
    await open('0', [SAVED]);
    const before: number = dispatchSpy.mock.calls.length;

    type('#announcement-alt', '   ');
    element('[data-testid="save-announcement"]').click();
    fixture.detectChanges();

    expect(dispatchSpy.mock.calls.length).toBe(before);
    expect(host().querySelector('[data-testid="alt-error"]')).not.toBeNull();
  });

  it('changes the side of the picture from its buttons', async (): Promise<void> => {
    await open('0', [SAVED]);

    buttonByText('right').click();
    element('[data-testid="save-announcement"]').click();

    expect(lastSaved()[0]?.image?.position).toBe(AnnouncementImagePosition.Right);
  });

  it('adds, checks and removes buttons', async (): Promise<void> => {
    await open('1', [SAVED, OTHER]);

    element('[data-testid="add-button"]').click();
    fixture.detectChanges();
    type('#button-label-0', 'Call');
    fixture.detectChanges();
    type('#button-url-0', 'javascript:alert(1)');
    fixture.detectChanges();
    element('[data-testid="save-announcement"]').click();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="button-error"]')).not.toBeNull();

    type('#button-url-0', 'tel:+15550100');
    fixture.detectChanges();
    element('[data-testid="save-announcement"]').click();
    expect(lastSaved()[1]?.buttons).toEqual([
      {
        label: 'Call',
        url: 'tel:+15550100',
        variant: AnnouncementButtonVariant.Primary,
      },
    ]);

    element('[data-testid="remove-button"]').click();
    fixture.detectChanges();
    expect(host().querySelectorAll('[data-testid="button-row"]')).toHaveLength(1);

    element('[data-testid="confirm-remove-button"]').click();
    fixture.detectChanges();
    expect(host().querySelectorAll('[data-testid="button-row"]')).toHaveLength(0);
  });

  it('asks twice before deleting, then saves the list without it', async (): Promise<void> => {
    await open('0', [SAVED, OTHER]);

    element('[data-testid="delete-announcement"]').click();
    fixture.detectChanges();
    element('[data-testid="confirm-delete"]').click();

    expect(lastSaved().map((item: AnnouncementInputDto): string => item.title)).toEqual(['Other']);
  });

  it('shows a stored message in the editor and keeps it when nothing is changed', async (): Promise<void> => {
    await open('0', [{ ...SAVED, bodyHtml: '<p>Hi</p><ul><li>One</li></ul>' }]);

    element('[data-testid="save-announcement"]').click();

    expect(lastSaved()[0]?.bodyHtml).toBe('<p>Hi</p><ul><li>One</li></ul>');
  });

  it('shows the announcement as it will look, following what is typed', async (): Promise<void> => {
    await open(undefined, []);

    type('#announcement-title', 'Open late');
    writeMessage('<p>Until <strong>8</strong></p>');

    expect(element('[data-testid="announcement-preview"]').textContent).toContain('Open late');
    expect(element('[data-testid="preview-body"] strong').textContent).toBe('8');
  });

  it('previews at desktop width, or at the width of a phone', async (): Promise<void> => {
    await open('0', [SAVED]);
    const stage: HTMLElement = element('.preview-viewport');

    expect(stage.classList.contains('is-phone')).toBe(false);

    element('[data-testid="preview-phone"]').click();
    fixture.detectChanges();
    expect(stage.classList.contains('is-phone')).toBe(true);

    element('[data-testid="preview-desktop"]').click();
    fixture.detectChanges();
    expect(stage.classList.contains('is-phone')).toBe(false);
  });

  it('starts on a picked day, or from today again', async (): Promise<void> => {
    await open('0', [SAVED]);

    expect(input('#announcement-start').value).toBe('2026-11-20');

    element('[data-testid="show-now"]').click();
    fixture.detectChanges();
    expect(host().querySelector('#announcement-start')).toBeNull();
    element('[data-testid="save-announcement"]').click();

    expect(lastSaved()[0]?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastSaved()[0]?.startDate).not.toBe('2026-11-20');
  });

  it('says so when the announcement is no longer in the list', async (): Promise<void> => {
    await open('5', [SAVED]);

    expect(host().querySelector('[data-testid="announcement-missing"]')).not.toBeNull();
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await open('0', [SAVED]);

    await expectNoAxeViolations(host());
  });

  function choosePhoto(file: File): void {
    const picker: HTMLInputElement = input('[data-testid="announcement-photo"] input[type="file"]');
    Object.defineProperty(
      picker,
      'files',
      { value: [file], configurable: true },
    );
    picker.dispatchEvent(new Event('change'));
  }

  it('sends a chosen photo, and says so when it is not an image or is too big', async (): Promise<void> => {
    await open(undefined, []);
    const before: number = dispatchSpy.mock.calls.length;

    choosePhoto(new File(
      ['x'],
      'sign.gif',
      { type: 'image/gif' },
    ));
    fixture.detectChanges();
    expect(element('[data-testid="photo-error"]').textContent).toContain('JPEG, PNG, WebP or AVIF');
    expect(dispatchSpy.mock.calls.length).toBe(before);

    const big: File = new File(
      ['x'],
      'sign.png',
      { type: 'image/png' },
    );
    Object.defineProperty(
      big,
      'size',
      { value: 26 * 1024 * 1024 },
    );
    choosePhoto(big);
    fixture.detectChanges();
    expect(element('[data-testid="photo-error"]').textContent).toContain('too big');

    const good: File = new File(
      ['x'],
      'sign.webp',
      { type: 'image/webp' },
    );
    choosePhoto(good);
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="photo-error"]')).toBeNull();
    const action: unknown = dispatchSpy.mock.calls.at(-1)?.[0];
    expect((action as { file?: File; }).file).toBe(good);
  });

  it('puts a stored photo on the announcement, asking for its description', async (): Promise<void> => {
    await open('0', [SAVED]);

    store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsImageUploadSuccess({
      image: { fileName: 'new-1a2b3c4d.webp', src: 'https://example.test/announcements/new-1a2b3c4d.webp' },
    }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element('[data-testid="save-announcement"]').click();
    fixture.detectChanges();

    expect(element('[data-testid="alt-error"]')).toBeTruthy();
    type('#announcement-alt', 'A new sign');
    element('[data-testid="save-announcement"]').click();
    expect(lastSaved()[0]?.image?.fileName).toBe('new-1a2b3c4d.webp');
    expect(lastSaved()[0]?.image?.altText).toBe('A new sign');
  });
});
