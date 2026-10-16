import fs from 'fs';
import path from 'path';
import db, { query } from './index';

async function main() {
  const seedPath = path.join(__dirname, 'real_seed.sql');
  console.log('Reading seed file from:', seedPath);
  const sql = fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
  console.log('Executing seed SQL on PostgreSQL...');
  await query(sql);
  console.log('[OK] Seed executed successfully into PostgreSQL!');

  const check = await query('SELECT vr_no, payment_amount, amount FROM transactions WHERE vr_no = $1', ['41']);
  console.log('Verified VR 41 in PostgreSQL:', check.rows);

  const charPaid = await query("SELECT SUM(payment_amount)::numeric as total FROM transactions WHERE subtype = 'Charity Paid'");
  console.log('Verified Charity Paid Total in PostgreSQL:', charPaid.rows[0]);

  const totalTxs = await query('SELECT count(*)::int as count FROM transactions');
  console.log('Total Transactions in PostgreSQL:', totalTxs.rows[0]);

  if (db.pool) await db.pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Error applying seed:', err);
  process.exit(1);
});
