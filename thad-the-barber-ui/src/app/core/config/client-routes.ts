/**
 * The routes rendered only in the browser. `app.routes.server.ts` renders them on the client, and the build writes
 * them to Express's `client-routes.json` (`scripts/write-express-files.ts`), so Express serves the app shell for them
 * and its 404 page for any other unknown path. A `:param` stands for any one path segment.
 * #58: once /book is prerendered, remove it here.
 */
export const CLIENT_ROUTES: string[] = [
  'book',
  'book/manage',
  'book/manage/:id',
];
