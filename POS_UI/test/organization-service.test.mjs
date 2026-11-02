import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { organizationService as service } from '../src/services/organizationService.ts';
import { login } from '../src/auth/client.ts';

afterEach(() => { delete globalThis.document; delete globalThis.fetch; delete globalThis.BroadcastChannel; });

test('PB13-HTTP ten PB04 operations preserve body types, CSRF and list metadata', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=qa-csrf' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ data: [], meta: { limit: 20, nextCursor: 'NEXT', total: 21 } });
  };
  assert.deepEqual((await service.getBranches({ isActive: false, cursor: 'x+y/=' })).meta, { limit: 20, nextCursor: 'NEXT', total: 21 });
  await service.createBranch({ code: 'Aa', name: 'QA', initialCash: 0, address: null });
  await service.patchBranch('branch', { phone: null, initialCash: 1000000000000 });
  await service.getTables({ branchId: 'branch' });
  await service.createTable({ name: 'QA', capacity: null });
  await service.patchTable('table', { area: null, isActive: false });
  await service.getStaff({ role: 'CASHIER', branchId: 'branch' });
  await service.createStaff({ username: 'qa', fullName: 'QA', role: 'CASHIER', branchId: 'branch' });
  await service.patchStaff('staff', { role: 'MANAGER' });
  await service.resetStaffPassword('staff');
  assert.equal(calls.length, 10);
  assert.deepEqual(calls.map(call => call.method), ['GET','POST','PATCH','GET','POST','PATCH','GET','POST','PATCH','POST']);
  assert.equal(new URL(calls[0].url, 'http://local').searchParams.get('isActive'), 'false');
  assert.equal(new URL(calls[0].url, 'http://local').searchParams.get('cursor'), 'x+y/=');
  assert.equal(calls[3].url, '/api/v1/dining-tables?limit=20&branchId=branch');
  assert.equal(calls[6].url, '/api/v1/users?limit=20&role=CASHIER&branchId=branch');
  assert.equal(calls[9].url, '/api/v1/users/staff/reset-password');
  for (const call of calls) {
    assert.equal(call.credentials, 'same-origin');
    if (call.method !== 'GET') assert.equal(call.headers['X-CSRF-Token'], 'qa-csrf');
  }
  assert.deepEqual(JSON.parse(calls[2].body), { phone: null, initialCash: 1000000000000 });
  assert.deepEqual(JSON.parse(calls[4].body), { name: 'QA', capacity: null });
  assert.equal(calls[9].body, undefined);
});

test('PB13-HTTP network errors never replay create or reset; field errors retain request ID', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=qa' };
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('QA disconnect'); };
  await assert.rejects(service.resetStaffPassword('qa'), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls, 1);
  await assert.rejects(service.createBranch({ code: 'QA', name: 'QA' }), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls, 2, 'each failed mutation is sent once');
  globalThis.fetch = async () => Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu sai.',
    requestId: 'qa-request', details: [{ field: 'name', location: 'body', message: 'Tên không hợp lệ.' }] } }, { status: 422 });
  await assert.rejects(service.createBranch({ code: 'QA', name: '' }), error => {
    assert.equal(error.status, 422); assert.equal(error.requestId, 'qa-request');
    assert.equal(error.details[0].field, 'name'); return true;
  });
});

test('PB13-HTTP branch choices traverse every cursor including inactive branches', async () => {
  globalThis.document = { cookie: '' };
  const urls = [];
  globalThis.fetch = async url => {
    urls.push(url);
    return Response.json(urls.length === 1
      ? { data: [{ id: 'a', isActive: true }], meta: { nextCursor: 'NEXT' } }
      : { data: [{ id: 'b', isActive: false }], meta: { nextCursor: null } });
  };
  assert.deepEqual((await service.getBranchChoices()).map(row => row.id), ['a','b']);
  assert.deepEqual(urls, ['/api/v1/branches?limit=100','/api/v1/branches?limit=100&cursor=NEXT']);
});

test('PB13-HTTP never retries an old mutation under another authenticated store', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=qa' };
  globalThis.fetch = async () => Response.json({ data: { user: { id: 'owner-a', storeId: 'A', branchId: null, role: 'OWNER' } } });
  await login('qa-owner-a', 'QA_FIXTURE_PASSWORD');
  let writes = 0;
  globalThis.fetch = async url => {
    if (url.endsWith('/branches')) {
      writes++;
      return writes === 1 ? Response.json({ error: { code: 'TOKEN_EXPIRED' } }, { status: 401 }) : Response.json({ data: { id: 'created-in-B' } });
    }
    return Response.json({ data: { user: { id: 'owner-b', storeId: 'B', branchId: null, role: 'OWNER' } } });
  };
  await assert.rejects(service.createBranch({ code: 'QA', name: 'Form from A' }), error => error.code === 'SESSION_CHANGED');
  assert.equal(writes, 1, 'no old form POST under new identity');
});
