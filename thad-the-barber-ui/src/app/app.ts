import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Event,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Header,
    Footer,
    ToastModule,
    ProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // A lazy page's code downloads during navigation; the bar fades in late enough that quick ones never show it.
  protected readonly isNavigating: Signal<boolean> = toSignal(
    inject(Router).events.pipe(
      filter((routerEvent: Event): boolean => routerEvent instanceof NavigationStart
        || routerEvent instanceof NavigationEnd
        || routerEvent instanceof NavigationCancel
        || routerEvent instanceof NavigationError),
      map((routerEvent: Event): boolean => routerEvent instanceof NavigationStart),
    ),
    { initialValue: false },
  );

  // A bare #fragment link would be resolved against the base href and navigate to the home page.
  protected skipToContent(click: MouseEvent, main: HTMLElement): void {
    click.preventDefault();
    main.focus();
  }

  /** Full width along the bottom on phones, clear of the fixed header and the menu drawer. */
  protected readonly toastBreakpoints: Record<string, Record<string, string>> = {
    '40rem': {
      width: '100%',
      left: '0',
      bottom: '0',
    },
  };
}
