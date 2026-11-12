import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments20261109000000 implements MigrationInterface {
  name = 'Payments20261109000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE store_bank_accounts (
        store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE RESTRICT,
        bank_bin char(6) NOT NULL CHECK (bank_bin ~ '^[0-9]{6}$'),
        account_number varchar(34) NOT NULL CHECK (account_number ~ '^[0-9]{6,19}$'),
        account_name varchar(150) NOT NULL CHECK (account_name=btrim(account_name) AND account_name<>''),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE invoice_promotion_codes (
        invoice_id uuid PRIMARY KEY REFERENCES invoices(id) ON DELETE RESTRICT,
        promotion_code_id uuid NOT NULL REFERENCES promotion_codes(id) ON DELETE RESTRICT,
        code varchar(50) NOT NULL,
        discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount BETWEEN 0 AND 1000000000000)
      );
      CREATE TABLE transfer_attempts (
        id uuid PRIMARY KEY,
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        bank_bin char(6) NOT NULL CHECK (bank_bin ~ '^[0-9]{6}$'),
        account_number varchar(34) NOT NULL CHECK (account_number ~ '^[0-9]{6,19}$'),
        account_name varchar(150) NOT NULL CHECK (account_name=btrim(account_name) AND account_name<>''),
        amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
        transfer_reference char(18) NOT NULL UNIQUE CHECK (transfer_reference ~ '^HD[A-Z0-9]{16}$'),
        idempotency_key uuid NOT NULL UNIQUE,
        idempotency_request_hash char(64) NOT NULL,
        status varchar(10) NOT NULL CHECK (status IN ('PENDING','CANCELLED','PAID')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX uq_transfer_attempts_pending_invoice ON transfer_attempts(invoice_id) WHERE status='PENDING';
      CREATE INDEX idx_transfer_attempts_store_status ON transfer_attempts(store_id,status);
      CREATE TABLE payments (
        id uuid PRIMARY KEY,
        invoice_id uuid NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE RESTRICT,
        method varchar(10) NOT NULL CHECK (method IN ('CASH','TRANSFER')),
        amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 1000000000000),
        idempotency_key uuid NOT NULL UNIQUE,
        idempotency_request_hash char(64) NOT NULL,
        tendered_amount bigint CHECK (tendered_amount BETWEEN 0 AND 1000000000000),
        change_amount bigint CHECK (change_amount BETWEEN 0 AND 1000000000000),
        actual_received_amount bigint CHECK (actual_received_amount BETWEEN 0 AND 1000000000000),
        excess_amount bigint CHECK (excess_amount BETWEEN 0 AND 1000000000000),
        transfer_attempt_id uuid UNIQUE REFERENCES transfer_attempts(id) ON DELETE RESTRICT,
        receiving_account_number varchar(34),
        transaction_ref varchar(100),
        transaction_ref_kind varchar(12) CHECK (transaction_ref_kind IN ('BANK','SEPAY_EVENT')),
        confirmation_source varchar(10) CHECK (confirmation_source IN ('WEBHOOK','MANUAL')),
        confirmed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
        confirmation_reason varchar(255),
        created_by uuid REFERENCES users(id) ON DELETE RESTRICT,
        paid_at timestamptz NOT NULL DEFAULT now(),
        CHECK (
          (method='CASH' AND tendered_amount IS NOT NULL AND change_amount IS NOT NULL
            AND tendered_amount>=amount AND change_amount=tendered_amount-amount AND created_by IS NOT NULL
            AND actual_received_amount IS NULL AND excess_amount IS NULL AND transfer_attempt_id IS NULL
            AND receiving_account_number IS NULL AND transaction_ref IS NULL AND transaction_ref_kind IS NULL AND confirmation_source IS NULL
            AND confirmed_by IS NULL AND confirmation_reason IS NULL)
          OR
          (method='TRANSFER' AND tendered_amount IS NULL AND change_amount IS NULL
            AND actual_received_amount IS NOT NULL AND excess_amount IS NOT NULL
            AND actual_received_amount>=amount AND excess_amount=actual_received_amount-amount
            AND transfer_attempt_id IS NOT NULL AND receiving_account_number IS NOT NULL
            AND transaction_ref IS NOT NULL AND transaction_ref=btrim(transaction_ref) AND transaction_ref<>''
            AND transaction_ref_kind IS NOT NULL
            AND confirmation_source IS NOT NULL
            AND ((confirmation_source='WEBHOOK' AND created_by IS NULL AND confirmed_by IS NULL AND confirmation_reason IS NULL)
              OR (confirmation_source='MANUAL' AND transaction_ref_kind='BANK' AND created_by IS NOT NULL AND confirmed_by=created_by
                AND confirmed_by IS NOT NULL AND confirmation_reason IS NOT NULL
                AND confirmation_reason=btrim(confirmation_reason) AND confirmation_reason<>'')))
        )
      );
      CREATE UNIQUE INDEX uq_payments_bank_transaction ON payments(receiving_account_number,transaction_ref_kind,transaction_ref)
        WHERE method='TRANSFER' AND transaction_ref IS NOT NULL;
      CREATE TABLE bank_transfer_events (
        id uuid PRIMARY KEY,
        provider_event_id varchar(100) NOT NULL UNIQUE,
        provider_reference varchar(100),
        account_number varchar(34) NOT NULL,
        transfer_reference char(18),
        transfer_amount bigint NOT NULL CHECK (transfer_amount BETWEEN 0 AND 1000000000000),
        content varchar(500),
        received_at timestamptz NOT NULL DEFAULT now(),
        disposition varchar(30) NOT NULL CHECK (disposition IN ('PAID','UNDERPAID','ATTEMPT_CANCELLED','INVOICE_NOT_OPEN','PROMOTION_INVALID','QUARANTINED','DUPLICATE')),
        store_id uuid REFERENCES stores(id) ON DELETE RESTRICT,
        branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
        invoice_id uuid REFERENCES invoices(id) ON DELETE RESTRICT,
        attempt_id uuid REFERENCES transfer_attempts(id) ON DELETE RESTRICT
      );
      CREATE INDEX idx_bank_transfer_events_scope ON bank_transfer_events(store_id,branch_id,received_at DESC,id DESC);
      ALTER TABLE stock_movements ALTER COLUMN created_by DROP NOT NULL;
      ALTER TABLE stock_movements ADD COLUMN source varchar(10) NOT NULL DEFAULT 'USER'
        CHECK (source IN ('USER','SYSTEM'));
      ALTER TABLE stock_movements ADD CONSTRAINT ck_stock_movements_actor CHECK (
        (source='SYSTEM' AND created_by IS NULL) OR (source='USER' AND created_by IS NOT NULL));
      INSERT INTO permissions(id,code,description) VALUES
        (gen_random_uuid(),'store_bank_account.manage','Cài tài khoản nhận chuyển khoản'),
        (gen_random_uuid(),'transfer.confirm_manual','Xác nhận chuyển khoản đã đối chiếu'),
        (gen_random_uuid(),'transfer.exception_read','Xem giao dịch chuyển khoản cần xử lý')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions(role_id,permission_id)
      SELECT r.id,p.id FROM roles r,permissions p WHERE
        (r.name='MANAGER' AND p.code='pos.sell') OR
        (r.name='OWNER' AND p.code='store_bank_account.manage') OR
        (r.name IN ('OWNER','MANAGER') AND p.code IN ('transfer.confirm_manual','transfer.exception_read'))
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('Payments migration cannot be reversed without deleting payment history');
  }
}
