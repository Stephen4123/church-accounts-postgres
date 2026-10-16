import { query } from './index';

async function test() {
  console.log('Testing Cash Book entry insertion...');
  const cashRes = await query(`
    INSERT INTO transactions (
      date, vr_no, account_name, particulars, receipt_amount, mode, category
    ) VALUES (
      '2026-10-16', 'R-9999', 'Br. Abraham Mathew', 'Test Offering Receipt', 500.00, 'Receipt', 'Offering'
    ) RETURNING *
  `);
  console.log('Inserted cash transaction via view:', cashRes.rows[0]);

  // Check cash_book directly
  const cb = await query(`SELECT * FROM cash_book WHERE voucher_no = 'R-9999'`);
  console.log('Direct cash_book record:', cb.rows[0]);

  console.log('\nTesting Bank Book entry insertion...');
  const bankRes = await query(`
    INSERT INTO bank_transactions (
      date, vr_no, cheque_no, bank_account, particulars, receipt_amount, mode, bank_subtype, account_name
    ) VALUES (
      '2026-10-16', 'B-9999', 'CHQ12345', 'State Bank of India', 'Test Bank Deposit', 1000.00, 'Credit (Receipt)', 'Bank', 'Br. Abraham Mathew'
    ) RETURNING *
  `);
  console.log('Inserted bank transaction via view:', bankRes.rows[0]);

  // Check bank_book directly
  const bb = await query(`SELECT * FROM bank_book WHERE voucher_no = 'B-9999'`);
  console.log('Direct bank_book record:', bb.rows[0]);

  // Clean up test entries
  await query(`DELETE FROM cash_book WHERE voucher_no = 'R-9999'`);
  await query(`DELETE FROM bank_book WHERE voucher_no = 'B-9999'`);
  console.log('\nCleaned up test entries successfully!');
}

test().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
