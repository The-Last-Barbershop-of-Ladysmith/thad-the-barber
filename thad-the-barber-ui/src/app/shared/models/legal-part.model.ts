import { LegalPartKind } from './legal-part-kind.model';

/** `text` is the words, or a link's label; the shop's name and phone come from Square. */
export interface LegalPart {
  kind: LegalPartKind;
  text?: string;
  href?: string;
}
