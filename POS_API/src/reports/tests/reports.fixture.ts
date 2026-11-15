import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { dataSource } from '../../database/data-source';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'Reports-test-password-123';
export type Headers = Record<string, string>;

export interface World {
  db: DataSource;
  base: string;
  id: Record<string, string>;
  login(username: string): Promise<Headers>;
  get(query: Record<string, string> | string, headers?: Headers): Promise<{ status: number; body: any; text: string; response: Response }>;
  post(path: string, headers: Headers, body: object): Promise<Response>;
  shift(o: { user: string; branch: string; status?: 'OPEN' | 'CLOSED'; startedAt?: string; endedAt?: string }): Promise<string>;
  invoice(o: InvoiceSeed): Promise<string>;
  productSize(store: string, productName: string, sizeName: string, category?: string): Promise<string>;
}

export interface InvoiceSeed {
  branch: string; shift: string; user: string; status?: 'PAID' | 'OPEN' | 'CANCELLED'; paidAt?: string | null; paymentPaidAt?: string;
  method?: 'CASH' | 'TRANSFER' | null; amount?: number; extra?: number; discount?: number; total?: number;
  items?: { ps: string; name: string; size: string; qty: number; unit?: number; line: number; topping?: number }[];
}

export const defaultQuery = (extra: Record<string, string> = {}) => ({ date: '2026-11-14', fromDate: '2026-11-08', toDate: '2026-11-14', ...extra });

