import { query } from './index';

async function test() {
  const txRes = await query('SELECT count(*)::int as count FROM transactions');
  const bRes = await query('SELECT count(*)::int as count FROM bank_transactions');
  const mRes = await query('SELECT count(*)::int as count FROM members');
  const opRes = await query('SELECT count(*)::int as count FROM opening_balances');
  
  console.log('Postgres counts:', {
    transactions: txRes.rows[0].count,
    bank_transactions: bRes.rows[0].count,
    members: mRes.rows[0].count,
    opening_balances: opRes.rows[0].count
  });

  const txs = await query('SELECT id, date, vr_no, particulars, amount, mode FROM transactions ORDER BY id DESC LIMIT 5');
  console.log('Recent transactions from view:', txs.rows);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
