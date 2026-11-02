import { request } from '../http/client.ts';

export interface PlatformStore {
  id: string; name: string; phone: string | null; email: string | null; address: string | null;
  status: 'ACTIVE' | 'SUSPENDED'; suspendedAt: string | null; suspendedReason: string | null;
  createdAt: string; updatedAt: string;
}

export interface PlatformOwner {
  id: string; storeId: string; storeName?: string; username: string; fullName: string;
  isActive: boolean; mustChangePassword: boolean; createdAt: string;
}

export interface PlatformList<T> { data: T[]; meta: { limit: number; nextCursor: string | null; total: number } }

export const platformService = {
  getStores(cursor?: string): Promise<PlatformList<PlatformStore>> {
    return request(`platform/stores?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET', undefined, true, true);
  },
  getOwners(cursor?: string): Promise<PlatformList<PlatformOwner>> {
    return request(`users?role=OWNER&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET', undefined, true, true);
  },
  createStore(input: { name: string; phone?: string; email?: string; address?: string;
    owner: { username: string; fullName: string } }) {
    return request<{ store: PlatformStore; owner: PlatformOwner; temporaryPassword: string }>('platform/stores', 'POST', input);
  },
  addOwner(input: { storeId: string; username: string; fullName: string }) {
    return request<{ owner: PlatformOwner; temporaryPassword: string }>('users', 'POST', input);
  },
  suspendStore(id: string, reason: string) {
    return request<{ store: PlatformStore }>(`platform/stores/${encodeURIComponent(id)}/suspend`, 'POST', { reason });
  },
  reactivateStore(id: string) {
    return request<{ store: PlatformStore }>(`platform/stores/${encodeURIComponent(id)}/reactivate`, 'POST');
  },
  resetOwnerPassword(id: string) {
    return request<{ owner: PlatformOwner; temporaryPassword: string }>(`users/${encodeURIComponent(id)}/reset-password`, 'POST');
  },
};
