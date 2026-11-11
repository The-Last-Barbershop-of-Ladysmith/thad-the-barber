import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  Signal,
  WritableSignal,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FocusTrapModule } from 'primeng/focustrap';
import { GalleryModule } from 'primeng/gallery';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';
import { AppState } from '../../../../store/app.state';
import { GalleryPhoto } from '../../models/home.models';
import { homeFeature } from '../../state/home.feature';

/**
 * Lookbook of staggered prints; clicking one opens the PrimeNG Gallery full-screen lightbox.
 * Photos load as uploaded, lazily. With no photos the section is hidden.
 */
@Component({
  selector: 'app-gallery',
  imports: [
    FocusTrapModule,
    GalleryModule,
    SectionHeading,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly photos: Signal<GalleryPhoto[]> = this.store.selectSignal(homeFeature.selectGallery);

  protected readonly lightboxOpen: WritableSignal<boolean> = signal(false);
  protected readonly activeIndex: WritableSignal<number> = signal(0);

  private readonly lightbox: Signal<ElementRef<HTMLElement> | undefined> = viewChild('lightbox', { read: ElementRef<HTMLElement> });
  private readonly injector: Injector = inject(Injector);
  private lightboxOpener: HTMLElement | null = null;

  protected open(index: number, opener: HTMLElement): void {
    this.lightboxOpener = opener;
    this.activeIndex.set(index);
    this.lightboxOpen.set(true);
    afterNextRender(
      (): void => {
        this.lightbox()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
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
