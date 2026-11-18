import {
  ChangeDetectionStrategy,
  ElementRef,
  Component,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AppState } from '../../../../../store/app.state';
import { AdminGalleryPhotoDto } from '../../dtos/admin-gallery-photo.dto';
import { AdminGalleryError } from '../../models/admin-gallery-error.model';
import { GalleryUploadProblem } from '../../models/gallery-upload-problem.model';
import * as AdminGalleryActions from '../../state/admin-gallery.actions';
import { adminGalleryFeature } from '../../state/admin-gallery.feature';
import { toGalleryMessage, toUploadProblemMessage } from '../../utils/admin-gallery-error.utils';
import { ACCEPTED_PHOTO_TYPES, MAX_ALT_TEXT_LENGTH, findUploadProblem } from '../../utils/gallery-upload.utils';

/** The gallery: add a photo with its description (its alt text) and delete the ones that are not wanted. */
@Component({
  selector: 'app-admin-gallery',
  imports: [
    DatePipe,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-admin.html',
  styleUrl: './gallery-admin.scss',
})
export class GalleryAdmin implements OnInit {
  protected readonly accept: string = ACCEPTED_PHOTO_TYPES.join(',');
  protected readonly maxAltTextLength: number = MAX_ALT_TEXT_LENGTH;
  protected readonly altText: WritableSignal<string> = signal<string>('');
  protected readonly submitted: WritableSignal<boolean> = signal<boolean>(false);
  /** The photo whose delete is waiting for a second click. */
  protected readonly confirmingFileName: WritableSignal<string | null> = signal<string | null>(null);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly fileInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly altInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('altInput');
  private readonly file: WritableSignal<File | null> = signal<File | null>(null);
  private readonly error: Signal<AdminGalleryError | null> = this.store.selectSignal(adminGalleryFeature.selectError);

  protected readonly photos: Signal<AdminGalleryPhotoDto[]> = this.store.selectSignal(adminGalleryFeature.selectPhotos);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(adminGalleryFeature.selectIsLoading);
  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminGalleryFeature.selectIsLoaded);
  protected readonly isUploading: Signal<boolean> = this.store.selectSignal(adminGalleryFeature.selectIsUploading);
  protected readonly isDeleting: Signal<boolean> = this.store.selectSignal(adminGalleryFeature.selectIsDeleting);
  private readonly isUploaded: Signal<boolean> = this.store.selectSignal(adminGalleryFeature.selectIsUploaded);

  protected readonly problem: Signal<string | null> = computed((): string | null => {
    const error: AdminGalleryError | null = this.error();
    return error === null ? null : toGalleryMessage(error);
  });

  /** What is wrong with the photo and description as they stand, said once the owner has tried to add them. */
  protected readonly uploadProblem: Signal<string | null> = computed((): string | null => {
    const problem: GalleryUploadProblem | null = findUploadProblem(this.file(), this.altText());
    return this.submitted() && problem !== null ? toUploadProblemMessage(problem) : null;
  });

  constructor() {
    // A photo that went up clears the form, ready for the next one.
    effect((): void => {
      if (this.isUploaded()) {
        this.file.set(null);
        this.altText.set('');
        this.submitted.set(false);
        // Both inputs are cleared on the element too: the browser keeps a chosen file and typed text of its own.
        for (const input of [this.fileInput()?.nativeElement, this.altInput()?.nativeElement]) {
          if (input !== undefined) {
            input.value = '';
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminGalleryActions.AdminGalleryRequest());
  }

  protected onFile(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.item(0) ?? null);
  }

  protected onAltText(event: Event): void {
    this.altText.set((event.target as HTMLInputElement).value);
  }

  protected upload(): void {
    this.submitted.set(true);
    const file: File | null = this.file();
    if (file === null || findUploadProblem(file, this.altText()) !== null) {
      return;
    }
    this.store.dispatch(AdminGalleryActions.AdminGalleryUpload({
      file,
      altText: this.altText().trim(),
    }));
  }

  protected delete(fileName: string): void {
    this.confirmingFileName.set(null);
    this.store.dispatch(AdminGalleryActions.AdminGalleryDelete({ fileName }));
  }
}
