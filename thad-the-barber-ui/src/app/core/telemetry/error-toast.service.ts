import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';

/**
 * The app's `ErrorHandler`: logs an uncaught error to the console like Angular's own, and shows one friendly error
 * toast, never the error itself. The app's `p-toast` has `preventOpenDuplicates`, so a second error leaves the first
 * (sticky) toast alone. Once App Insights has loaded, it sets `reportError` to send each error as an exception.
 */
@Injectable({ providedIn: 'root' })
export class ErrorToastService implements ErrorHandler {
  private readonly messageService: MessageService = inject(MessageService);
  private readonly injector: Injector = inject(Injector);
  private readonly consoleHandler: ErrorHandler = new ErrorHandler();

  reportError?: (error: unknown) => void;

  handleError(error: unknown): void {
    this.consoleHandler.handleError(error);
    // The store's devtools inject ErrorHandler, so the store can't be a field here without a circular dependency.
    const phone: PhoneLinks = this.injector.get<Store<AppState>>(Store).selectSignal(shopFeature.selectPhoneLinks)();
    this.messageService.add({
      severity: 'error',
      summary: `Something went wrong. Please try again, or call or text ${phone.display}.`,
      sticky: true,
    });
    this.reportError?.(error);
  }
}
