/** Fills the `{shopName}` and `{city}` placeholders in a route's `RouteSeo` title or description. */
export function fillSeoTemplate(
  template: string,
  shopName: string,
  city: string,
): string {
  return template.replaceAll('{shopName}', shopName).replaceAll('{city}', city);
}
