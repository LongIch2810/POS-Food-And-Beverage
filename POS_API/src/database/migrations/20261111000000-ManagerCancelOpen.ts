import { MigrationInterface, QueryRunner } from 'typeorm';

export class ManagerCancelOpen20261111000000 implements MigrationInterface {
  name = 'ManagerCancelOpen20261111000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'MANAGER' AND p.code = 'invoice.cancel_open'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id = (SELECT id FROM roles WHERE name = 'MANAGER')
        AND permission_id = (SELECT id FROM permissions WHERE code = 'invoice.cancel_open');
    `);
  }
}
