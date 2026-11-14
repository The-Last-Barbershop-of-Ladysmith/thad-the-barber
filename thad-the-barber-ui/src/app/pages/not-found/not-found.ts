import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { AppState } from '../../store/app.state';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);

  private readonly heading: Signal<ElementRef<HTMLElement> | undefined> = viewChild<ElementRef<HTMLElement>>('heading');

  protected readonly squareBookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);

  constructor() {
    afterNextRender((): void => {
      this.heading()?.nativeElement.focus();
    });
  }
}
