import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserSummary } from '../../auth/auth.service';
import { organizationPage } from '../organization.pagination';

const owner: UserSummary = { id: '00000000-0000-4000-8000-000000000001', username: 'qa', fullName: 'QA',
  role: 'OWNER', storeId: '00000000-0000-4000-8000-000000000002', branchId: null,
  permissions: ['branch.access_all'], mustChangePassword: false };

test('ORG-PAGE cursor preserves microseconds and binds filters, resource and tenant', () => {
  const page = organizationPage({ branchId: owner.id, role: 'MANAGER', isActive: 'false' }, 'staff', owner);
  const cursor = Buffer.from(JSON.stringify({ scope: page.scope,
    createdAt: '2026-10-30T01:00:00.123456Z', id: owner.id })).toString('base64url');
  assert.equal(organizationPage({ branchId: owner.id, role: 'MANAGER', isActive: 'false', cursor }, 'staff', owner).after?.createdAt,
    '2026-10-30T01:00:00.123456Z');
  for (const query of [{ cursor }, { branchId: owner.id, role: 'CASHIER', isActive: 'false', cursor },
    { branchId: owner.id, role: 'MANAGER', isActive: 'true', cursor }]) {
    assert.throws(() => organizationPage(query, 'staff', owner));
  }
  assert.throws(() => organizationPage({ cursor }, 'branches', owner));
  for (const query of [{ limit: ['1', '2'] }, { isActive: ['true', 'false'] }, { role: ['MANAGER'] },
    { cursor: 'a'.repeat(1025) }, { role: 'OWNER' }]) assert.throws(() => organizationPage(query, 'staff', owner));
  const manager = { ...owner, role: 'MANAGER', branchId: owner.id, permissions: ['table.manage'] };
  assert.equal(organizationPage({ branchId: 'ignored' }, 'tables', manager).branchId, owner.id);
  assert.equal(organizationPage({ limit: '101' }, 'branches', owner).limit, 100);
});
