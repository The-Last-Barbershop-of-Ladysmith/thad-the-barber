/** Router paths of the announcements pages; they live apart from the routes so a module of effects can import them. */
export const ANNOUNCEMENTS_PATH: string = '/admin/announcements';
export const NEW_ANNOUNCEMENT_PATH: string = '/admin/announcements/new';

/** The path of the announcement at `index` in the saved list (the file has no ids, so its place is its identity). */
export function announcementEditPath(index: number): string {
  return `${ANNOUNCEMENTS_PATH}/${index}`;
}
