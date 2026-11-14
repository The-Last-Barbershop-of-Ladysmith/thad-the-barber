const MANAGE_ROOT: string = '/book/manage';

export function toManagePath(id: string): string {
  return `${MANAGE_ROOT}/${encodeURIComponent(id)}`;
}

/** For `routerLink`, which encodes each segment itself: `toManagePath` there would encode the ID twice. */
export function toManageCommands(id: string): string[] {
  return [MANAGE_ROOT, id];
}

/** Leaves the address bar once the manage page has read it, so it never shows in screenshots or shared tabs. */
export function toManageFragment(manageToken: string): string {
  return new URLSearchParams({ t: manageToken }).toString();
}
