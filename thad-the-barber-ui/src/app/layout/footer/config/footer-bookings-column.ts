import { LinkKind } from '../../../shared/models/link.models';
import { FooterColumn } from '../models/footer-column.model';

export const FOOTER_BOOKINGS_COLUMN: FooterColumn = {
  heading: 'Bookings',
  isSplit: false,
  links: [
    {
      label: 'Book a cut',
      url: '/book',
      kind: LinkKind.Internal,
    },
    {
      label: 'Manage a booking',
      url: '/book/manage',
      kind: LinkKind.Internal,
    },
  ],
};
