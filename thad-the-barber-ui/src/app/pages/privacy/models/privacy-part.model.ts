import { PrivacyPartKind } from './privacy-part-kind.model';

/** `text` is the words, or a link's label; the shop's name and phone come from Square. */
export interface PrivacyPart {
  kind: PrivacyPartKind;
  text?: string;
  href?: string;
}
