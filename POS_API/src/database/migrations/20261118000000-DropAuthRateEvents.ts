import { MigrationInterface, QueryRunner } from 'typeorm';

// Throttling moved to Redis; the table only held 15-minute counters.
export class DropAuthRateEvents20261118000000 implements MigrationInterface {
  name = 'DropAuthRateEvents20261118000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_rate_events');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auth_rate_events (
        id bigserial PRIMARY KEY,
        scope varchar(30) NOT NULL,
        key_hash char(64) NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_auth_rate_events_key_time ON auth_rate_events(scope, key_hash, occurred_at);
      CREATE INDEX idx_auth_rate_events_time ON auth_rate_events(occurred_at);
    `);
  }
}
