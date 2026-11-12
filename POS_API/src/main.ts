import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { bootstrapAdmin } from './bootstrap-admin';
import { dataSource } from './database/data-source';
import { assertSchemaCurrent, validateAuthConfig } from './auth/auth-config';
import { setupDevelopmentDocs } from './swagger-docs';

async function main(): Promise<void> {
  try {
    validateAuthConfig();
    await dataSource.initialize();
    await assertSchemaCurrent(dataSource);
    await bootstrapAdmin(dataSource);
    const app = await NestFactory.create(AppModule, { rawBody: true });
    setupDevelopmentDocs(app);
    await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
  } catch {
    if (dataSource.isInitialized) await dataSource.destroy();
    throw new Error('API startup failed; check database migration and bootstrap configuration');
  }
}

main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
