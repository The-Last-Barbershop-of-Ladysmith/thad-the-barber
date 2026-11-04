export function toManagePath(id: string): string {
  return `/book/manage/${encodeURIComponent(id)}`;
}
