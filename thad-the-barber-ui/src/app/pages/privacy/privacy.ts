import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPage } from '../../shared/components/legal-page/legal-page';
import { LegalSection } from '../../shared/models/legal-section.model';
import { PRIVACY_SECTIONS } from './privacy-sections';

@Component({
  selector: 'app-privacy',
  imports: [LegalPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.html',
})
export class Privacy {
  protected readonly sections: readonly LegalSection[] = PRIVACY_SECTIONS;
}
