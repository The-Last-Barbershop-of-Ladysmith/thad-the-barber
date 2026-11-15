/** The sitemap.xml for the indexed routes ('' is the home page) under the site's address. */
export function toSitemapXml(siteUrl: string, routes: string[]): string {
  const entries: string = routes
    .map((route: string): string => `  <url><loc>${siteUrl}/${route}</loc></url>`)
    .join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
