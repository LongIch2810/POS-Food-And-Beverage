import { request } from '../../http/client';

export interface Ingredient { id: string; name: string; unit: 'g' | 'ml' | 'piece'; isActive: boolean }
export interface Stock { branchId: string; ingredientId: string; ingredientName: string; unit: string; currentStock: string; minStock: string }
export interface Movement { id: string; branchId: string; ingredientId: string; ingredientName: string; unit: string;
  type: string; quantity: string; balanceAfter: string; invoiceId: string | null; note: string | null; createdAt: string }
export interface RecipeLine { ingredientId: string; ingredientName: string; unit: string; quantity: string }
export interface Page<T> { data: T[]; meta: { nextCursor: string | null; total: number; limit: number } }

async function all<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page = await request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}${query}`, 'GET', undefined, true, true);
    rows.push(...page.data);
    cursor = page.meta.nextCursor;
  } while (cursor);
  return rows;
}

export const inventoryService = {
  ingredients: () => all<Ingredient>('ingredients'),
  stocks: (branchId?: string) => all<Stock>(`ingredient-stocks${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`),
  movements: (branchId?: string) => all<Movement>(`stock-movements${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`),
  createIngredient: (name: string, unit: Ingredient['unit']) => request<Ingredient>('ingredients','POST',{name,unit}),
  patchIngredient: (id: string, input: Partial<Pick<Ingredient,'name'|'unit'|'isActive'>>) =>
    request<Ingredient>(`ingredients/${encodeURIComponent(id)}`,'PATCH',input),
  setMin: (ingredientId: string, minStock: string, branchId?: string) =>
    request<Stock>(`ingredient-stocks/${encodeURIComponent(ingredientId)}/min-stock`,'PATCH',
      branchId ? {minStock,branchId} : {minStock}),
  getRecipe: (kind: 'product-sizes'|'toppings', id: string) => request<RecipeLine[]>(`${kind}/${encodeURIComponent(id)}/recipe`),
  putRecipe: (kind: 'product-sizes'|'toppings', id: string, ingredients: {ingredientId:string;quantity:string}[]) =>
    request<RecipeLine[]>(`${kind}/${encodeURIComponent(id)}/recipe`,'PUT',{ingredients}),
};
