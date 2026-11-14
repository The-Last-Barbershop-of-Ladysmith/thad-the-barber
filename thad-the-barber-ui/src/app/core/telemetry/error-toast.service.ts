import { Injectable, Injector, inject } from '@angular/core';
import { IErrorService } from '@microsoft/applicationinsights-angularplugin-js';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { AppState } from '../../store/app.state';

/**
 * Shows one friendly error toast for any uncaught error, never the error itself. The app's `p-toast` has
 * `preventOpenDuplicates`, so a second error leaves the first (sticky) toast alone.
 */
@Injectable({ providedIn: 'root' })
export class ErrorToastService implements IErrorService {
  private readonly messageService: MessageService = inject(MessageService);
  private readonly injector: Injector = inject(Injector);

  handleError(): void {
    // The store's devtools inject ErrorHandler, so the store can't be a field here without a circular dependency.
    const phone: PhoneLinks = this.injector.get<Store<AppState>>(Store).selectSignal(shopFeature.selectPhoneLinks)();
    this.messageService.add({
      severity: 'error',
      summary: `Something went wrong. Please try again, or call or text ${phone.display}.`,
      sticky: true,
    });
  }
}
