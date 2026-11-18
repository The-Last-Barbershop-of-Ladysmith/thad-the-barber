import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PhotoUpload } from '../../../../../shared/components/photo-upload/photo-upload';
import { RichTextEditor } from '../../../../../shared/components/rich-text-editor/rich-text-editor';
import { shopFeature } from '../../../../shop/state/shop.feature';
import { toIsoDate, toIsoDateIn } from '../../../../../shared/utils/date.utils';
import { isPhoneScreen } from '../../../../../shared/utils/screen.utils';
import { AppState } from '../../../../../store/app.state';
import { AnnouncementButtonsField } from '../../components/announcement-buttons-field/announcement-buttons-field';
import { AnnouncementPreview } from '../../components/announcement-preview/announcement-preview';
import { ANNOUNCEMENTS_PATH } from '../../config/announcements-paths';
import {
  AdminAnnouncementButtonDto,
  AdminAnnouncementDto,
  AdminAnnouncementImageDto,
} from '../../dtos/admin-announcement.dto';
import { AdminAnnouncementImageUploadDto } from '../../dtos/admin-announcement-image-upload.dto';
import { AnnouncementInputDto } from '../../dtos/announcements-save-request.dto';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '../../../gallery/utils/gallery-upload.utils';
import { AdminAnnouncementsError } from '../../models/admin-announcements-error.model';
import { AnnouncementFormValue } from '../../models/announcement-form-value.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import {
  isBadButton,
  isEndBeforeStart,
  toAnnouncementInput,
  toFormValue,
  withAnnouncement,
} from '../../utils/announcement-form.utils';
import { removeAt, toInputs } from '../../utils/announcement-list.utils';
import { toAnnouncementsMessage } from '../../utils/announcements-message.utils';
import { AdminPageHeader } from '../../../components/admin-page-header/admin-page-header';

