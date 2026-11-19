import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TextUpdatesForm } from '../../features/text-updates/components/text-updates-form/text-updates-form';
import { TitledPage } from '../../shared/components/titled-page/titled-page';

@Component({
  selector: 'app-text-updates',
  imports: [TitledPage, TextUpdatesForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-updates.html',
})
export class TextUpdates {}
