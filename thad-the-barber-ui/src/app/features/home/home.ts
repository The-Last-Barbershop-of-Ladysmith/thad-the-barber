import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AppState } from '../../store/app.state';
import { Store } from '@ngrx/store';
import { Backdrop, BackdropAnchor } from '../../shared/components/backdrop/backdrop';
import { Announcements } from './components/announcements/announcements';
import { Gallery } from './components/gallery/gallery';
import { Hero } from './components/hero/hero';
import { ScheduleCta } from './components/schedule-cta/schedule-cta';
import { Testimonials } from './components/testimonials/testimonials';
import { Visit } from './components/visit/visit';
import * as HomeActions from './state/home.actions';

/** Home page: the one-page scroll of sections from the wireframe. Each section reads its own slice. */
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

  /** Where each backdrop keyframe lands, as in the wireframe. `null` is its removed "services" section. */
  protected readonly backdropAnchors: readonly BackdropAnchor[] = [
    'app-hero',
    '#announcements',
    null,
    '#schedule',
    '#visit',
    '#testimonials',
    '#gallery',
    'app-footer',
  ];

  ngOnInit(): void {
    this.store.dispatch(HomeActions.HomePageOpen());
  }
}
