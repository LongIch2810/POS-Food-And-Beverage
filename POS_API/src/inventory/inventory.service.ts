import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';

type Input = Record<string, unknown>;
const invalid = () => httpError(422, 'VALIDATION_ERROR', 'Dữ liệu kho không hợp lệ.');
const decimal = (value: unknown, zero = false): string => {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(value) ||
      (!zero && Number(value) <= 0)) throw invalid();
  return value;
};
const fields = (value: Input, allowed: string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length ||
      Object.keys(value).some(key => !allowed.includes(key))) throw invalid();
};

@Injectable()
export class InventoryService {
  constructor(private readonly db: DataSource) {}

  private store(user: UserSummary): string {
    if (!user.storeId) throw httpError(403, 'PERMISSION_DENIED', 'Không có quyền truy cập kho.');
    return user.storeId;
  }

  private branch(user: UserSummary, branchId: unknown, required: boolean): string | null {
    if (user.branchId) {
      if (branchId !== undefined) throw invalid();
      return user.branchId;
    }
    if (branchId === undefined && !required) return null;
    if (typeof branchId !== 'string' || !uuidPattern.test(branchId)) throw invalid();
    return branchId;
  }

  private async checkScope(store: string, branch: string | null, ingredient: unknown) {
    if (branch) {
      const rows = await this.db.query('SELECT 1 FROM branches WHERE id=$1 AND store_id=$2',[branch,store]);
      if (!rows.length) throw httpError(404,'NOT_FOUND','Không tìm thấy chi nhánh.');
    }
    if (ingredient) {
      const rows = await this.db.query('SELECT 1 FROM ingredients WHERE id=$1 AND store_id=$2',[ingredient,store]);
      if (!rows.length) throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
    }
  }