export async function withWorld(fn: (w: World) => Promise<void>): Promise<void> {
  const name = `pos_reports_${randomBytes(6).toString('hex')}`, url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local sandbox is allowed');
  url.pathname = `/${name}`;
  const db = new DataSource({ type: 'postgres', url: url.toString(), synchronize: false, migrationsRun: false, entities: dataSource.options.entities, migrations: dataSource.options.migrations });
  await dataSource.initialize();
  let app: any, created = false;
  try {
    await dataSource.query(`CREATE DATABASE "${name}"`); created = true;
    await db.initialize(); await db.runMigrations();
    const id: Record<string, string> = {};
    for (const key of ['storeA', 'storeB', 'a1', 'a2', 'b1']) id[key] = randomUUID();
    await db.query('INSERT INTO stores(id,name) VALUES($1,$2),($3,$4)', [id.storeA, 'Store A', id.storeB, 'Store B']);
    await db.query('INSERT INTO branches(id,store_id,code,name) VALUES($1,$2,$3,$4),($5,$2,$6,$7),($8,$9,$10,$11)',
      [id.a1, id.storeA, 'A1', 'Branch A1', id.a2, 'A2', 'Branch A2', id.b1, id.storeB, 'B1', 'Branch B1']);
    const hash = await bcrypt.hash(PASSWORD, 4);
    const users: [string, string | null, string | null, string][] = [
      ['owner_a', id.storeA, null, 'OWNER'], ['mgr_a1', id.storeA, id.a1, 'MANAGER'], ['mgr_a2', id.storeA, id.a2, 'MANAGER'],
      ['mgr_nobranch', id.storeA, null, 'MANAGER'], ['cash_a1', id.storeA, id.a1, 'CASHIER'], ['cash_a1b', id.storeA, id.a1, 'CASHIER'],
      ['cash_a2', id.storeA, id.a2, 'CASHIER'], ['owner_b', id.storeB, null, 'OWNER'], ['cash_b', id.storeB, id.b1, 'CASHIER'],
      ['admin', null, null, 'PLATFORM_ADMIN'],
    ];
    for (const [username, store, branch, role] of users) {
      id[username] = randomUUID();
      await db.query(`INSERT INTO users(id,store_id,branch_id,role_id,full_name,username,password_hash,must_change_password)
        VALUES($1,$2,$3,(SELECT id FROM roles WHERE name=$4),$5,$5,$6,false)`, [id[username], store, branch, role, username, hash]);
    }
    process.env.PUBLIC_ORIGIN = ORIGIN; process.env.JWT_SECRET = 'j'.repeat(32); process.env.CSRF_SECRET = 'c'.repeat(32);
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(db).compile();
    app = module.createNestApplication({ logger: false, rawBody: true }); await app.listen(0, '127.0.0.1');
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
    const categories = new Map<string, string>(), sizes = new Map<string, string>();
    const world: World = {
      db, base, id,
      async login(username) {
        const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: PASSWORD }) });
        assert.equal(response.status, 200); const cookies = response.headers.getSetCookie().map(v => v.split(';')[0]);
        return { Cookie: cookies.join('; '), Origin: ORIGIN, 'X-CSRF-Token': cookies.find(v => v.startsWith('__Host-pos_csrf='))!.slice(16), 'Content-Type': 'application/json' };
      },
      async get(query, headers = {}) {
        const qs = typeof query === 'string' ? query : new URLSearchParams(query).toString();
        const response = await fetch(`${base}/reports/revenue?${qs}`, { headers });
        const text = await response.text();
        let body: any; try { body = JSON.parse(text); } catch { body = undefined; }
        return { status: response.status, body, text, response };
      },
      post: (path, headers, body) => fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) }),
      async shift(o) {
        const shiftId = randomUUID(), status = o.status ?? 'OPEN';
        await db.query(`INSERT INTO work_shifts(id,branch_id,user_id,shift_type,started_at,ended_at,status,closed_by)
          VALUES($1,$2,$3,'CASHIER',$4::timestamptz,$5::timestamptz,$6,$7)`,
        [shiftId, o.branch, id[o.user], o.startedAt ?? '2026-11-01T00:00:00Z', status === 'CLOSED' ? o.endedAt ?? '2026-11-02T00:00:00Z' : null, status, status === 'CLOSED' ? id[o.user] : null]);
        await db.query(`INSERT INTO cash_reconciliations(id,work_shift_id,opening_cash,status) VALUES($1,$2,0,'PENDING')`, [randomUUID(), shiftId]);
        return shiftId;
      },
      async productSize(store, productName, sizeName, category = 'Cat') {
        const catKey = `${store}:${category}`, sizeKey = `${store}:${sizeName}`;
        if (!categories.has(catKey)) { categories.set(catKey, randomUUID()); await db.query('INSERT INTO categories(id,store_id,name) VALUES($1,$2,$3)', [categories.get(catKey), store, category]); }
        if (!sizes.has(sizeKey)) { sizes.set(sizeKey, randomUUID()); await db.query('INSERT INTO sizes(id,store_id,name) VALUES($1,$2,$3)', [sizes.get(sizeKey), store, sizeName]); }
        const existing = await db.query('SELECT id FROM products WHERE category_id=$1 AND name=$2', [categories.get(catKey), productName]);
        const productId = existing[0]?.id ?? randomUUID();
        if (!existing[0]) await db.query('INSERT INTO products(id,category_id,name) VALUES($1,$2,$3)', [productId, categories.get(catKey), productName]);
        const psId = randomUUID();
        await db.query('INSERT INTO product_sizes(id,product_id,size_id,price) VALUES($1,$2,$3,20000)', [psId, productId, sizes.get(sizeKey)]);
        return psId;
      },
      async invoice(o) {
        const invoiceId = randomUUID(), status = o.status ?? 'PAID', amount = o.amount ?? 0;
        const paidAt = o.paidAt === undefined ? (status === 'OPEN' ? null : '2026-11-14T10:00:00+07:00') : o.paidAt;
        const code = 'HD' + randomBytes(4).toString('hex').toUpperCase();
        await db.query(`INSERT INTO invoices(id,branch_id,work_shift_id,invoice_code,created_by,order_type,status,subtotal,discount_amount,total_amount,paid_at,cancelled_at,cancelled_by,cancel_reason)
          VALUES($1,$2,$3,$4,$5,'TAKEAWAY',$6,$7,$8,$9,$10::timestamptz,$11,$12,$13)`,
        [invoiceId, o.branch, o.shift, code, id[o.user], status, (o.total ?? amount) + (o.discount ?? 0), o.discount ?? 0, o.total ?? amount, paidAt,
          status === 'CANCELLED' ? new Date() : null, status === 'CANCELLED' ? id[o.user] : null, status === 'CANCELLED' ? 'seed' : null]);
        if (o.method === 'CASH') {
          await db.query(`INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,tendered_amount,change_amount,created_by,paid_at)
            VALUES($1,$2,'CASH',$3,$4,repeat('a',64),$3::bigint+$5::bigint,$5,$6,$7::timestamptz)`, [randomUUID(), invoiceId, amount, randomUUID(), o.extra ?? 0, id[o.user], o.paymentPaidAt ?? paidAt ?? new Date()]);
        } else if (o.method === 'TRANSFER') {
          const attempt = randomUUID();
          await db.query(`INSERT INTO transfer_attempts(id,invoice_id,store_id,bank_bin,account_number,account_name,amount,transfer_reference,idempotency_key,idempotency_request_hash,status)
            VALUES($1,$2,(SELECT store_id FROM branches WHERE id=$3),'970436','123456789','Shop',$4,$5,$6,repeat('b',64),'PAID')`,
          [attempt, invoiceId, o.branch, amount, 'HD' + randomBytes(8).toString('hex').toUpperCase(), randomUUID()]);
          await db.query(`INSERT INTO payments(id,invoice_id,method,amount,idempotency_key,idempotency_request_hash,actual_received_amount,excess_amount,transfer_attempt_id,
            receiving_account_number,transaction_ref,transaction_ref_kind,confirmation_source,paid_at)
            VALUES($1,$2,'TRANSFER',$3,$4,repeat('c',64),$3::bigint+$5::bigint,$5,$6,'123456789',$7,'SEPAY_EVENT','WEBHOOK',$8::timestamptz)`,
          [randomUUID(), invoiceId, amount, randomUUID(), o.extra ?? 0, attempt, randomUUID(), o.paymentPaidAt ?? paidAt ?? new Date()]);
        }
        for (const item of o.items ?? []) {
          const itemId = randomUUID();
          await db.query(`INSERT INTO invoice_items(id,invoice_id,product_size_id,product_name,size_name,unit_price,quantity,line_total)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [itemId, invoiceId, item.ps, item.name, item.size, item.unit ?? Math.floor(item.line / item.qty), item.qty, item.line]);
          if (item.topping) {
            const toppingId = randomUUID();
            await db.query('INSERT INTO toppings(id,store_id,name,price) SELECT $1,store_id,$2,$3 FROM branches WHERE id=$4', [toppingId, 'Top' + toppingId.slice(0, 6), item.topping, o.branch]);
            await db.query(`INSERT INTO invoice_item_toppings(id,invoice_item_id,topping_id,topping_name,unit_price,quantity,line_total) VALUES($1,$2,$3,'Top',$4,1,$4)`,
              [randomUUID(), itemId, toppingId, item.topping]);
          }
        }
        return invoiceId;
      },
    };
    await fn(world);
  } finally {
    if (app) await app.close();
    if (db.isInitialized) await db.destroy();
    if (created) await dataSource.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await dataSource.destroy();
  }
}

// GET with a body, which fetch cannot send.
export function getWithBody(urlText: string, headers: Headers, body: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText);
    const req = httpRequest({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method: 'GET',
      headers: { ...headers, 'Content-Length': String(Buffer.byteLength(body)) } }, res => {
      let text = ''; res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode!, body: text ? JSON.parse(text) : undefined }));
    });
    req.on('error', reject); req.end(body);
  });
}