/** Writes a new announcement, or edits (and can delete) the one at `index` in the saved list. */
@Component({
  selector: 'app-admin-announcement-edit',
  imports: [
    AdminPageHeader,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PhotoUpload,
    RichTextEditor,
    AnnouncementButtonsField,
    AnnouncementPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-edit.html',
  styleUrl: './announcement-edit.scss',
})
export class AnnouncementEdit implements OnInit {
  /** The place in the saved list, from the route; none for a new announcement. */
  readonly index: InputSignal<string | undefined> = input<string>();

  protected readonly listPath: string = ANNOUNCEMENTS_PATH;
  protected readonly positions: AnnouncementImagePosition[] = Object.values(AnnouncementImagePosition);

  // The fields are signals read from native inputs, not Angular forms: the page's form code would otherwise land in the
  // initial bundle, which is nearly at its budget.
  protected readonly title: WritableSignal<string> = signal<string>('');
  protected readonly message: WritableSignal<string> = signal<string>('');
  protected readonly startDate: WritableSignal<string> = signal<string>('');
  protected readonly endDate: WritableSignal<string> = signal<string>('');
  protected readonly imageAltText: WritableSignal<string> = signal<string>('');
  protected readonly imagePosition: WritableSignal<AnnouncementImagePosition> = signal<AnnouncementImagePosition>(
    AnnouncementImagePosition.Right,
  );
  protected readonly buttons: WritableSignal<AdminAnnouncementButtonDto[]> = signal<AdminAnnouncementButtonDto[]>([]);
  protected readonly image: WritableSignal<AdminAnnouncementImageDto | null> = signal<AdminAnnouncementImageDto | null>(
    null,
  );

  protected readonly submitted: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isConfirmingDelete: WritableSignal<boolean> = signal<boolean>(false);
  /** A phone starts on the phone preview, which fits it, and a wide screen on the desktop one. */
  protected readonly isPhonePreview: WritableSignal<boolean> = signal<boolean>(
    isPhoneScreen(inject(DOCUMENT).defaultView),
  );
  protected readonly isConfirmingPhotoRemoval: WritableSignal<boolean> = signal<boolean>(false);
  /** Whether the first day is picked, rather than the announcement starting today. */
  protected readonly isScheduled: WritableSignal<boolean> = signal<boolean>(false);
  /** Why the chosen photo can't be sent, found before anything is sent. */
  protected readonly photoProblem: WritableSignal<string | null> = signal<string | null>(null);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly announcements: Signal<AdminAnnouncementDto[]> = this.store.selectSignal(
    adminAnnouncementsFeature.selectAnnouncements,
  );
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private readonly photoUpload: Signal<PhotoUpload | undefined> = viewChild<PhotoUpload>('photoUpload');
  private readonly uploadedImage: Signal<AdminAnnouncementImageUploadDto | null> = this.store.selectSignal(
    adminAnnouncementsFeature.selectUploadedImage,
  );
  private readonly error: Signal<AdminAnnouncementsError | null> = this.store.selectSignal(
    adminAnnouncementsFeature.selectError,
  );
  private today: string = '';
  private isFormReady: boolean = false;

  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoaded);
  protected readonly isUploadingImage: Signal<boolean> = this.store.selectSignal(
    adminAnnouncementsFeature.selectIsImageUploading,
  );
  protected readonly isSaving: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsSaving);

  protected readonly problem: Signal<string | null> = computed((): string | null => {
    const error: AdminAnnouncementsError | null = this.error();
    return error === null ? null : toAnnouncementsMessage(error);
  });

  /** The place in the saved list, or null for a new announcement. */
  private readonly place: Signal<number | null> = computed((): number | null => {
    const index: string | undefined = this.index();
    return index === undefined ? null : Number(index);
  });

  protected readonly isNew: Signal<boolean> = computed((): boolean => this.place() === null);

  /** A saved announcement that is no longer in the list (it was deleted elsewhere, or the address is wrong). */
  protected readonly isMissing: Signal<boolean> = computed((): boolean => {
    const place: number | null = this.place();
    return this.isLoaded() && place !== null && this.announcements()[place] === undefined;
  });

  protected readonly isTitleMissing: Signal<boolean> = computed((): boolean => this.title().trim() === '');

  protected readonly hasBadDates: Signal<boolean> = computed((): boolean =>
    this.startDate() === '' || this.endDate() === '' || isEndBeforeStart(this.startDate(), this.endDate()));

  /** A picture needs a description for screen readers before it can be saved. */
  protected readonly isAltTextMissing: Signal<boolean> = computed((): boolean =>
    this.image() !== null && this.imageAltText().trim() === '');

  /** The photo as the form has it now: the stored file with the description and side being edited. */
  protected readonly previewImage: Signal<AdminAnnouncementImageDto | null> = computed(
    (): AdminAnnouncementImageDto | null => {
      const image: AdminAnnouncementImageDto | null = this.image();
      return image === null
        ? null
        : {
          ...image,
          altText: this.imageAltText(),
          position: this.imagePosition(),
        };
    },
  );

  constructor() {
    // A photo that was stored becomes the announcement's photo; it has no description yet, which the form asks for.
    effect((): void => {
      const uploaded: AdminAnnouncementImageUploadDto | null = this.uploadedImage();
      if (uploaded !== null) {
        this.image.set({
          fileName: uploaded.fileName,
          src: uploaded.src,
          altText: '',
          position: this.imagePosition(),
        });
        this.imageAltText.set('');
        this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsImageTaken());
      }
    });
    effect((): void => {
      if (this.isLoaded() && !this.isFormReady && !this.isMissing()) {
        this.isFormReady = true;
        this.fill();
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequest());
  }

  protected onInput(field: WritableSignal<string>, event: Event): void {
    field.set((event.target as HTMLInputElement).value);
  }

  protected showFromToday(): void {
    this.isScheduled.set(false);
    this.startDate.set(this.today);
  }

  protected onPhoto(file: File | null): void {
    if (file === null) {
      return;
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      this.photoProblem.set('Use a JPEG, PNG, WebP or AVIF photo.');
    } else if (file.size > MAX_PHOTO_BYTES) {
      this.photoProblem.set('That photo is too big. Use one under 25 MB.');
    } else {
      this.photoProblem.set(null);
      this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsImageUpload({ file }));
    }
    // The photo goes up as soon as it is chosen and then shows above, so the box is ready for the next one.
    this.photoUpload()?.clear();
  }

  protected removeImage(): void {
    this.isConfirmingPhotoRemoval.set(false);
    this.image.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    const hasBadButton: boolean = this.buttons().some(isBadButton);
    if (this.isTitleMissing() || this.hasBadDates() || hasBadButton || this.isAltTextMissing()) {
      return;
    }
    const value: AnnouncementFormValue = {
      title: this.title(),
      message: this.message(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      imageAltText: this.imageAltText(),
      imagePosition: this.imagePosition(),
      buttons: this.buttons(),
    };
    const input: AnnouncementInputDto = toAnnouncementInput(value, this.image());
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsSave({
      announcements: withAnnouncement(
        toInputs(this.announcements()),
        this.place(),
        input,
      ),
    }));
  }

  protected delete(): void {
    const place: number | null = this.place();
    if (place !== null) {
      this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsSave({
        announcements: removeAt(toInputs(this.announcements()), place),
      }));
    }
  }

  private fill(): void {
    const place: number | null = this.place();
    const item: AdminAnnouncementDto | null = place === null ? null : this.announcements()[place] ?? null;
    const timeZone: string | null = this.timeZone();
    this.today = timeZone === null ? toIsoDate(new Date()) : toIsoDateIn(timeZone, new Date());
    const value: AnnouncementFormValue = toFormValue(item, this.today);
    this.title.set(value.title);
    this.message.set(value.message);
    this.startDate.set(value.startDate);
    this.endDate.set(value.endDate);
    this.isScheduled.set(value.startDate > this.today);
    this.imageAltText.set(value.imageAltText);
    this.imagePosition.set(value.imagePosition);
    this.buttons.set(value.buttons);
    this.image.set(item?.image ?? null);
  }
}
