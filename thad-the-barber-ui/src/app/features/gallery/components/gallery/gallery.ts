import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  Signal,
  WritableSignal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { SkeletonModule } from 'primeng/skeleton';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { AppState } from '../../../../store/app.state';
import { GalleryPhoto } from '../../models/gallery-photo.model';
import { galleryFeature } from '../../state/gallery.feature';
import { GalleryLightbox } from '../gallery-lightbox/gallery-lightbox';

/**
 * Lookbook of staggered prints; clicking one opens the PrimeNG Gallery full-screen lightbox.
 * Photos load as uploaded, lazily. A placeholder holds the section while they load, and a note replaces them when there
 * are none.
 */
@Component({
  selector: 'app-gallery',
  imports: [
    GalleryLightbox,
    SectionHeading,
    SkeletonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly photos: Signal<GalleryPhoto[]> = this.store.selectSignal(galleryFeature.selectPhotos);
  protected readonly isLoading: Signal<boolean> = this.store.selectSignal(galleryFeature.selectIsLoading);

  protected readonly lightboxOpen: WritableSignal<boolean> = signal(false);
  protected readonly activeIndex: WritableSignal<number> = signal(0);

  private readonly injector: Injector = inject(Injector);
  private lightboxOpener: HTMLElement | null = null;

  protected open(index: number, opener: HTMLElement): void {
    this.lightboxOpener = opener;
    this.activeIndex.set(index);
    this.lightboxOpen.set(true);
  }

  // The focus trap holds focus until the gallery is removed, so focus returns to the print after that.
  protected closeLightbox(): void {
    const opener: HTMLElement | null = this.lightboxOpener;
    this.lightboxOpener = null;
    this.lightboxOpen.set(false);
    afterNextRender(
      (): void => {
        opener?.focus();
      },
      { injector: this.injector },
    );
  }
}
