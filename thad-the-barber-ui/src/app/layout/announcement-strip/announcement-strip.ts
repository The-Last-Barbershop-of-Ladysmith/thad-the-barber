import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { Announcement } from '../../features/announcements/models/announcement.model';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { AppState } from '../../store/app.state';

/**
 * A band above the header on every page that shows each active announcement's title in turn, newest first, with a
 * pause button and a close button (BR-31). The titles stay stacked in the page so the band keeps its height, and the
 * ones not showing are hidden from assistive tech. Closing lasts until the page reloads.
 */
@Component({
  selector: 'app-announcement-strip',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-strip.html',
  styleUrl: './announcement-strip.scss',
})
export class AnnouncementStrip {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly changeIntervalMs: number = 6000;
  private isPointerOver: boolean = false;

  protected readonly announcements: Signal<Announcement[]> = this.store.selectSignal(
    announcementsFeature.selectActiveNewestFirst,
  );

  protected readonly shownIndex: WritableSignal<number> = signal(0);
  protected readonly isPaused: WritableSignal<boolean> = signal(false);
  protected readonly isClosed: WritableSignal<boolean> = signal(false);
  protected readonly leavingIndex: Signal<number> = computed(
    (): number => (this.shownIndex() - 1 + this.announcements().length) % this.announcements().length,
  );

  constructor() {
    afterNextRender((): void => {
      const timerId: ReturnType<typeof setInterval> = setInterval((): void => {
        this.showNext();
      }, this.changeIntervalMs);
      this.destroyRef.onDestroy((): void => {
        clearInterval(timerId);
      });
    });
  }

  protected togglePause(): void {
    this.isPaused.update((isPaused: boolean): boolean => !isPaused);
  }

  protected close(): void {
    this.isClosed.set(true);
  }

  protected pointerEntered(): void {
    this.isPointerOver = true;
  }

  protected pointerLeft(): void {
    this.isPointerOver = false;
  }

  private showNext(): void {
    const isOnlyOne: boolean = this.announcements().length < 2;
    if (this.isPaused() || this.isPointerOver || isOnlyOne) {
      return;
    }
    this.shownIndex.update((index: number): number => (index + 1) % this.announcements().length);
  }
}
