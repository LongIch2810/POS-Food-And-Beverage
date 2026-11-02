import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuCatalog20261102000000 implements MigrationInterface {
  name = 'MenuCatalog20261102000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name varchar(100) NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (store_id, name)
      );
      CREATE INDEX idx_categories_store_id ON categories(store_id);

      CREATE TABLE sizes (
        id uuid PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name varchar(20) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (store_id, name)
      );
      CREATE INDEX idx_sizes_store_id ON sizes(store_id);

      CREATE TABLE products (
        id uuid PRIMARY KEY,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name varchar(150) NOT NULL,
        description text,
        image_base64 text,
        image_mime varchar(50),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (category_id, name),
        CONSTRAINT chk_products_image CHECK (
          (image_base64 IS NULL AND image_mime IS NULL) OR
          (image_base64 IS NOT NULL AND image_mime IS NOT NULL)
        ),
        CONSTRAINT chk_products_image_size CHECK (
          octet_length(decode(coalesce(image_base64, ''), 'base64')) <= 2000000
        )
      );
      CREATE INDEX idx_products_category_id ON products(category_id);

      CREATE TABLE product_sizes (
        id uuid PRIMARY KEY,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        size_id uuid NOT NULL REFERENCES sizes(id) ON DELETE RESTRICT,
        price bigint NOT NULL CHECK (price >= 0 AND price <= 1000000000000),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (product_id, size_id)
      );
      CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);
      CREATE INDEX idx_product_sizes_size_id ON product_sizes(size_id);

      CREATE TABLE toppings (
        id uuid PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
        name varchar(100) NOT NULL,
        price bigint NOT NULL CHECK (price >= 0 AND price <= 1000000000000),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (store_id, name)
      );
      CREATE INDEX idx_toppings_store_id ON toppings(store_id);

      CREATE TABLE category_toppings (
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        topping_id uuid NOT NULL REFERENCES toppings(id) ON DELETE RESTRICT,
        PRIMARY KEY (category_id, topping_id)
      );
      CREATE INDEX idx_category_toppings_topping_id ON category_toppings(topping_id);

      INSERT INTO permissions (id, code, description) VALUES
        (gen_random_uuid(), 'menu.read', 'Xem danh mục, món, size, topping và giá bán'),
        (gen_random_uuid(), 'menu.manage', 'Tạo, sửa, ngưng dùng danh mục, món, size, topping, giá và ảnh')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE
        (r.name IN ('OWNER', 'MANAGER', 'CASHIER') AND p.code = 'menu.read')
        OR (r.name IN ('OWNER', 'MANAGER') AND p.code = 'menu.manage')
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('MenuCatalog migration cannot be reversed without deleting catalog data');
  }
}

