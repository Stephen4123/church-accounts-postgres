import { query } from './index';

async function test() {
  try {
    await query('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
    console.log('Truncate views succeeded');
  } catch (e: any) {
    console.log('Truncate views error:', e.message);
  }
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
