import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPage } from '../../shared/components/legal-page/legal-page';
import { LegalSection } from '../../shared/models/legal-section.model';
import { TERMS_SECTIONS } from './terms-sections';

@Component({
  selector: 'app-terms',
  imports: [LegalPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terms.html',
})
export class Terms {
  protected readonly sections: readonly LegalSection[] = TERMS_SECTIONS;
}
