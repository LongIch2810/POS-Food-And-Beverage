import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { dataResponse } from './api-response';

@Controller('api/v1')
export class HealthController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}

  @Get('health')
  async health(): Promise<{ data: { status: 'ok' } }> {
    try {
      // QueryBuilder: table-less SELECT (advisory lock or probe); no repository method runs it
      await this.db.createQueryBuilder().select('1', 'ok').fromDummy().getRawOne();
    } catch {
      throw new ServiceUnavailableException();
    }
    return dataResponse({ status: 'ok' as const });
  }
}
