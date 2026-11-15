import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportsPermissions20261114000001 implements MigrationInterface {
  name = 'ReportsPermissions20261114000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'report.view_shift', 'Xem báo cáo doanh thu ca thu ngân của mình'),
        (gen_random_uuid(), 'report.view_branch', 'Xem báo cáo doanh thu chi nhánh'),
        (gen_random_uuid(), 'report.view_all', 'Xem báo cáo doanh thu toàn cửa hàng')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE
        (r.name = 'CASHIER' AND p.code = 'report.view_shift')
        OR (r.name = 'MANAGER' AND p.code = 'report.view_branch')
        OR (r.name = 'OWNER' AND p.code = 'report.view_all')
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('Reports permissions migration cannot be reversed automatically without removing permission assignments');
  }
}
