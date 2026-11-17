import { TestContext } from 'node:test';
import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner';

export function captureSql(t: TestContext): string[] {
  const sql: string[] = [];
  const original = PostgresQueryRunner.prototype.query;
  t.mock.method(PostgresQueryRunner.prototype, 'query', function (this: PostgresQueryRunner, query: string, parameters?: any[], useStructuredResult?: boolean) {
    sql.push(query);
    return original.call(this, query, parameters, useStructuredResult);
  });
  return sql;
}

export function lockSequence(sql: readonly string[]): string[] {
  const result: string[] = [];
  for (const statement of sql) {
    const normalized = statement.replace(/"/g, '').replace(/\s+/g, ' ');
    if (/\bpg_advisory_xact_lock\b/i.test(normalized)) {
      result.push('advisory');
      continue;
    }
    const lock = normalized.match(/\bFOR\s+(UPDATE|SHARE)\b(?:\s+OF\s+(\w+(?:\s*,\s*\w+)*))?/i);
    if (!lock) continue;
    const tables = new Map<string, string>();
    let first = '';
    for (const match of normalized.matchAll(/\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(?!(?:WHERE|JOIN|INNER|LEFT|ON|FOR|ORDER|LIMIT|GROUP)\b)(\w+))?/gi)) {
      const [, table, alias] = match;
      if (!first) first = table;
      tables.set(table, table);
      if (alias) tables.set(alias, table);
    }
    const names = lock[2] ? lock[2].trim().split(/\s*,\s*/).map((alias) => tables.get(alias) ?? alias) : [first];
    result.push(`${lock[1].toUpperCase()}:${names.join(',')}`);
  }
  return result;
}
