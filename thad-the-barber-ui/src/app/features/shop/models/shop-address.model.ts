export interface ShopAddress {
  street: string;
  city: string;
  state: string;
  /** As Square holds it, which can be ZIP+4. */
  postalCode: string;
}
