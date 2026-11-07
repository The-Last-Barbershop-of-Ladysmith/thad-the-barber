import { LinkKind } from '../../../shared/models/link.models';

export interface FooterLink {
  label: string;
  /** An app page (`/book`), an outside address (`https://…`) or a phone address (`tel:…`, `sms:…`). */
  url: string;
  fragment?: string;
  kind: LinkKind;
}
