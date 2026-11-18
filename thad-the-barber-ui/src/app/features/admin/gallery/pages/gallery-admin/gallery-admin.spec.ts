import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { expectNoAxeViolations } from '../../../../../../testing/axe';
import { AppState } from '../../../../../store/app.state';
import { AdminGalleryPhotoDto } from '../../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../../models/admin-gallery-error.model';
import * as AdminGalleryActions from '../../state/admin-gallery.actions';
import { adminGalleryFeature } from '../../state/admin-gallery.feature';
import { GalleryAdmin } from './gallery-admin';

const FADE: AdminGalleryPhotoDto = {
  fileName: 'skin-fade.jpg',
  src: 'https://example.test/gallery/skin-fade.jpg',
  altText: 'Skin fade',
  uploadedAt: '2026-10-05T10:00:00Z',
};
const BEARD: AdminGalleryPhotoDto = {
  ...FADE,
  fileName: 'beard.jpg',
  altText: 'Beard trim',
};

describe('GalleryAdmin', (): void => {
  let fixture: ComponentFixture<GalleryAdmin>;
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

  function choose(file: File | null): void {
    const input: HTMLInputElement = element('#gallery-file') as HTMLInputElement;
    const files: FileList = {
      length: file === null ? 0 : 1,
      item: (): File | null => file,
    } as unknown as FileList;
    Object.defineProperty(
      input,
      'files',
      { value: files, configurable: true },
    );
    input.dispatchEvent(new Event('change'));
  }

  function describeIt(text: string): void {
    const input: HTMLInputElement = element('#gallery-alt') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  function lastAction(): {
    type: string; file?: File; altText?: string; fileName?: string;
  } {
    const action: unknown = dispatchSpy.mock.calls.at(-1)?.[0];
    return action as {
      type: string; file?: File; altText?: string; fileName?: string;
    };
  }

  async function open(photos: AdminGalleryPhotoDto[]): Promise<void> {
    fixture.detectChanges();
    store.dispatch(AdminGalleryActions.AdminGalleryRequestSuccess({ photos }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideStore({ [adminGalleryFeature.name]: adminGalleryFeature.reducer })],
    });
    store = TestBed.inject<Store<AppState>>(Store);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(GalleryAdmin);
  });

  it('asks for the photos when it opens, and says it is loading', (): void => {
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(AdminGalleryActions.AdminGalleryRequest());
    expect(element('[data-testid="gallery-loading"]')).toBeTruthy();
  });

  it('shows every photo with its description as its alt text', async (): Promise<void> => {
    await open([FADE, BEARD]);

    const alts: (string | null)[] = Array.from(host().querySelectorAll('.photo-image'))
      .map((image: Element): string | null => image.getAttribute('alt'));
    expect(alts).toEqual(['Skin fade', 'Beard trim']);
  });

  it('says so when there are no photos', async (): Promise<void> => {
    await open([]);

    expect(element('[data-testid="gallery-empty"]')).toBeTruthy();
  });

  it('sends a photo with its trimmed description', async (): Promise<void> => {
    await open([]);
    const file: File = new File(
      ['x'],
      'cut.jpg',
      { type: 'image/jpeg' },
    );

    choose(file);
    describeIt('  Skin fade  ');
    element('[data-testid="upload-photo"]').click();

    expect(lastAction().type).toBe(AdminGalleryActions.AdminGalleryUpload.type);
    expect(lastAction().file).toBe(file);
    expect(lastAction().altText).toBe('Skin fade');
  });

  it('does not send without a photo or a description, and says why', async (): Promise<void> => {
    await open([]);
    const before: number = dispatchSpy.mock.calls.length;

    element('[data-testid="upload-photo"]').click();
    fixture.detectChanges();
    expect(element('[data-testid="upload-error"]').textContent).toContain('Choose a photo');

    choose(new File(
      ['x'],
      'cut.gif',
      { type: 'image/gif' },
    ));
    fixture.detectChanges();
    expect(element('[data-testid="upload-error"]').textContent).toContain('JPEG, PNG, WebP or AVIF');

    choose(new File(
      ['x'],
      'cut.jpg',
      { type: 'image/jpeg' },
    ));
    fixture.detectChanges();
    expect(element('[data-testid="upload-error"]').textContent).toContain('Describe the photo');
    expect(dispatchSpy.mock.calls.length).toBe(before);
  });

  it('clears the form once a photo went up', async (): Promise<void> => {
    await open([]);
    choose(new File(
      ['x'],
      'cut.jpg',
      { type: 'image/jpeg' },
    ));
    describeIt('Skin fade');

    store.dispatch(AdminGalleryActions.AdminGalleryUploadSuccess({ photo: FADE }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((element('#gallery-alt') as HTMLInputElement).value).toBe('');
    expect(host().querySelectorAll('[data-testid="gallery-photo"]')).toHaveLength(1);
  });

  it('asks twice before deleting a photo', async (): Promise<void> => {
    await open([FADE, BEARD]);

    element('[data-testid="delete-photo"]').click();
    fixture.detectChanges();
    expect(lastAction().type).not.toBe(AdminGalleryActions.AdminGalleryDelete.type);
    element('[data-testid="confirm-delete-photo"]').click();

    expect(lastAction().type).toBe(AdminGalleryActions.AdminGalleryDelete.type);
    expect(lastAction().fileName).toBe('skin-fade.jpg');
  });

  it('says what went wrong', async (): Promise<void> => {
    await open([FADE]);

    store.dispatch(AdminGalleryActions.AdminGalleryUploadFailure({ error: AdminGalleryError.InvalidImage }));
    fixture.detectChanges();

    expect(element('[data-testid="gallery-error"]').textContent).toContain('could not be used');
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await open([FADE, BEARD]);

    await expectNoAxeViolations(host());
  });
});
