import { query } from './index';

async function main() {
  await query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  const memCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'members'
  `);
  console.log('Members table columns:');
  console.table(memCols.rows);

  const txCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'transactions'
  `);
  console.log('Transactions view columns:');
  console.table(txCols.rows);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
