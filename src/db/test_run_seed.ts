import fs from 'fs';
import path from 'path';
import { query } from './index';

async function testSeed() {
  const seedPath = path.join(__dirname, 'real_seed.sql');
  let sql = fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
  sql = sql.replace(
    'TRUNCATE TABLE transactions, bank_transactions, members, opening_balances, subtypes, users RESTART IDENTITY CASCADE;',
    'TRUNCATE TABLE cash_book, bank_book, members, opening_balances, subtypes, users RESTART IDENTITY CASCADE;'
  );
  
  try {
    console.log('Running test seed...');
    await query(sql);
    console.log('Test seed succeeded!');
    
    const tx = await query('SELECT count(*)::int as count FROM transactions');
    const btx = await query('SELECT count(*)::int as count FROM bank_transactions');
    const m = await query('SELECT count(*)::int as count FROM members');
    console.log('New counts:', {
      transactions: tx.rows[0].count,
      bank_transactions: btx.rows[0].count,
      members: m.rows[0].count
    });
  } catch (e: any) {
    console.error('Seed error:', e.message);
  }
}

testSeed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
