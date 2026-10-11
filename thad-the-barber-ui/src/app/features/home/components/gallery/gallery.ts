import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  Signal,
  WritableSignal,
  computed,
  input,
  signal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { GalleriaModule } from 'primeng/galleria';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { mediaSrcset, mediaUrl } from '../../../../shared/utils/media.utils';
import { GalleryImage, GalleryPhoto } from '../../models/home.models';

/**
 * Masonry grid of framed prints; clicking one opens the PrimeNG Galleria full-screen lightbox.
 * Each print picks its WebP variant from the media container by width. With no photos the section is hidden.
 */
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

  protected readonly images: Signal<GalleryImage[]> = computed((): GalleryImage[] =>
    this.photos().map((photo: GalleryPhoto): GalleryImage => ({
      ...photo,
      src: mediaUrl(
        'gallery',
        photo.image,
        'md',
      ),
      srcset: mediaSrcset(
        'gallery',
        photo.image,
        photo.width,
      ),
    })));

  protected readonly lightboxOpen: WritableSignal<boolean> = signal(false);
  protected readonly activeIndex: WritableSignal<number> = signal(0);

  protected open(index: number): void {
    this.activeIndex.set(index);
    this.lightboxOpen.set(true);
  }
}
