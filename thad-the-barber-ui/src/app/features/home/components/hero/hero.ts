import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AppState } from '../../../../store/app.state';
import { NextTimeSlot } from '../../models/next-time-slot.model';
import { homeFeature } from '../../state/home.feature';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  protected readonly nextTimeSlots: Signal<NextTimeSlot[]> =
    inject<Store<AppState>>(Store).selectSignal(homeFeature.selectNextTimeSlots);
}
