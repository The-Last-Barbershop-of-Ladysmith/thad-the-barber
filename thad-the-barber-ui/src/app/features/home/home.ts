import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AppState } from '../../store/app.state';
import { Store } from '@ngrx/store';
import { Backdrop, BackdropAnchor } from '../../shared/components/backdrop/backdrop';
import { HomeSection } from '../../shared/models/home-section.model';
import { AnnouncementsCarousel } from '../announcements/components/announcements-carousel/announcements-carousel';
import { Gallery } from './components/gallery/gallery';
import { Hero } from './components/hero/hero';
import { NextTimes } from './components/next-times/next-times';
import { Hours } from './components/hours/hours';
import { ScrollRail } from './components/scroll-rail/scroll-rail';
import { Testimonials } from './components/testimonials/testimonials';
import { Visit } from './components/visit/visit';
import * as HomeActions from './state/home.actions';

/** Home page: the one-page scroll of sections from the wireframe. Each section reads its own slice. */
@Component({
  selector: 'app-home',
  imports: [
    Backdrop,
    Hero,
    AnnouncementsCarousel,
    NextTimes,
    Hours,
    ScrollRail,
    Visit,
    Testimonials,
    Gallery,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  protected readonly sections: typeof HomeSection = HomeSection;

  /** Where each backdrop keyframe lands, as in the wireframe; `#chair` is in the slot of its removed "services". */
  protected readonly backdropAnchors: readonly BackdropAnchor[] = [
    'app-hero',
    `#${HomeSection.OpenTimes}`,
    `#${HomeSection.Hours}`,
    `#${HomeSection.Announcements}`,
    `#${HomeSection.Gallery}`,
    `#${HomeSection.Reviews}`,
    `#${HomeSection.Visit}`,
    'app-footer',
  ];

  ngOnInit(): void {
    this.store.dispatch(HomeActions.HomePageOpen());
  }

  ngOnDestroy(): void {
    this.store.dispatch(HomeActions.HomePageClose());
  }
}