  private ingredientView(row: any) {
    return { id: row.id, name: row.name, unit: row.unit, isActive: row.is_active,
      createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
  }

  private async page(query: Input, allowed: string[], scope: string) {
    if (Object.keys(query).some(key => !allowed.includes(key))) throw invalid();
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid();
    let cursor: any = null;
    if (query.cursor !== undefined) {
      try {
        if (typeof query.cursor !== 'string' || query.cursor.length > 1024) throw invalid();
        cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
        if (cursor.scope !== scope || typeof cursor.id !== 'string' || !uuidPattern.test(cursor.id) ||
            typeof cursor.key !== 'string') throw invalid();
      } catch { throw invalid(); }
    }
    return { limit, cursor, scope };
  }

  private finish(rows: any[], total: number, page: { limit: number; scope: string }, key: (row: any) => string, view: (row: any) => any) {
    const selected = rows.slice(0, page.limit);
    const last = selected.at(-1);
    const nextCursor = rows.length > page.limit && last
      ? Buffer.from(JSON.stringify({ scope: page.scope, key: key(last), id: last.id })).toString('base64url') : null;
    return { data: selected.map(view), meta: { limit: page.limit, nextCursor, total } };
  }

  async listIngredients(user: UserSummary, query: Input) {
    const store = this.store(user);
    if (query.isActive !== undefined && query.isActive !== 'true' && query.isActive !== 'false') throw invalid();
    if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 100)) throw invalid();
    const page = await this.page(query, ['limit','cursor','isActive','q'], JSON.stringify(['ingredients',store,query.isActive ?? null,query.q ?? null]));
    const params: unknown[] = [store];
    let where = 'store_id=$1';
    if (query.isActive !== undefined) { params.push(query.isActive === 'true'); where += ` AND is_active=$${params.length}`; }
    if (query.q !== undefined) { params.push(`%${query.q}%`); where += ` AND name ILIKE $${params.length}`; }
    const [{ count }] = await this.db.query(`SELECT count(*)::int AS count FROM ingredients WHERE ${where}`, params);
    if (page.cursor) { params.push(page.cursor.key,page.cursor.id); where += ` AND (lower(name),id)>($${params.length-1},$${params.length}::uuid)`; }
    params.push(page.limit+1);
    const rows = await this.db.query(`SELECT * FROM ingredients WHERE ${where} ORDER BY lower(name),id LIMIT $${params.length}`, params);
    return this.finish(rows,count,page,row => row.name.toLowerCase(),row => this.ingredientView(row));
  }

  async createIngredient(user: UserSummary, input: Input) {
    const store = this.store(user);
    fields(input,['name','unit']);
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100 || typeof input.unit !== 'string' || !['g','ml','piece'].includes(input.unit)) throw invalid();
    try {
      const [row] = await this.db.query('INSERT INTO ingredients(id,store_id,name,unit) VALUES ($1,$2,$3,$4) RETURNING *',
        [randomUUID(),store,name,input.unit]);
      return this.ingredientView(row);
    } catch (error: any) {
      if (error.code === '23505') throw httpError(409,'DUPLICATE_INGREDIENT_NAME','Tên nguyên liệu đã tồn tại.');
      throw error;
    }
  }

  async patchIngredient(user: UserSummary, id: string, input: Input) {
    const store = this.store(user);
    fields(input,['name','unit','isActive']);
    return this.db.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM ingredients WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,store]);
      if (!old) throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
      const name = input.name === undefined ? old.name : typeof input.name === 'string' ? input.name.trim() : '';
      const unit = input.unit === undefined ? old.unit : input.unit;
      const active = input.isActive === undefined ? old.is_active : input.isActive;
      if (!name || name.length > 100 || typeof unit !== 'string' || !['g','ml','piece'].includes(unit) || typeof active !== 'boolean') throw invalid();
      if (unit !== old.unit) {
        const [usage] = await manager.query(`SELECT
          EXISTS(SELECT 1 FROM product_size_ingredients WHERE ingredient_id=$1) OR
          EXISTS(SELECT 1 FROM topping_ingredients WHERE ingredient_id=$1) OR
          EXISTS(SELECT 1 FROM branch_ingredient_stocks WHERE ingredient_id=$1) OR
          EXISTS(SELECT 1 FROM stock_movements WHERE ingredient_id=$1) AS used`,[id]);
        if (usage.used) throw httpError(409,'RESOURCE_IN_USE','Đơn vị gốc đã được dùng, không thể thay đổi.');
      }
      try {
        const [rows] = await manager.query('UPDATE ingredients SET name=$3,unit=$4,is_active=$5,updated_at=now() WHERE id=$1 AND store_id=$2 RETURNING *',
          [id,store,name,unit,active]);
        return this.ingredientView(rows[0]);
      } catch (error: any) {
        if (error.code === '23505') throw httpError(409,'DUPLICATE_INGREDIENT_NAME','Tên nguyên liệu đã tồn tại.');
        throw error;
      }
    });
  }

  private async parent(manager: EntityManager, store: string, kind: 'product'|'topping', id: string) {
    const rows = kind === 'product'
      ? await manager.query(`SELECT ps.id FROM product_sizes ps JOIN products p ON p.id=ps.product_id
        JOIN categories c ON c.id=p.category_id WHERE ps.id=$1 AND c.store_id=$2 FOR UPDATE OF ps`,[id,store])
      : await manager.query('SELECT id FROM toppings WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,store]);
    if (!rows.length) throw httpError(404,'NOT_FOUND','Không tìm thấy món hoặc topping.');
  }

  private recipeTable(kind: 'product'|'topping') {
    return kind === 'product' ? { table: 'product_size_ingredients', key: 'product_size_id' } : { table: 'topping_ingredients', key: 'topping_id' };
  }

  private async recipeRows(manager: EntityManager, kind: 'product'|'topping', id: string) {
    const {table,key} = this.recipeTable(kind);
    const rows = await manager.query(`SELECT r.ingredient_id, r.quantity, i.name, i.unit, i.is_active
      FROM ${table} r JOIN ingredients i ON i.id=r.ingredient_id WHERE r.${key}=$1 ORDER BY lower(i.name),i.id`,[id]);
    return rows.map((row: any) => ({ ingredientId: row.ingredient_id, ingredientName: row.name, unit: row.unit,
      quantity: row.quantity }));
  }

  async getRecipe(user: UserSummary, kind: 'product'|'topping', id: string) {
    const store = this.store(user);
    return this.db.transaction(async manager => {
      await this.parent(manager,store,kind,id);
      return this.recipeRows(manager,kind,id);
    });
  }

  async putRecipe(user: UserSummary, kind: 'product'|'topping', id: string, input: Input) {
    const store = this.store(user);
    fields(input,['ingredients']);
    if (!Array.isArray(input.ingredients) || input.ingredients.length > 100) throw invalid();
    const ingredients = input.ingredients.map((item: any) => {
      fields(item,['ingredientId','quantity']);
      if (typeof item.ingredientId !== 'string' || !uuidPattern.test(item.ingredientId)) throw invalid();
      return { id: item.ingredientId.toLowerCase(), quantity: decimal(item.quantity) };
    });
    if (new Set(ingredients.map(item => item.id)).size !== ingredients.length) throw invalid();
    return this.db.transaction(async manager => {
      await this.parent(manager,store,kind,id);
      const {table,key} = this.recipeTable(kind);
      const old = await manager.query(`SELECT ingredient_id,quantity FROM ${table} WHERE ${key}=$1`,[id]);
      for (const item of [...ingredients].sort((a,b) => a.id.localeCompare(b.id))) {
        const [row] = await manager.query('SELECT id,is_active FROM ingredients WHERE id=$1 AND store_id=$2 FOR UPDATE',[item.id,store]);
        if (!row) throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
        const prior = old.find((r: any) => r.ingredient_id === item.id);
        if (!row.is_active && (!prior || Number(prior.quantity) !== Number(item.quantity)))
          throw httpError(409,'INGREDIENT_INACTIVE','Nguyên liệu đã ngưng dùng.');
      }
      await manager.query(`DELETE FROM ${table} WHERE ${key}=$1`,[id]);
      for (const item of ingredients) await manager.query(`INSERT INTO ${table}(${key},ingredient_id,quantity) VALUES($1,$2,$3)`,[id,item.id,item.quantity]);
      return this.recipeRows(manager,kind,id);
    });
  }

  async listStocks(user: UserSummary, query: Input) {
    const store = this.store(user);
    const branch = this.branch(user,query.branchId,false);
    if (query.ingredientId !== undefined && (typeof query.ingredientId !== 'string' || !uuidPattern.test(query.ingredientId))) throw invalid();
    await this.checkScope(store,branch,query.ingredientId);
    const page = await this.page(query,['limit','cursor','branchId','ingredientId'],JSON.stringify(['stocks',store,branch,query.ingredientId ?? null]));
    if (page.cursor && !uuidPattern.test(page.cursor.key)) throw invalid();
    const params: unknown[] = [store];
    let where = 'b.store_id=$1';
    if (branch) { params.push(branch); where += ` AND b.id=$${params.length}`; }
    if (query.ingredientId) { params.push(query.ingredientId); where += ` AND i.id=$${params.length}`; }
    const [{count}] = await this.db.query(`SELECT count(*)::int AS count FROM branches b CROSS JOIN ingredients i WHERE ${where} AND i.store_id=$1`,params);
    if (page.cursor) { params.push(page.cursor.key,page.cursor.id); where += ` AND (b.id::text,i.id) > ($${params.length-1},$${params.length}::uuid)`; }
    params.push(page.limit+1);
    const rows = await this.db.query(`SELECT i.id, b.id AS branch_id, i.id AS ingredient_id, i.name AS ingredient_name, i.unit,
      COALESCE(s.current_stock,0) AS current_stock,COALESCE(s.min_stock,0) AS min_stock
      FROM branches b CROSS JOIN ingredients i LEFT JOIN branch_ingredient_stocks s ON s.branch_id=b.id AND s.ingredient_id=i.id
      WHERE ${where} AND i.store_id=$1 ORDER BY b.id,i.id LIMIT $${params.length}`,params);
    return this.finish(rows,count,page,row => row.branch_id,row => ({ branchId:row.branch_id,ingredientId:row.ingredient_id,
      ingredientName:row.ingredient_name,unit:row.unit,currentStock:row.current_stock,minStock:row.min_stock }));
  }

  async setMin(user: UserSummary, ingredientId: string, input: Input) {
    const store = this.store(user);
    fields(input,['branchId','minStock']);
    const branch = this.branch(user,input.branchId,true)!;
    const min = decimal(input.minStock,true);
    return this.db.transaction(async manager => {
      const [row] = await manager.query(`SELECT b.id AS branch_id,i.id AS ingredient_id,i.name AS ingredient_name,i.unit
        FROM branches b JOIN ingredients i ON i.store_id=b.store_id WHERE b.id=$1 AND i.id=$2 AND b.store_id=$3
        FOR UPDATE OF b,i`,[branch,ingredientId,store]);
      if (!row) throw httpError(404,'NOT_FOUND','Không tìm thấy chi nhánh hoặc nguyên liệu.');
      const [stock] = await manager.query(`INSERT INTO branch_ingredient_stocks(branch_id,ingredient_id,min_stock)
        VALUES($1,$2,$3) ON CONFLICT (branch_id,ingredient_id)
        DO UPDATE SET min_stock=EXCLUDED.min_stock,updated_at=now() RETURNING current_stock,min_stock`,[branch,ingredientId,min]);
      return { branchId:branch,ingredientId,ingredientName:row.ingredient_name,unit:row.unit,
        currentStock:stock.current_stock,minStock:stock.min_stock };
    });
  }

  async listMovements(user: UserSummary, query: Input) {
    const store = this.store(user);
    const branch = this.branch(user,query.branchId,false);
    if (query.ingredientId !== undefined && (typeof query.ingredientId !== 'string' || !uuidPattern.test(query.ingredientId))) throw invalid();
    if (query.type !== undefined && !['IMPORT','SALE','SALE_REVERSAL','WASTE','ADJUST'].includes(String(query.type))) throw invalid();
    await this.checkScope(store,branch,query.ingredientId);
    const page = await this.page(query,['limit','cursor','branchId','ingredientId','type'],JSON.stringify(['movements',store,branch,query.ingredientId ?? null,query.type ?? null]));
    if (page.cursor && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(page.cursor.key) ||
        !Number.isFinite(new Date(page.cursor.key).getTime()) ||
        new Date(page.cursor.key).toISOString().slice(0,19) !== page.cursor.key.slice(0,19))) throw invalid();
    const params: unknown[] = [store];
    let where = 'b.store_id=$1';
    if (branch) { params.push(branch); where += ` AND m.branch_id=$${params.length}`; }
    if (query.ingredientId) { params.push(query.ingredientId); where += ` AND m.ingredient_id=$${params.length}`; }
    if (query.type) { params.push(query.type); where += ` AND m.type=$${params.length}`; }
    const [{count}] = await this.db.query(`SELECT count(*)::int AS count FROM stock_movements m JOIN branches b ON b.id=m.branch_id WHERE ${where}`,params);
    if (page.cursor) { params.push(page.cursor.key,page.cursor.id); where += ` AND (m.created_at,m.id)<($${params.length-1}::timestamptz,$${params.length}::uuid)`; }
    params.push(page.limit+1);
    const rows = await this.db.query(`SELECT m.*,to_char(m.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time,
      i.name AS ingredient_name,i.unit FROM stock_movements m
      JOIN branches b ON b.id=m.branch_id JOIN ingredients i ON i.id=m.ingredient_id
      WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT $${params.length}`,params);
    return this.finish(rows,count,page,row => row.cursor_time,row => ({ id:row.id,branchId:row.branch_id,
      ingredientId:row.ingredient_id,ingredientName:row.ingredient_name,unit:row.unit,type:row.type,
      quantity:row.quantity,balanceAfter:row.balance_after,invoiceId:row.invoice_id,note:row.note,
      createdAt:new Date(row.created_at).toISOString() }));
  }
}
