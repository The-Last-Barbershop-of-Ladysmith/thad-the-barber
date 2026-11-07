import { FooterLink } from './footer-link.model';

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
  /** Lists the links in two columns, filling down then across. */
  isSplit: boolean;
}
