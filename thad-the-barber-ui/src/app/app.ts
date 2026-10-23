import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Header,
    Footer,
    ToastModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  /** Full width along the bottom on phones, clear of the fixed header and the menu drawer. */
  protected readonly toastBreakpoints: Record<string, Record<string, string>> = {
    '40rem': {
      width: '100%',
      left: '0',
      right: '0',
      bottom: '0',
    },
  };
}
