import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';

export interface MenuPage {
  limit: number;
  scope: string;
  categoryId?: string;
  isActive?: boolean;
  after?: { createdAt: string; id: string };
}

const invalid = () => httpError(422, 'VALIDATION_ERROR', 'Tham số danh sách không hợp lệ.');

export function menuPage(
  query: Record<string, unknown>,
  resource: 'categories' | 'products' | 'toppings',
  user: UserSummary,
): MenuPage {
  const allowed = [
    'limit',
    'cursor',
    'sort',
    'isActive',
    ...(resource === 'products' ? ['categoryId'] : []),
  ];
  if (
    Object.keys(query).some((key) => !allowed.includes(key)) ||
    (query.sort !== undefined && query.sort !== '-createdAt')
  ) {
    throw invalid();
  }

  const rawLimit = query.limit ?? '20';
  if (typeof rawLimit !== 'string' || !/^[1-9][0-9]{0,8}$/.test(rawLimit)) throw invalid();
  if (query.isActive !== undefined && query.isActive !== 'true' && query.isActive !== 'false') throw invalid();

  let categoryId: string | undefined;
  if (resource === 'products' && query.categoryId !== undefined) {
    if (typeof query.categoryId !== 'string' || !uuidPattern.test(query.categoryId)) throw invalid();
    categoryId = query.categoryId;
  }

  const page: MenuPage = {
    limit: Math.min(Number(rawLimit), 100),
    scope: JSON.stringify([resource, user.storeId, categoryId ?? null, query.isActive ?? null]),
    categoryId,
    isActive: query.isActive === undefined ? undefined : query.isActive === 'true',
  };

  if (query.cursor === undefined) return page;
  if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(query.cursor)) throw invalid();

  try {
    const value = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
    if (
      value.scope !== page.scope ||
      typeof value.createdAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      new Date(value.createdAt).toISOString().slice(0, 19) !== value.createdAt.slice(0, 19) ||
      typeof value.id !== 'string' ||
      !uuidPattern.test(value.id)
    ) {
      throw invalid();
    }
    page.after = { createdAt: value.createdAt, id: value.id };
    return page;
  } catch {
    throw invalid();
  }
}

export async function menuPageResponse<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  page: MenuPage,
  fields: string[],
) {
  if (page.isActive !== undefined) {
    query.andWhere(`${alias}.is_active = :active`, { active: page.isActive });
  }
  const total = await query.getCount();
  if (page.after) {
    query.andWhere(`(${alias}.created_at, ${alias}.id) < (:createdAt::timestamptz, :id::uuid)`, page.after);
  }

  const rows = await query
    .select(fields)
    .addSelect(`to_char(${alias}.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursorCreatedAt')
    .orderBy(`${alias}.created_at`, 'DESC')
    .addOrderBy(`${alias}.id`, 'DESC')
    .limit(page.limit + 1)
    .getRawMany();

  const selected = rows.slice(0, page.limit);
  const last = selected.at(-1);
  const nextCursor =
    rows.length > page.limit && last
      ? Buffer.from(JSON.stringify({ scope: page.scope, createdAt: last.cursorCreatedAt, id: last.id })).toString('base64url')
      : null;

  return {
    data: selected.map(({ cursorCreatedAt: _, ...row }) => row),
    meta: { limit: page.limit, nextCursor, total },
  };
}

