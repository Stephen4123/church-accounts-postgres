import db, { query } from './index';

async function check() {
  const cb = await query('SELECT count(*)::int as count FROM cash_book');
  const bb = await query('SELECT count(*)::int as count FROM bank_book');
  const mem = await query('SELECT count(*)::int as count FROM members');
  const tx = await query('SELECT count(*)::int as count FROM transactions');
  const btx = await query('SELECT count(*)::int as count FROM bank_transactions');
  
  console.log('Counts:', {
    cash_book: cb.rows[0]?.count,
    bank_book: bb.rows[0]?.count,
    members: mem.rows[0]?.count,
    transactions: tx.rows[0]?.count,
    bank_transactions: btx.rows[0]?.count
  });

  const txSamples = await query('SELECT id, date, voucher_no, particulars, receipt, payment FROM cash_book LIMIT 5');
  console.log('cash_book sample:', txSamples.rows);

  const memSamples = await query('SELECT id, member_code, name FROM members LIMIT 5');
  console.log('members sample:', memSamples.rows);
}

check().then(() => {
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
