/** `/book/manage/{id}`: the page showing one booking. */
export function toManagePath(id: string): string {
  return `/book/manage/${encodeURIComponent(id)}`;
}
