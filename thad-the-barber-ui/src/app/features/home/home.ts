import { ChangeDetectionStrategy, Component, type OnInit, type Signal, inject } from '@angular/core';
import { type AppState } from '../../store/app.state';
import { type Announcement, type GalleryPhoto, type Testimonial } from './models/home.models';
import { Store } from '@ngrx/store';
import { Backdrop } from '../../shared/components/backdrop/backdrop';
import { Announcements } from './components/announcements/announcements';
import { Gallery } from './components/gallery/gallery';
import { Hero } from './components/hero/hero';
import { ScheduleCta } from './components/schedule-cta/schedule-cta';
import { Testimonials } from './components/testimonials/testimonials';
import { Visit } from './components/visit/visit';
import { HomePageActions } from './state/home.actions';
import { homeFeature } from './state/home.feature';

/** Home page: the one-page scroll of sections from the wireframe. Reads content from the home slice. */
@Component({
  selector: 'app-home',
  imports: [
    Backdrop,
    Hero,
    Announcements,
    ScheduleCta,
    Visit,
    Testimonials,
    Gallery,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly announcements: Signal<Announcement[]> = this.store.selectSignal(homeFeature.selectAnnouncements);
  protected readonly testimonials: Signal<Testimonial[]> = this.store.selectSignal(homeFeature.selectTestimonials);
  protected readonly gallery: Signal<GalleryPhoto[]> = this.store.selectSignal(homeFeature.selectGallery);

  ngOnInit(): void {
    this.store.dispatch(HomePageActions.opened());
  }
}
