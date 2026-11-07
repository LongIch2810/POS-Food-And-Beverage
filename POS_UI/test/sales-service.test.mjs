import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { salesService } from '../src/services/salesService.ts';

afterEach(() => { delete globalThis.document; delete globalThis.fetch; });

test('PB-07 BR-16/22/28/92 sales client uses real routes, CSRF and server amounts', async () => {
  globalThis.document = { cookie: '__Host-pos_csrf=test' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    if (url.includes('?')) return Response.json({ data: [], meta: { total: 0, limit: 100, nextCursor: null } });
    return Response.json({ data: { id: 'invoice-1', status: 'OPEN' } });
  };
  await salesService.listOpen('branch-1');
  await salesService.get('invoice-1');
  await salesService.create({ orderType: 'DINE_IN', tableId: 'table-1' });
  await salesService.addItem('invoice-1', { productSizeId: 'size-1', quantity: 2, toppings: [{ toppingId: 'topping-1', quantity: 1 }] });
  await salesService.updateItem('item-1', { quantity: 3 });
  await salesService.removeItem('item-1');
  await salesService.transfer('invoice-1', 'table-2');
  await salesService.cancel('invoice-1', 'Khách đổi ý');
  assert.deepEqual(calls.map(c => [c.method, c.url]), [
    ['GET', '/api/v1/invoices?status=OPEN&limit=100&branchId=branch-1'],
    ['GET', '/api/v1/invoices/invoice-1'],
    ['POST', '/api/v1/invoices'],
    ['POST', '/api/v1/invoices/invoice-1/items'],
    ['PATCH', '/api/v1/invoice-items/item-1'],
    ['DELETE', '/api/v1/invoice-items/item-1'],
    ['POST', '/api/v1/invoices/invoice-1/transfer-table'],
    ['POST', '/api/v1/invoices/invoice-1/cancel'],
  ]);
  assert.deepEqual(JSON.parse(calls[3].body), { productSizeId: 'size-1', quantity: 2, toppings: [{ toppingId: 'topping-1', quantity: 1 }] });
  assert.equal(calls[7].headers['X-CSRF-Token'], 'test');
});
