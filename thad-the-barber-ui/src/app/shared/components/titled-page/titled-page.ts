import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';

/**
 * The layout of every page but home: a darkened photo band behind the eyebrow and title, then the page's content
 * on plain dark. Plain pages pass `eyebrow` and `heading`; a page whose title needs markup projects
 * `[pageEyebrow]` and `[pageHeading]` (its own `h1`) instead. `[pageSubtitle]` goes under the title.
 */
@Component({
  selector: 'app-titled-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './titled-page.html',
  styleUrl: './titled-page.scss',
})
export class TitledPage {
  readonly eyebrow: InputSignal<string | undefined> = input<string>();
  readonly heading: InputSignal<string | undefined> = input<string>();
}
