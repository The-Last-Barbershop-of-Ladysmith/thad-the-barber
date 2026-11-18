import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';

/**
 * The top of every admin page: the shop's photo band with a comb-teeth eyebrow and the page title, an optional line
 * under it (`pageLead`), a link back (`pageBack`) and the page's main action on the right (`pageActions`).
 */
@Component({
  selector: 'app-admin-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-page-header.html',
  styleUrl: './admin-page-header.scss',
})
export class AdminPageHeader {
  readonly eyebrow: InputSignal<string> = input.required<string>();
  readonly heading: InputSignal<string> = input.required<string>();
}
