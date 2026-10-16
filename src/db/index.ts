import pg, { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Force pg to return DATE columns (OID 1082) as raw string 'YYYY-MM-DD' instead of JS Date object
pg.types.setTypeParser(1082, (val: string) => val);

let pool: Pool | null = null;
let isPostgresClient = false;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || 
                         databaseUrl.includes('render.com') || 
                         databaseUrl.includes('neon.tech') || 
                         databaseUrl.includes('supabase.co');
                         
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    isPostgresClient = true;
    console.log('📦 PostgreSQL Pool configured with connection string.');
  } catch (err: any) {
    console.error('⚠️ Could not configure PostgreSQL pool:', err.message);
  }
} else {
  console.log('ℹ️ No DATABASE_URL provided. Running with local persistent data store.');
}

// Fallback local JSON store for instant offline development if Postgres is not yet configured locally
const localDataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(localDataDir)) {
  fs.mkdirSync(localDataDir, { recursive: true });
}
const localDbFile = path.join(localDataDir, 'local_db.json');

export interface MemoryStore {
  users: any[];
  members: any[];
  bank_accounts: any[];
  subtypes: any[];
  opening_balances: any[];
  transactions: any[];
  bank_transactions: any[];
  suspense_transactions: any[];
  subscriptions: any[];
  settings: Record<string, any>;
  shared_links: Record<string, any>;
}

export const memoryStore: MemoryStore = {
  users: [],
  members: [],
  bank_accounts: [],
  subtypes: [],
  opening_balances: [],
  transactions: [],
  bank_transactions: [],
  suspense_transactions: [],
  subscriptions: [],
  settings: {},
  shared_links: {}
};

export function loadLocalStore(): void {
  if (fs.existsSync(localDbFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(localDbFile, 'utf8').replace(/^\uFEFF/, ''));
      Object.assign(memoryStore, data);
    } catch (e: any) {
      console.warn('Could not read local_db.json, starting fresh:', e.message);
    }
  }
}

export function saveLocalStore(): void {
  try {
    fs.writeFileSync(localDbFile, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (e: any) {
    console.error('Failed to persist local_db.json:', e.message);
  }
}

loadLocalStore();

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  if (isPostgresClient && pool) {
    try {
      const result: QueryResult = await pool.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
    } catch (err: any) {
      console.error('PostgreSQL Query Error:', err.message, '\nQuery:', text);
      throw err;
    }
  }

  // Fallback memory emulator for zero-setup local execution
  return emulateQuery<T>(text, params);
}

function emulateQuery<T = any>(sql: string, params: any[]): { rows: T[]; rowCount: number } {
  const norm = sql.trim().toLowerCase();
  for (const table of Object.keys(memoryStore) as (keyof MemoryStore)[]) {
    if (norm.includes(`from ${table}`) || norm.includes(`into ${table}`)) {
      const storeItem = memoryStore[table];
      const rows = Array.isArray(storeItem) ? [...storeItem] : [];
      return { rows: rows as T[], rowCount: rows.length };
    }
  }
  return { rows: [], rowCount: 0 };
}

export function isPostgres(): boolean {
  return isPostgresClient && pool !== null;
}

export default {
  query,
  pool,
  isPostgres,
  memoryStore,
  saveLocalStore
};
