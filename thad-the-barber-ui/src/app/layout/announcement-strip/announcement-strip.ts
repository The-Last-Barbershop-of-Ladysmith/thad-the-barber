import { ChangeDetectionStrategy, Component, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { Announcement } from '../../features/announcements/models/announcement.model';
import * as AnnouncementsActions from '../../features/announcements/state/announcements.actions';
import { announcementsFeature } from '../../features/announcements/state/announcements.feature';
import { Rotation } from '../../shared/models/rotation.model';
import { createRotation } from '../../shared/utils/rotation.utils';
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

  protected readonly announcements: Signal<Announcement[]> = this.store.selectSignal(
    announcementsFeature.selectActiveNewestFirst,
  );

  protected readonly isClosed: WritableSignal<boolean> = signal(false);
  protected readonly rotation: Rotation = createRotation({
    count: computed((): number => this.announcements().length),
    intervalMs: 6000,
    isStopped: this.isClosed,
  });

  protected showInCarousel(index: number): void {
    this.store.dispatch(AnnouncementsActions.AnnouncementShown({ index }));
  }

  protected close(): void {
    this.isClosed.set(true);
  }
}
