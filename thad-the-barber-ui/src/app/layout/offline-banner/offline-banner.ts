import { ChangeDetectionStrategy, Component, WritableSignal, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MessageModule } from 'primeng/message';

/**
 * A banner under the header while the browser reports no connection (`navigator.onLine`); it hides itself when the
 * connection is back. The first state is read after rendering, so a prerendered page and its hydration agree.
 */
@Component({
  selector: 'app-offline-banner',
  imports: [MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  protected readonly isOffline: WritableSignal<boolean> = signal(false);

  constructor() {
    const document: Document = inject(DOCUMENT);
    afterNextRender((): void => {
      this.isOffline.set(!document.defaultView?.navigator.onLine);
    });
  }
}
