const MANAGE_ROOT: string = '/book/manage';

export function toManagePath(id: string): string {
  return `${MANAGE_ROOT}/${encodeURIComponent(id)}`;
}

/** For `routerLink`, which encodes each segment itself: `toManagePath` there would encode the ID twice. */
export function toManageCommands(id: string): string[] {
  return [MANAGE_ROOT, id];
}

/** The fragment that carries a manage token: `t=…`, which the manage page then moves out of the address bar. */
export function toManageFragment(manageToken: string): string {
  return new URLSearchParams({ t: manageToken }).toString();
}
