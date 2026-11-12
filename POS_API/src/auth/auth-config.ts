import { DataSource } from 'typeorm';

export function validateAuthConfig(): void {
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32
    || !process.env.CSRF_SECRET || Buffer.byteLength(process.env.CSRF_SECRET) < 32) {
    throw new Error('Authentication secrets are missing or invalid');
  }
  try {
    const origin = new URL(process.env.PUBLIC_ORIGIN ?? '');
    if (origin.origin !== process.env.PUBLIC_ORIGIN || !['http:', 'https:'].includes(origin.protocol)) throw new Error();
  } catch {
    throw new Error('PUBLIC_ORIGIN is missing or invalid');
  }
}

export function sePayWebhookSecret():string|null {
  const secret=process.env.SEPAY_WEBHOOK_SECRET;
  const isPlaceholder=/^<.*>$/s.test(secret?.trim()??'');
  return process.env.SEPAY_ENV==='test'&&secret&&!isPlaceholder&&Buffer.byteLength(secret)>=32?secret:null;
}

export async function assertSchemaCurrent(db: DataSource): Promise<void> {
  if (await db.showMigrations()) throw new Error('Database has pending migrations');
}
