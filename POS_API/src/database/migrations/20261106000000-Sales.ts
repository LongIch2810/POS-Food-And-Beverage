import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sales20261106000000 implements MigrationInterface {
  name = 'Sales20261106000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE invoices (
        id uuid PRIMARY KEY,
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        work_shift_id uuid NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT,
        table_id uuid REFERENCES dining_tables(id) ON DELETE RESTRICT,
        invoice_code varchar(10) NOT NULL UNIQUE,
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        order_type varchar(20) NOT NULL CHECK (order_type IN ('DINE_IN','TAKEAWAY')),
        status varchar(20) NOT NULL CHECK (status IN ('OPEN','PAID','CANCELLED')),
        subtotal bigint NOT NULL DEFAULT 0 CHECK (subtotal BETWEEN 0 AND 1000000000000),
        discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount BETWEEN 0 AND 1000000000000),
        total_amount bigint NOT NULL DEFAULT 0 CHECK (total_amount BETWEEN 0 AND 1000000000000),
        zero_completion_key uuid UNIQUE,
        note text,
        paid_at timestamptz,
        cancelled_at timestamptz,
        cancelled_by uuid REFERENCES users(id) ON DELETE RESTRICT,
        cancel_reason varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_invoice_code CHECK (invoice_code ~ '^HD[A-Z0-9]{8}$'),
        CONSTRAINT chk_invoice_table CHECK ((order_type = 'DINE_IN' AND table_id IS NOT NULL) OR (order_type = 'TAKEAWAY' AND table_id IS NULL))
      );
      CREATE UNIQUE INDEX uq_invoices_table_open ON invoices (table_id) WHERE status = 'OPEN' AND table_id IS NOT NULL;
      CREATE INDEX idx_invoices_branch_status_created ON invoices (branch_id, status, created_at DESC, id DESC);
      CREATE INDEX idx_invoices_shift_status ON invoices (work_shift_id, status);

      CREATE TABLE invoice_items (
        id uuid PRIMARY KEY,
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
        product_size_id uuid NOT NULL REFERENCES product_sizes(id) ON DELETE RESTRICT,
        product_name varchar(150) NOT NULL,
        size_name varchar(20) NOT NULL,
        unit_price bigint NOT NULL CHECK (unit_price BETWEEN 0 AND 1000000000000),
        quantity integer NOT NULL CHECK (quantity > 0),
        line_total bigint NOT NULL CHECK (line_total BETWEEN 0 AND 1000000000000),
        note varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id, created_at, id);

      CREATE TABLE invoice_item_toppings (
        id uuid PRIMARY KEY,
        invoice_item_id uuid NOT NULL REFERENCES invoice_items(id) ON DELETE CASCADE,
        topping_id uuid NOT NULL REFERENCES toppings(id) ON DELETE RESTRICT,
        topping_name varchar(100) NOT NULL,
        unit_price bigint NOT NULL CHECK (unit_price BETWEEN 0 AND 1000000000000),
        quantity integer NOT NULL CHECK (quantity > 0),
        line_total bigint NOT NULL CHECK (line_total BETWEEN 0 AND 1000000000000),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (invoice_item_id, topping_id)
      );
      CREATE INDEX idx_invoice_item_toppings_item ON invoice_item_toppings (invoice_item_id);

      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'pos.sell', 'Tạo và cập nhật đơn bán hàng'),
        (gen_random_uuid(), 'invoice.read', 'Xem đơn bán hàng'),
        (gen_random_uuid(), 'invoice.cancel_open', 'Hủy đơn đang mở'),
        (gen_random_uuid(), 'table.read', 'Xem bàn và trạng thái bàn')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE
        (r.name IN ('OWNER','CASHIER') AND p.code IN ('pos.sell','invoice.cancel_open')) OR
        (r.name IN ('OWNER','MANAGER','CASHIER') AND p.code IN ('invoice.read','table.read'))
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('Sales migration cannot be reversed without deleting invoice history');
  }
}
