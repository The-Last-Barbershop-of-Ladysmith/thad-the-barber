import { NavItem } from '../../../shared/models/nav-item.model';
import { PrivacyPart } from './privacy-part.model';

export interface PrivacySection extends NavItem {
  paragraphs: PrivacyPart[][];
}
