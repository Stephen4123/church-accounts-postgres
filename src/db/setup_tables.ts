import { query, isPostgres } from './index';

export async function setupTables() {
  if (!isPostgres()) {
    console.log('Not connected to PostgreSQL');
    return;
  }

  console.log('⚙️ Restructuring database tables per user audio specification...');

  // 1. Drop old transaction tables if present
  await query(`DROP TABLE IF EXISTS transactions CASCADE`);
  await query(`DROP TABLE IF EXISTS bank_transactions CASCADE`);
  await query(`DROP TABLE IF EXISTS suspense_transactions CASCADE`);
  await query(`DROP TABLE IF EXISTS subscriptions CASCADE`);
  await query(`DROP TABLE IF EXISTS cash_book CASCADE`);
  await query(`DROP TABLE IF EXISTS bank_book CASCADE`);
  await query(`DROP TABLE IF EXISTS categories CASCADE`);

  // 2. Create Categories table
  await query(`
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL, -- 'Receipt' or 'Payment'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_category_name_type UNIQUE (name, type)
    );
  `);

  // 3. Populate Categories
  const receiptCategories = [
    'Subscription',
    'Offering',
    'Charity Received',
    'Donations',
    'First fruits',
    'Anniversary Contributions Received',
    'Sodari Samajam',
    'Monthly Meeting',
    'Cash Withdrawal (Contra)',
    'None / General'
  ];

  const paymentCategories = [
    'General Expenses',
    'Printing and Stationery',
    'Electricity Expenses Church',
    'Electricity Expenses Parcenage',
    'Lords Supper Sunday School Expenses',
    'Salary Pr. T.T.Simon',
    'Allowance Pr. T.T.Simon',
    'Church Maintenance',
    'General Body Anniversary Meeting Expenses',
    'Fasting wednesday Prayer Expenses',
    'Drinking Water',
    'Church Cleaning Expenses',
    'Conveyance Expenses',
    'Suspenses',
    'Guest Visiting Pastors',
    'Generator Expenses',
    'Church Building Land Taxes',
    'IPC Church Registration Membership',
    'Kerala Water Authority for water Supply'
  ];

  for (const name of receiptCategories) {
    await query(`INSERT INTO categories (name, type) VALUES ($1, 'Receipt') ON CONFLICT DO NOTHING`, [name]);
  }

  for (const name of paymentCategories) {
    await query(`INSERT INTO categories (name, type) VALUES ($1, 'Payment') ON CONFLICT DO NOTHING`, [name]);
  }

  // 4. Create Cash Book table
  await query(`
    CREATE TABLE cash_book (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      voucher_no VARCHAR(50) DEFAULT '',
      member_id INT REFERENCES members(id) ON DELETE SET NULL,
      account_name VARCHAR(255) DEFAULT '',
      particulars TEXT DEFAULT '',
      receipt NUMERIC(12, 2) DEFAULT 0.00,
      payment NUMERIC(12, 2) DEFAULT 0.00,
      balance NUMERIC(12, 2) DEFAULT 0.00,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      category VARCHAR(255) DEFAULT '',
      bank_id BIGINT DEFAULT NULL, -- Connected to bank_book id
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Create Bank Book table
  await query(`
    CREATE TABLE bank_book (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      cheque_no VARCHAR(50) DEFAULT '',
      voucher_no VARCHAR(50) DEFAULT '',
      bank_account VARCHAR(255) DEFAULT 'State Bank of India',
      member_id INT REFERENCES members(id) ON DELETE SET NULL,
      particulars TEXT DEFAULT '',
      credit NUMERIC(12, 2) DEFAULT 0.00, -- Receipt / Deposit
      debit NUMERIC(12, 2) DEFAULT 0.00,  -- Payment / Withdrawal
      balance NUMERIC(12, 2) DEFAULT 0.00,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      category VARCHAR(255) DEFAULT '',
      cash_id BIGINT DEFAULT NULL, -- Connected to cash_book id
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Compatibility views for backward compatibility with existing API queries
  await query(`
    CREATE OR REPLACE VIEW transactions AS
    SELECT 
      c.id,
      c.date,
      c.voucher_no as vr_no,
      c.account_name,
      c.particulars as description,
      c.particulars,
      c.receipt as receipt_amount,
      c.payment as payment_amount,
      CASE WHEN c.receipt > 0 THEN c.receipt ELSE c.payment END as amount,
      CASE WHEN c.receipt > 0 THEN 'Receipt' ELSE 'Payment' END as mode,
      'Cash' as entry_type,
      c.category,
      c.category as type,
      c.category as subtype,
      c.category as sub_type,
      c.member_id,
      m.member_code,
      m.address,
      m.phone,
      c.bank_id,
      c.balance,
      c.created_at,
      c.updated_at
    FROM cash_book c
    LEFT JOIN members m ON c.member_id = m.id;
  `);

  await query(`
    CREATE OR REPLACE VIEW bank_transactions AS
    SELECT
      b.id,
      b.date,
      b.voucher_no as vr_no,
      b.cheque_no,
      b.bank_account,
      b.bank_account as account,
      b.particulars as description,
      b.particulars,
      b.credit as receipt_amount,
      b.debit as payment_amount,
      CASE WHEN b.credit > 0 THEN b.credit ELSE b.debit END as amount,
      CASE WHEN b.credit > 0 THEN 'Credit (Receipt)' ELSE 'Debit (Payment)' END as mode,
      'Bank' as entry_type,
      b.category,
      b.category as bank_subtype,
      b.category as subtype,
      b.category as type,
      b.member_id,
      m.member_code,
      m.name as account_name,
      b.cash_id,
      b.balance,
      b.created_at,
      b.updated_at
    FROM bank_book b
    LEFT JOIN members m ON b.member_id = m.id;
  `);

  console.log('✅ Tables created successfully:');
  console.log('   - categories (seeded with 10 Receipt & 19 Payment categories)');
  console.log('   - cash_book (with id, date, voucher_no, member_id, account_name, particulars, receipt, payment, balance, category_id, bank_id)');
  console.log('   - bank_book (with id, date, cheque_no, voucher_no, bank_account, member_id, particulars, credit, debit, balance, category_id, cash_id)');
  console.log('   - Preserved: members (193), users, opening_balances');
}

if (require.main === module) {
  setupTables().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
