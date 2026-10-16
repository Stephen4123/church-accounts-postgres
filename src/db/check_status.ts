import { query } from './index';

async function check() {
  const users = await query('SELECT id, name, email, role, is_active FROM users');
  console.log('PostgreSQL Users:', users.rows);
  const tx = await query('SELECT count(*)::int as count FROM transactions');
  console.log('Transactions Count:', tx.rows[0].count);
  const mem = await query('SELECT count(*)::int as count FROM members');
  console.log('Members Count:', mem.rows[0].count);
  const bank = await query('SELECT count(*)::int as count FROM bank_transactions');
  const op = await query('SELECT * FROM opening_balances');
  console.log('Opening Balances:', op.rows);
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
