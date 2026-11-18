import { NavItem } from './nav-item.model';
import { LegalPart } from './legal-part.model';

export interface LegalSection extends NavItem {
  paragraphs: LegalPart[][];
}
