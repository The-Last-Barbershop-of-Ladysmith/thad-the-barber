import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InputSignal,
  ModelSignal,
  OutputEmitterRef,
  Signal,
  afterNextRender,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FocusTrapModule } from 'primeng/focustrap';
import { GalleryModule } from 'primeng/gallery';
import { GalleryPhoto } from '../../models/gallery-photo.model';

/** The full-screen photo viewer, apart from the lookbook so its PrimeNG Gallery loads only when a print is opened. */
@Component({
  selector: 'app-gallery-lightbox',
  imports: [
    FocusTrapModule,
    GalleryModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-lightbox.html',
  styleUrl: './gallery-lightbox.scss',
})
export class GalleryLightbox {
  readonly photos: InputSignal<GalleryPhoto[]> = input.required<GalleryPhoto[]>();
  readonly activeIndex: ModelSignal<number> = model.required<number>();
  readonly closed: OutputEmitterRef<void> = output();

  private readonly lightbox: Signal<ElementRef<HTMLElement> | undefined> = viewChild('lightbox', { read: ElementRef<HTMLElement> });

  constructor() {
    afterNextRender((): void => {
      this.lightbox()?.nativeElement.focus();
    });
  }
}
