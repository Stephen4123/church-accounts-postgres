import { query } from './index';

async function main() {
  const r = await query('SELECT * FROM opening_balances');
  console.log('PostgreSQL Opening Balances:', r.rows);
  process.exit(0);
}
main().catch(console.error);
