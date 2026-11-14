/**
 * A route's search and share metadata, set as `data.seo`. `title` and `description` may hold `{shopName}` and
 * `{city}`, which `SeoService` fills in.
 */
export interface RouteSeo {
  title: string;
  description: string;
  isIndexed: boolean;
}
