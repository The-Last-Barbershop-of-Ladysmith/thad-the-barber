import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  viewChild,
} from '@angular/core';
import { FileSelectEvent, FileUpload, FileUploadModule } from 'primeng/fileupload';
import { FileUploadPassThrough } from 'primeng/types/fileupload';

/**
 * Where a photo is chosen: the whole box opens the file dialog, and a photo can be dropped on it. It only reports the
 * file; what is allowed and what happens next is the page's call. The chosen file stays listed until `clear()`.
 */
@Component({
  selector: 'app-photo-upload',
  imports: [FileUploadModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-upload.html',
  styleUrl: './photo-upload.scss',
})
export class PhotoUpload {
  /** The id of the element that names this field. */
  readonly labelledBy: InputSignal<string> = input.required<string>();
  readonly isDisabled: InputSignal<boolean> = input<boolean>(false);
  /** The photo chosen or dropped, or null once it is removed from the list. */
  readonly photoChange: OutputEmitterRef<File | null> = output<File | null>();

  /**
   * The drop zone is the way in, so the toolbar with its Choose button is hidden and the zone fills the box; the
   * upload bar has nothing to show (the page sends the photo); and the remove button needs a name.
   */
  protected readonly fileUploadPassThrough: FileUploadPassThrough = {
    header: { style: { display: 'none' } },
    content: { style: { padding: '0' } },
    pcProgressBar: { root: { style: { display: 'none' } } },
    pcFileRemoveButton: { root: { 'aria-label': 'Remove the chosen photo' } },
  };

  private readonly fileUpload: Signal<FileUpload | undefined> = viewChild<FileUpload>('fileUpload');

  clear(): void {
    this.fileUpload()?.clear();
  }

  protected onFileSelect(event: FileSelectEvent): void {
    this.photoChange.emit(event.currentFiles[0] ?? null);
  }

  protected onFileRemove(): void {
    this.photoChange.emit(null);
  }
}
