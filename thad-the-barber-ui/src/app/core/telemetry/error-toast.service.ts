import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { IErrorService } from '@microsoft/applicationinsights-angularplugin-js';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';

/**
 * The app's `ErrorHandler`: logs an uncaught error to the console like Angular's own, and shows one friendly error
 * toast, never the error itself. The app's `p-toast` has `preventOpenDuplicates`, so a second error leaves the first
 * (sticky) toast alone. With App Insights on, the plugin's error service calls this too and adds the logging there.
 */
@Injectable({ providedIn: 'root' })
export class ErrorToastService implements IErrorService {
  private readonly messageService: MessageService = inject(MessageService);
  private readonly injector: Injector = inject(Injector);
  private readonly consoleHandler: ErrorHandler = new ErrorHandler();

  handleError(error: unknown): void {
    this.consoleHandler.handleError(error);
    // The store's devtools inject ErrorHandler, so the store can't be a field here without a circular dependency.
    const phone: PhoneLinks = this.injector.get<Store<AppState>>(Store).selectSignal(shopFeature.selectPhoneLinks)();
    this.messageService.add({
      severity: 'error',
      summary: `Something went wrong. Please try again, or call or text ${phone.display}.`,
      sticky: true,
    });
  }
}
