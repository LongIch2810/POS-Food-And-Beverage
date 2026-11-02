import { MigrationInterface, QueryRunner } from 'typeorm';

export class Organization20261030000000 implements MigrationInterface {
  name = 'Organization20261030000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dining_tables (
        id uuid PRIMARY KEY,
        branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        name varchar(50) NOT NULL,
        area varchar(50),
        capacity integer CHECK (capacity > 0),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (branch_id, name)
      );
      INSERT INTO roles(id,name) VALUES (gen_random_uuid(),'MANAGER'),(gen_random_uuid(),'CASHIER')
      ON CONFLICT (name) DO NOTHING;
      INSERT INTO permissions(id,code)
      SELECT gen_random_uuid(),code FROM (VALUES
        ('branch.read'),('branch.manage'),('branch.access_all'),('table.manage'),('user.manage')
      ) AS required(code) ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions(role_id,permission_id)
      SELECT r.id,p.id FROM roles r,permissions p WHERE
        (r.name='OWNER' AND p.code IN ('branch.read','branch.manage','branch.access_all','table.manage','user.manage'))
        OR (r.name='MANAGER' AND p.code IN ('branch.read','table.manage'))
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    throw new Error('Organization migration cannot be reversed without deleting tables or changing account access');
  }
}
