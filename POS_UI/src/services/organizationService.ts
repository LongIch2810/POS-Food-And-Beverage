import { request } from '../http/client.ts';

export interface OrganizationBranch {
  id: string; storeId: string; code: string; name: string; address: string | null; phone: string | null;
  initialCash: number; isActive: boolean; createdAt: string; updatedAt: string;
}
export interface OrganizationTable {
  id: string; branchId: string; name: string; area: string | null; capacity: number | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}
export interface OrganizationStaff {
  id: string; storeId: string; branchId: string; username: string; fullName: string; role: 'MANAGER' | 'CASHIER';
  isActive: boolean; mustChangePassword: boolean; createdAt: string; updatedAt: string;
}
export interface OrganizationList<T> { data: T[]; meta: { limit: number; nextCursor: string | null; total: number } }
export interface OrganizationQuery { limit?: number; cursor?: string; isActive?: boolean; role?: string; branchId?: string }
export interface BranchInput { code: string; name: string; address?: string | null; phone?: string | null; initialCash?: number }
export interface TableInput { branchId?: string; name: string; area?: string | null; capacity?: number | null }
export interface StaffInput { branchId: string; username: string; fullName: string; role: 'MANAGER' | 'CASHIER' }
export interface StaffPassword { user: OrganizationStaff; temporaryPassword: string }

function list<T>(resource: string, query: OrganizationQuery = {}): Promise<OrganizationList<T>> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 20) });
  for (const [key, value] of Object.entries(query)) if (key !== 'limit' && value !== undefined && value !== '') params.set(key, String(value));
  return request(`${resource}?${params}`, 'GET', undefined, true, true);
}
export const organizationService = {
  getBranches: (query?: OrganizationQuery) => list<OrganizationBranch>('branches', query),
  createBranch: (input: BranchInput) => request<OrganizationBranch>('branches', 'POST', input),
  patchBranch: (id: string, input: Partial<Omit<BranchInput, 'code'>> & { isActive?: boolean }) =>
    request<OrganizationBranch>(`branches/${encodeURIComponent(id)}`, 'PATCH', input),
  getTables: (query?: OrganizationQuery) => list<OrganizationTable>('dining-tables', query),
  createTable: (input: TableInput) => request<OrganizationTable>('dining-tables', 'POST', input),
  patchTable: (id: string, input: Partial<Omit<TableInput, 'branchId'>> & { isActive?: boolean }) =>
    request<OrganizationTable>(`dining-tables/${encodeURIComponent(id)}`, 'PATCH', input),
  getStaff: (query?: OrganizationQuery) => list<OrganizationStaff>('users', query),
  createStaff: (input: StaffInput) => request<StaffPassword>('users', 'POST', input),
  patchStaff: (id: string, input: { role?: 'MANAGER' | 'CASHIER'; isActive?: boolean }) =>
    request<OrganizationStaff>(`users/${encodeURIComponent(id)}`, 'PATCH', input),
  resetStaffPassword: (id: string) => request<StaffPassword>(`users/${encodeURIComponent(id)}/reset-password`, 'POST'),
  async getBranchChoices(): Promise<OrganizationBranch[]> {
    const rows: OrganizationBranch[] = [];
    let cursor: string | undefined;
    do {
      const page = await list<OrganizationBranch>('branches', { limit: 100, cursor });
      rows.push(...page.data); cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);
    return rows;
  },
};
