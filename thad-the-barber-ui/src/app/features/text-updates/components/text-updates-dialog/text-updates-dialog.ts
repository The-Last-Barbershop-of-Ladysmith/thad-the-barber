import { ChangeDetectionStrategy, Component, WritableSignal, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TextUpdatesForm } from '../text-updates-form/text-updates-form';

/** A link-styled button that opens the shop-news sign-up in a dialog; place it on any page, like the footer. */
@Component({
  selector: 'app-text-updates-dialog',
  imports: [DialogModule, TextUpdatesForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-updates-dialog.html',
})
export class TextUpdatesDialog {
  protected readonly isOpen: WritableSignal<boolean> = signal(false);
}
