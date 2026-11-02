import { MigrationInterface, QueryRunner } from 'typeorm';

export class Shifts20261103000000 implements MigrationInterface {
  name = 'Shifts20261103000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE work_shifts (
        id uuid PRIMARY KEY,
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        shift_type varchar(20) NOT NULL,
        started_at timestamptz NOT NULL,
        ended_at timestamptz,
        status varchar(20) NOT NULL,
        closed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
        note varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_work_shifts_type CHECK (shift_type IN ('CASHIER', 'STAFF')),
        CONSTRAINT chk_work_shifts_status CHECK (status IN ('OPEN', 'CLOSED')),
        CONSTRAINT chk_work_shifts_ended_at CHECK (ended_at IS NULL OR ended_at > started_at)
      );

      CREATE UNIQUE INDEX uq_work_shifts_user_open ON work_shifts (user_id) WHERE status = 'OPEN';
      CREATE UNIQUE INDEX uq_work_shifts_branch_cashier_open ON work_shifts (branch_id) WHERE status = 'OPEN' AND shift_type = 'CASHIER';
      CREATE INDEX idx_work_shifts_branch_started ON work_shifts (branch_id, started_at);
      CREATE INDEX idx_work_shifts_user_id ON work_shifts (user_id);
      CREATE INDEX idx_work_shifts_status ON work_shifts (status);

      CREATE TABLE cash_reconciliations (
        id uuid PRIMARY KEY,
        work_shift_id uuid NOT NULL UNIQUE REFERENCES work_shifts(id) ON DELETE RESTRICT,
        opening_cash bigint NOT NULL CHECK (opening_cash >= 0 AND opening_cash <= 1000000000000),
        cash_sales_amount bigint CHECK (cash_sales_amount IS NULL OR (cash_sales_amount >= 0 AND cash_sales_amount <= 1000000000000)),
        expense_amount bigint CHECK (expense_amount IS NULL OR (expense_amount >= 0 AND expense_amount <= 1000000000000)),
        expected_cash bigint CHECK (expected_cash IS NULL OR (expected_cash >= 0 AND expected_cash <= 1000000000000)),
        counted_cash bigint CHECK (counted_cash IS NULL OR (counted_cash >= 0 AND counted_cash <= 1000000000000)),
        difference bigint CHECK (difference IS NULL OR (abs(difference) <= 1000000000000)),
        status varchar(20) NOT NULL,
        note varchar(255),
        reconciled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_cash_reconciliations_status CHECK (status IN ('PENDING', 'MATCHED', 'SHORTAGE', 'OVERAGE'))
      );

      CREATE INDEX idx_cash_reconciliations_work_shift_id ON cash_reconciliations(work_shift_id);

      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'shift.read', 'Xem thông tin và lịch sử ca làm việc'),
        (gen_random_uuid(), 'shift.open', 'Mở ca làm việc nhân viên hoặc ca thu ngân'),
        (gen_random_uuid(), 'shift.close', 'Đóng ca làm việc của mình'),
        (gen_random_uuid(), 'shift.force_close', 'Đóng cưỡng chế ca làm việc')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE
        (r.name IN ('OWNER', 'MANAGER', 'CASHIER') AND p.code IN ('shift.read', 'shift.open', 'shift.close'))
        OR (r.name IN ('OWNER', 'MANAGER') AND p.code = 'shift.force_close')
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('Shifts migration cannot be reversed without deleting shift history data');
  }
}

