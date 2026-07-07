import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import logger from '../utils/logger';
import { urlHostnameBelongsTo, urlHasQueryParam } from '../utils/url-host';

let pool: Pool | null = null;

function buildPoolConfig() {
  const connectionString = config.DATABASE_URL;
  const needsSsl =
    urlHostnameBelongsTo(connectionString, 'supabase.com') ||
    urlHasQueryParam(connectionString, 'sslmode', 'require');

  return {
    connectionString,
    min: config.DB_POOL_MIN,
    max: config.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on('error', (err) => {
      logger.error('Unexpected DB pool error', { error: err.message });
    });

    pool.on('connect', () => {
      logger.debug('New DB connection established');
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function resolveMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'src/db/migrations'),
    path.join(process.cwd(), 'dist/db/migrations'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  throw new Error(`Migrations directory not found. Tried: ${candidates.join(', ')}`);
}

export async function runMigrations(): Promise<void> {
  logger.info('Running database migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(10) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = resolveMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (await query<{ version: string }>('SELECT version FROM schema_migrations')).map(
      (r) => r.version,
    ),
  );

  for (const file of files) {
    const version = file.split('_')[0];
    if (applied.has(version)) {
      logger.debug(`Migration ${file} already applied, skipping`);
      continue;
    }

    logger.info(`Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    });

    logger.info(`Migration ${file} applied successfully`);
  }

  logger.info('All migrations complete');
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
