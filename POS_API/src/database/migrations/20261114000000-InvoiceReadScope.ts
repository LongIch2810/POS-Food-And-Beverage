import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceReadScope20261114000000 implements MigrationInterface {
  name = 'InvoiceReadScope20261114000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions(id,code,description)
      VALUES(gen_random_uuid(),'invoice.read_branch','Xem hóa đơn của các ca trong chi nhánh')
      ON CONFLICT (code) DO NOTHING;
      INSERT INTO role_permissions(role_id,permission_id)
      SELECT r.id,p.id FROM roles r, permissions p
      WHERE r.name IN ('OWNER','MANAGER') AND p.code='invoice.read_branch'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code='invoice.read_branch');
      DELETE FROM permissions WHERE code='invoice.read_branch';
    `);
  }
}
