/** Where a notice sends the customer when booking here won't work. */
export enum NoticeFallback {
  None = 'none',
  /** Call or text the shop. */
  Contact = 'contact',
  /** Thad's Square booking site, then call or text (BR-14). */
  BookingSite = 'booking-site',
}
