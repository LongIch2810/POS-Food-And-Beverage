import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lockSequence } from './sql-capture';

test('test_ST2_AC1_lock_of_two_aliases', () => {
  assert.deepEqual(lockSequence(['SELECT s.id FROM work_shifts s JOIN branches b ON b.id=s.branch_id WHERE s.user_id=$1 FOR UPDATE OF s,b']), ['UPDATE:work_shifts,branches']);
});

test('test_ST2_AC2_quoted_for_share', () => {
  assert.deepEqual(lockSequence(['SELECT "t"."id" FROM "dining_tables" "t" INNER JOIN "branches" "b" ON b.id = t.branch_id WHERE t.id = $1 FOR SHARE OF t']), ['SHARE:dining_tables']);
});

test('test_ST2_AC3_single_table_and_advisory', () => {
  assert.deepEqual(lockSequence(['SELECT * FROM invoices WHERE id=$1 FOR UPDATE', 'SELECT "Invoice"."id" FROM "invoices" "Invoice" WHERE "Invoice"."id" = $1 FOR UPDATE', 'SELECT pg_advisory_xact_lock(hashtextextended($1,0))', 'SELECT 1']), ['UPDATE:invoices', 'UPDATE:invoices', 'advisory']);
});

test('lock sequence handles AS, spaced aliases and a join after an unaliased table', () => {
  assert.deepEqual(lockSequence([
    'SELECT * FROM invoices JOIN branches AS b ON b.id=invoices.branch_id FOR UPDATE OF invoices, b',
    'UPDATE invoices SET status=$1 RETURNING id',
  ]), ['UPDATE:invoices,branches']);
});
