import { ChangeDetectionStrategy, Component, InputSignal, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-field-error',
  imports: [MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field-error.html',
})
export class FieldError {
  readonly errorId: InputSignal<string> = input.required<string>();
  readonly text: InputSignal<string> = input.required<string>();
}
