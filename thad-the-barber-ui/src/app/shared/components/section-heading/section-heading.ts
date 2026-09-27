import { ChangeDetectionStrategy, Component, type InputSignal, input } from '@angular/core';

/** Eyebrow label + uppercase section title, repeated at the top of every home section. */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack gap-3.5">
      <span class="eyebrow">{{ eyebrow() }}</span>
      <h2 class="section-title">{{ title() }}</h2>
    </div>
  `,
})
export class SectionHeading {
  readonly eyebrow: InputSignal<string> = input.required<string>();
  readonly title: InputSignal<string> = input.required<string>();
}
