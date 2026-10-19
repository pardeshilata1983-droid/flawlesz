// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Global connection pool caching to persist across hot-reloads and module evaluations
declare global {
  var _postgresPool: Pool | undefined;
}

const isDatabaseConfigured = Boolean(
  process.env.SQL_HOST || process.env.DATABASE_URL || process.env.PGHOST
);

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!isDatabaseConfigured) {
    return null;
  }

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.warn('[AI Studio] PostgreSQL pool warning:', err.message);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Recursive chainable mock proxy for Drizzle when database is not connected
function createMockDrizzle(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (val: any) => void) => resolve([]);
      }
      if (prop === 'catch') {
        return () => Promise.resolve([]);
      }
      return new Proxy(() => {}, handler);
    },
    apply() {
      return new Proxy(() => {}, handler);
    }
  };
  return new Proxy({}, handler);
}

let dbInstance: any;
if (isDatabaseConfigured && pool) {
  try {
    dbInstance = drizzle(pool, { schema });
  } catch {
    console.warn('[AI Studio] Database not connected — using in-memory mock');
    dbInstance = createMockDrizzle();
  }
} else {
  dbInstance = createMockDrizzle();
}

export const db = dbInstance;
export { schema };

