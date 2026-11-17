import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, ILike, In, ObjectLiteral } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { uuidPattern } from '../http/request-validation';
import { ProductSize } from '../menu/entities/product-size.entity';
import { Topping } from '../menu/entities/topping.entity';
import { Branch } from '../organization/entities/branch.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { BranchIngredientStock } from './entities/branch-ingredient-stock.entity';
import { Ingredient } from './entities/ingredient.entity';
import { ProductSizeIngredient } from './entities/product-size-ingredient.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ToppingIngredient } from './entities/topping-ingredient.entity';

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
    if (branch && !await this.db.getRepository(Branch).existsBy({ id: branch, store_id: store }))
      throw httpError(404,'NOT_FOUND','Không tìm thấy chi nhánh.');
    if (ingredient && !await this.db.getRepository(Ingredient).existsBy({ id: ingredient as string, store_id: store }))
      throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
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
    const count = await this.db.getRepository(Ingredient).count({ where: { store_id: store,
      ...(query.isActive !== undefined ? { is_active: query.isActive === 'true' } : {}),
      ...(query.q !== undefined ? { name: ILike(`%${query.q}%`) } : {}) } });
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const builder = this.db.getRepository(Ingredient).createQueryBuilder('i').where('i.store_id = :store', { store });
    if (query.isActive !== undefined) builder.andWhere('i.is_active = :active', { active: query.isActive === 'true' });
    if (query.q !== undefined) builder.andWhere('i.name ILIKE :q', { q: `%${query.q}%` });
    if (page.cursor) builder.andWhere('(lower(i.name), i.id) > (:key, CAST(:id AS uuid))', { key: page.cursor.key, id: page.cursor.id });
    const rows = await builder.orderBy('lower(i.name)').addOrderBy('i.id').limit(page.limit+1).getMany();
    return this.finish(rows,count,page,row => row.name.toLowerCase(),row => this.ingredientView(row));
  }

  async createIngredient(user: UserSummary, input: Input) {
    const store = this.store(user);
    fields(input,['name','unit']);
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100 || typeof input.unit !== 'string' || !['g','ml','piece'].includes(input.unit)) throw invalid();
    try {
      const repo = this.db.getRepository(Ingredient);
      const id = randomUUID();
      await repo.insert({ id, store_id: store, name, unit: input.unit as Ingredient['unit'] });
      return this.ingredientView(await repo.findOneByOrFail({ id }));
    } catch (error: any) {
      if (error.code === '23505') throw httpError(409,'DUPLICATE_INGREDIENT_NAME','Tên nguyên liệu đã tồn tại.');
      throw error;
    }
  }

  async patchIngredient(user: UserSummary, id: string, input: Input) {
    const store = this.store(user);
    fields(input,['name','unit','isActive']);
    return this.db.transaction(async manager => {
      const old = await manager.getRepository(Ingredient).findOne({ where: { id, store_id: store }, lock: { mode: 'pessimistic_write' } });
      if (!old) throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
      const name = input.name === undefined ? old.name : typeof input.name === 'string' ? input.name.trim() : '';
      const unit = input.unit === undefined ? old.unit : input.unit;
      const active = input.isActive === undefined ? old.is_active : input.isActive;
      if (!name || name.length > 100 || typeof unit !== 'string' || !['g','ml','piece'].includes(unit) || typeof active !== 'boolean') throw invalid();
      if (unit !== old.unit) {
        const used = await manager.getRepository(ProductSizeIngredient).existsBy({ ingredient_id: id }) ||
          await manager.getRepository(ToppingIngredient).existsBy({ ingredient_id: id }) ||
          await manager.getRepository(BranchIngredientStock).existsBy({ ingredient_id: id }) ||
          await manager.getRepository(StockMovement).existsBy({ ingredient_id: id });
        if (used) throw httpError(409,'RESOURCE_IN_USE','Đơn vị gốc đã được dùng, không thể thay đổi.');
      }
      try {
        const result = await manager.getRepository(Ingredient).update({ id, store_id: store },
          { name, unit: unit as Ingredient['unit'], is_active: active, updated_at: () => 'now()' }, { returning: '*' });
        return this.ingredientView(result.raw[0]);
      } catch (error: any) {
        if (error.code === '23505') throw httpError(409,'DUPLICATE_INGREDIENT_NAME','Tên nguyên liệu đã tồn tại.');
        throw error;
      }
    });
  }

  private async parent(manager: EntityManager, store: string, kind: 'product'|'topping', id: string) {
    const found = kind === 'product'
      ? (await manager.getRepository(ProductSize).find({ where: { id, product: { category: { store_id: store } } }, select: { id: true },
        lock: { mode: 'pessimistic_write', tables: ['product_sizes'] } }))[0]
      : await manager.getRepository(Topping).findOne({ where: { id, store_id: store }, select: { id: true }, lock: { mode: 'pessimistic_write' } });
    if (!found) throw httpError(404,'NOT_FOUND','Không tìm thấy món hoặc topping.');
  }

  private recipeTable(kind: 'product'|'topping') {
    return kind === 'product' ? { entity: ProductSizeIngredient, key: 'product_size_id' } : { entity: ToppingIngredient, key: 'topping_id' };
  }

  private async recipeRows(manager: EntityManager, kind: 'product'|'topping', id: string) {
    const {entity,key} = this.recipeTable(kind);
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const rows = await manager.createQueryBuilder().select('r.ingredient_id', 'ingredient_id').addSelect('r.quantity', 'quantity')
      .addSelect('i.name', 'name').addSelect('i.unit', 'unit').addSelect('i.is_active', 'is_active')
      .from(entity, 'r').innerJoin(Ingredient, 'i', 'i.id = r.ingredient_id').where(`r.${key} = :id`, { id })
      .orderBy('lower(i.name)').addOrderBy('i.id').getRawMany();
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
      const {entity,key} = this.recipeTable(kind);
      const recipe = manager.getRepository<ObjectLiteral>(entity);
      const old = await recipe.find({ where: { [key]: id }, select: { [key]: true, ingredient_id: true, quantity: true } });
      for (const item of [...ingredients].sort((a,b) => a.id.localeCompare(b.id))) {
        const row = await manager.getRepository(Ingredient).findOne({ where: { id: item.id, store_id: store },
          select: { id: true, is_active: true }, lock: { mode: 'pessimistic_write' } });
        if (!row) throw httpError(404,'NOT_FOUND','Không tìm thấy nguyên liệu.');
        const prior = old.find((r: any) => r.ingredient_id === item.id);
        if (!row.is_active && (!prior || Number(prior.quantity) !== Number(item.quantity)))
          throw httpError(409,'INGREDIENT_INACTIVE','Nguyên liệu đã ngưng dùng.');
      }
      await recipe.delete({ [key]: id });
      for (const item of ingredients) await recipe.insert({ [key]: id, ingredient_id: item.id, quantity: item.quantity });
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
    const count = (await this.db.getRepository(Branch).count({ where: { store_id: store, ...(branch ? { id: branch } : {}) } })) *
      (await this.db.getRepository(Ingredient).count({ where: { store_id: store, ...(query.ingredientId ? { id: query.ingredientId as string } : {}) } }));
    // QueryBuilder: joins and DISTINCT over many rows; separate find() calls would load every row
    const builder = this.db.getRepository(Branch).createQueryBuilder('b').innerJoin(Ingredient, 'i', 'i.store_id = b.store_id')
      .leftJoin(BranchIngredientStock, 's', 's.branch_id = b.id AND s.ingredient_id = i.id')
      .select('i.id', 'id').addSelect('b.id', 'branch_id').addSelect('i.id', 'ingredient_id').addSelect('i.name', 'ingredient_name')
      .addSelect('i.unit', 'unit').addSelect('COALESCE(s.current_stock,0)', 'current_stock').addSelect('COALESCE(s.min_stock,0)', 'min_stock')
      .where('b.store_id = :store', { store });
    if (branch) builder.andWhere('b.id = :branch', { branch });
    if (query.ingredientId) builder.andWhere('i.id = :ingredientId', { ingredientId: query.ingredientId });
    if (page.cursor) builder.andWhere('(b.id::text, i.id) > (:key, CAST(:id AS uuid))', { key: page.cursor.key, id: page.cursor.id });
    const rows = await builder.orderBy('b.id').addOrderBy('i.id').limit(page.limit+1).getRawMany();
    return this.finish(rows,count,page,row => row.branch_id,row => ({ branchId:row.branch_id,ingredientId:row.ingredient_id,
      ingredientName:row.ingredient_name,unit:row.unit,currentStock:row.current_stock,minStock:row.min_stock }));
  }

  async setMin(user: UserSummary, ingredientId: string, input: Input) {
    const store = this.store(user);
    fields(input,['branchId','minStock']);
    const branch = this.branch(user,input.branchId,true)!;
    const min = decimal(input.minStock,true);
    return this.db.transaction(async manager => {
      const found = await manager.getRepository(Branch).findOne({ where: { id: branch, store_id: store }, select: { id: true }, lock: { mode: 'pessimistic_write' } });
      const row = found && await manager.getRepository(Ingredient).findOne({ where: { id: ingredientId, store_id: store },
        select: { id: true, name: true, unit: true }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw httpError(404,'NOT_FOUND','Không tìm thấy chi nhánh hoặc nguyên liệu.');
      const { raw: [stock] } = await manager.getRepository(BranchIngredientStock).upsert(
        { branch_id: branch, ingredient_id: ingredientId, min_stock: min, updated_at: () => 'now()' },
        { conflictPaths: ['branch_id','ingredient_id'], returning: ['current_stock','min_stock'] });
      return { branchId:branch,ingredientId,ingredientName:row.name,unit:row.unit,
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
    const branchIds = branch ? [branch] : (await this.db.getRepository(Branch).find({ where: { store_id: store }, select: { id: true } })).map(b => b.id);
    const count = await this.db.getRepository(StockMovement).count({ where: { branch_id: In(branchIds),
      ...(query.ingredientId ? { ingredient_id: query.ingredientId as string } : {}),
      ...(query.type ? { type: query.type as StockMovement['type'] } : {}) } });
    // QueryBuilder: cursor needs microsecond to_char, a row-value comparison or ORDER BY lower()
    const builder = this.db.getRepository(StockMovement).createQueryBuilder('m').innerJoin(Branch, 'b', 'b.id = m.branch_id')
      .innerJoin(Ingredient, 'i', 'i.id = m.ingredient_id').leftJoin(Invoice, 'inv', 'inv.id = m.invoice_id AND inv.branch_id = m.branch_id')
      .select(['m.id AS id', 'm.branch_id AS branch_id', 'm.ingredient_id AS ingredient_id', 'm.type AS type', 'm.quantity AS quantity',
        'm.balance_after AS balance_after', 'm.invoice_id AS invoice_id', 'm.note AS note', 'm.created_at AS created_at'])
      .addSelect(`to_char(m.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, 'cursor_time')
      .addSelect('b.name', 'branch_name').addSelect('inv.invoice_code', 'invoice_code').addSelect('i.name', 'ingredient_name').addSelect('i.unit', 'unit')
      .where('b.store_id = :store', { store });
    if (branch) builder.andWhere('m.branch_id = :branch', { branch });
    if (query.ingredientId) builder.andWhere('m.ingredient_id = :ingredientId', { ingredientId: query.ingredientId });
    if (query.type) builder.andWhere('m.type = :type', { type: query.type });
    if (page.cursor) builder.andWhere('(m.created_at, m.id) < (CAST(:key AS timestamptz), CAST(:id AS uuid))', { key: page.cursor.key, id: page.cursor.id });
    const rows = await builder.orderBy('m.created_at', 'DESC').addOrderBy('m.id', 'DESC').limit(page.limit+1).getRawMany();
    return this.finish(rows,count,page,row => row.cursor_time,row => ({ id:row.id,branchId:row.branch_id,branchName:row.branch_name,
      ingredientId:row.ingredient_id,ingredientName:row.ingredient_name,unit:row.unit,type:row.type,
      quantity:row.quantity,balanceAfter:row.balance_after,invoiceId:row.invoice_id,invoiceCode:row.invoice_code ?? null,note:row.note,
      createdAt:new Date(row.created_at).toISOString() }));
  }
}
