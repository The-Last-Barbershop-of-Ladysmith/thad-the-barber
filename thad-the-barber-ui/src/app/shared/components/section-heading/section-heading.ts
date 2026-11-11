import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { HeadingLevel } from '../../models/heading-level.model';

/** Eyebrow label + uppercase section title, repeated at the top of every home section. */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './section-heading.html',
})
export class SectionHeading {
  protected readonly headingLevel: typeof HeadingLevel = HeadingLevel;

  readonly eyebrow: InputSignal<string> = input.required<string>();
  readonly title: InputSignal<string> = input.required<string>();
  readonly level: InputSignal<HeadingLevel> = input<HeadingLevel>(HeadingLevel.H2);
}
