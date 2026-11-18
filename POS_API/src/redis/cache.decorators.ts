import { UserSummary } from '../auth/auth.service';
import { StoreCache } from './store-cache';

type Cacheable = { cache?: StoreCache };
type Method = (user: UserSummary, ...args: any[]) => Promise<any>;

/** Cache a read method `(user, ...args)` per store. The caller's branch scope is part of the key because list results depend on it. */
export function Cached(group: 'menu' | 'org') {
  return (_target: object, name: string, descriptor: TypedPropertyDescriptor<Method>): void => {
    const original = descriptor.value!;
    descriptor.value = function (this: Cacheable, user, ...args) {
      if (!this.cache || !user.storeId) return original.call(this, user, ...args);
      const all = user.permissions.includes('branch.access_all');
      return this.cache.remember(group, user.storeId, [name, all, all ? null : user.branchId, args], () => original.call(this, user, ...args));
    };
  };
}

/** Forget the store's cache of `group` after the write method resolved (its transaction is already committed). */
export function Invalidates(group: 'menu' | 'org') {
  return (_target: object, _name: string, descriptor: TypedPropertyDescriptor<Method>): void => {
    const original = descriptor.value!;
    descriptor.value = async function (this: Cacheable, user, ...args) {
      const result = await original.call(this, user, ...args);
      if (this.cache && user.storeId) await this.cache.forget(group, user.storeId);
      return result;
    };
  };
}
