import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftExpenses20261113000000 implements MigrationInterface {
  name = 'ShiftExpenses20261113000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shift_expenses (
        id uuid PRIMARY KEY,
        work_shift_id uuid NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT,
        amount bigint NOT NULL CHECK (amount > 0 AND amount <= 1000000000000),
        reason varchar(255) NOT NULL CHECK (reason = btrim(reason) AND reason <> ''),
        paid_from_drawer boolean NOT NULL DEFAULT true,
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_shift_expenses_shift_created ON shift_expenses (work_shift_id, created_at DESC, id DESC);
      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'shift.expense', 'Ghi chi phí từ két trong ca thu ngân của mình'),
        (gen_random_uuid(), 'invoice.cancel_paid', 'Hủy đơn đã thanh toán khi ca của đơn còn mở')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE
        (r.name IN ('OWNER', 'MANAGER', 'CASHIER') AND p.code = 'shift.expense')
        OR (r.name IN ('OWNER', 'MANAGER') AND p.code = 'invoice.cancel_paid')
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('ShiftExpenses migration cannot be reversed without deleting shift expense history');
  }
}
