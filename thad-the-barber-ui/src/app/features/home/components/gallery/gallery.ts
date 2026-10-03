import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  WritableSignal,
  input,
  signal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { GalleriaModule } from 'primeng/galleria';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { GalleryPhoto } from '../../models/home.models';

/** Masonry grid of framed prints; clicking one opens the PrimeNG Galleria full-screen lightbox. */
@Component({
  selector: 'app-gallery',
  imports: [
    CardModule,
    GalleriaModule,
    SectionHeading,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  readonly photos: InputSignal<GalleryPhoto[]> = input.required<GalleryPhoto[]>();

  protected readonly lightboxOpen: WritableSignal<boolean> = signal(false);
  protected readonly activeIndex: WritableSignal<number> = signal(0);

  protected open(index: number): void {
    this.activeIndex.set(index);
    this.lightboxOpen.set(true);
  }
}
