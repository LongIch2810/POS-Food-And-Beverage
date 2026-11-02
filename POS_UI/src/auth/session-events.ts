import type { AuthUser } from './client.ts';

let identity: string | null = null;
let epoch = 0;
export const requestIdentityKey = (user: AuthUser) => JSON.stringify([
  user.id, user.storeId, user.branchId, user.role, [...(user.permissions ?? [])].sort(),
]);
export function rememberRequestIdentity(user: AuthUser | null): void {
  const next = user ? requestIdentityKey(user) : null;
  if (next !== identity) { identity = next; epoch++; }
}
export const getRequestIdentity = () => ({ identity, epoch });

export function notifySessionChange(event: 'login' | 'logout' | 'revoked'): void {
  if (event === 'logout' || event === 'revoked') rememberRequestIdentity(null);
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('pos-session');
  channel.postMessage(event);
  channel.close();
}
