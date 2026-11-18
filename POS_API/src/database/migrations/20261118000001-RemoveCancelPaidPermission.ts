import { MigrationInterface, QueryRunner } from 'typeorm';

// BR-110 (PB-16): PAID invoices can no longer be cancelled.
export class RemoveCancelPaidPermission20261118000001 implements MigrationInterface {
  name = 'RemoveCancelPaidPermission20261118000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'invoice.cancel_paid');
      DELETE FROM permissions WHERE code = 'invoice.cancel_paid';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name IN ('OWNER', 'MANAGER') AND p.code = 'invoice.cancel_paid'
      ON CONFLICT DO NOTHING;
    `);
  }
}
