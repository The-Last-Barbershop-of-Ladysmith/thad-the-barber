export function toManagePath(id: string): string {
  return `/book/manage/${encodeURIComponent(id)}`;
}

/** The fragment that carries a manage token: `t=…`, which the manage page then moves out of the address bar. */
export function toManageFragment(manageToken: string): string {
  return new URLSearchParams({ t: manageToken }).toString();
}
