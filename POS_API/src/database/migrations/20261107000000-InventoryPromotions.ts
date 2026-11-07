import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryPromotions20261107000000 implements MigrationInterface {
  name = 'InventoryPromotions20261107000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ingredients (
        id uuid PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name varchar(100) NOT NULL CHECK (name = btrim(name) AND name <> ''),
        unit varchar(20) NOT NULL CHECK (unit IN ('g','ml','piece')),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX uq_ingredients_store_name ON ingredients(store_id, lower(name));

      CREATE TABLE product_size_ingredients (
        product_size_id uuid NOT NULL REFERENCES product_sizes(id) ON DELETE RESTRICT,
        ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (product_size_id, ingredient_id)
      );
      CREATE INDEX idx_product_size_ingredients_ingredient ON product_size_ingredients(ingredient_id);

      CREATE TABLE topping_ingredients (
        topping_id uuid NOT NULL REFERENCES toppings(id) ON DELETE RESTRICT,
        ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (topping_id, ingredient_id)
      );
      CREATE INDEX idx_topping_ingredients_ingredient ON topping_ingredients(ingredient_id);

      CREATE TABLE branch_ingredient_stocks (
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        current_stock numeric(14,3) NOT NULL DEFAULT 0,
        min_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (branch_id, ingredient_id)
      );
      CREATE INDEX idx_branch_ingredient_stocks_ingredient ON branch_ingredient_stocks(ingredient_id);

      CREATE TABLE stock_movements (
        id uuid PRIMARY KEY,
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        type varchar(20) NOT NULL CHECK (type IN ('IMPORT','SALE','SALE_REVERSAL','WASTE','ADJUST')),
        quantity numeric(14,3) NOT NULL CHECK (quantity <> 0),
        balance_after numeric(14,3) NOT NULL,
        invoice_id uuid REFERENCES invoices(id) ON DELETE RESTRICT,
        note varchar(255),
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_stock_movements_branch_ingredient_created ON stock_movements(branch_id, ingredient_id, created_at DESC, id DESC);
      CREATE INDEX idx_stock_movements_invoice ON stock_movements(invoice_id);
      CREATE FUNCTION apply_stock_movement() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM branches b JOIN ingredients i ON i.store_id=b.store_id
          WHERE b.id=NEW.branch_id AND i.id=NEW.ingredient_id
        ) THEN RAISE EXCEPTION 'stock movement crosses store' USING ERRCODE = '23514'; END IF;
        INSERT INTO branch_ingredient_stocks(branch_id,ingredient_id) VALUES(NEW.branch_id,NEW.ingredient_id)
        ON CONFLICT (branch_id,ingredient_id) DO NOTHING;
        UPDATE branch_ingredient_stocks SET current_stock=current_stock+NEW.quantity,updated_at=now()
        WHERE branch_id=NEW.branch_id AND ingredient_id=NEW.ingredient_id RETURNING current_stock INTO NEW.balance_after;
        RETURN NEW;
      END $$;
      CREATE TRIGGER stock_movements_apply BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();
      CREATE FUNCTION reject_stock_movement_change() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'stock_movements is append only' USING ERRCODE = '23514'; END $$;
      CREATE TRIGGER stock_movements_append_only BEFORE UPDATE OR DELETE ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION reject_stock_movement_change();

      CREATE TABLE promotion_codes (
        id uuid PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        code varchar(50) NOT NULL CHECK (code = upper(btrim(code)) AND code <> ''),
        name varchar(150),
        discount_type varchar(20) NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
        discount_value bigint NOT NULL CHECK (discount_value > 0 AND discount_value <= 1000000000000),
        max_discount_amount bigint CHECK (max_discount_amount > 0 AND max_discount_amount <= 1000000000000),
        min_order_amount bigint CHECK (min_order_amount >= 0 AND min_order_amount <= 1000000000000),
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL CHECK (end_at > start_at),
        usage_limit integer CHECK (usage_limit > 0),
        used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK ((discount_type = 'PERCENT' AND discount_value <= 100) OR
               (discount_type = 'FIXED' AND max_discount_amount IS NULL))
      );
      CREATE UNIQUE INDEX uq_promotion_codes_store_code ON promotion_codes(store_id, code);

      INSERT INTO permissions (id,code,description) VALUES
        (gen_random_uuid(),'inventory.view','Xem nguyên liệu, công thức, tồn và sổ kho'),
        (gen_random_uuid(),'inventory.manage','Quản lý nguyên liệu và ngưỡng tồn'),
        (gen_random_uuid(),'promotion.manage','Quản lý mã giảm giá')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions (role_id,permission_id)
      SELECT r.id,p.id FROM roles r,permissions p
      WHERE r.name IN ('OWNER','MANAGER') AND p.code IN ('inventory.view','inventory.manage','promotion.manage')
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('InventoryPromotions migration cannot be reversed without deleting business data');
  }
}
