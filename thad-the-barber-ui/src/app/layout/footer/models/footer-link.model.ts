import { LinkKind } from '../../../shared/models/link.models';

export interface FooterLink {
  label: string;
  /** An app page (`/book`), an outside address (`https://…`) or a phone address (`tel:…`, `sms:…`). */
  url: string;
  /** The section of the app page to scroll to. */
  fragment?: string;
  kind: LinkKind;
}
