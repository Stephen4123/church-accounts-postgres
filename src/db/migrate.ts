import fs from 'fs';
import path from 'path';
import db, { query, isPostgres, memoryStore, saveLocalStore, loadLocalStore } from './index';
import { setupTriggers } from './setup_triggers';

export async function migrate(): Promise<void> {
  console.log('🚀 Running database migrations...');

  const candidateSchema1 = path.join(__dirname, 'schema.sql');
  const candidateSchema2 = path.join(__dirname, '../../src/db/schema.sql');
  const schemaPath = fs.existsSync(candidateSchema1) ? candidateSchema1 : candidateSchema2;

  if (isPostgres()) {
    try {
      // Ensure all rich columns exist for existing tables
      console.log('⚡ Ensuring all columns exist in cash_book and bank_book...');
      await query(`
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS subtype VARCHAR(255) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS sub_month VARCHAR(50) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'Cash';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS bank_account VARCHAR(255) DEFAULT 'State Bank of India';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS bank_subtype VARCHAR(255) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS is_cheque BOOLEAN DEFAULT FALSE;
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS cheque_no VARCHAR(100) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS member_code VARCHAR(50) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT '';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2026-2027';
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE;
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS bank_id BIGINT DEFAULT NULL;

        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS account_name VARCHAR(255) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS subtype VARCHAR(255) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS bank_subtype VARCHAR(255) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS sub_month VARCHAR(50) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'Bank';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS member_code VARCHAR(50) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS is_cheque BOOLEAN DEFAULT FALSE;
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2026-2027';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS is_printed BOOLEAN DEFAULT FALSE;
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS cash_id BIGINT DEFAULT NULL;

        ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      `).catch((e) => console.warn('Column creation warning:', e.message));

      if (fs.existsSync(schemaPath)) {
        console.log('⚡ Applying PostgreSQL Schema & Views...');
        // Drop old views so schema.sql can recreate them with updated column shapes
        await query(`
          DROP VIEW IF EXISTS transactions CASCADE;
          DROP VIEW IF EXISTS bank_transactions CASCADE;
        `).catch(() => {});

        const schemaSql = fs.readFileSync(schemaPath, 'utf8').replace(/^\uFEFF/, '');
        await query(schemaSql);
        await setupTriggers();
        console.log('✅ PostgreSQL Schema & Triggers applied successfully!');

        // Auto-fix any inverted contra entries in bank_book (where Cash Deposit was recorded as debit instead of credit)
        await query(`
          UPDATE bank_book 
          SET credit = debit, debit = 0 
          WHERE (particulars ILIKE '%cash deposit%' OR category ILIKE '%cash deposit%') 
            AND debit > 0 AND credit = 0;
        `).catch(() => {});
      }

      // Check if data is already present in PostgreSQL
      const txCheck = await query('SELECT count(*)::int as count FROM transactions');
      const txCount = txCheck.rows[0]?.count || 0;
      console.log(`ℹ️ PostgreSQL contains ${txCount} transactions.`);

      // Auto-link contra entries between cash_book and bank_book (cash_book.bank_id <-> bank_book.cash_id)
      console.log('🔗 Auto-linking Contra entries between cash_book and bank_book...');
      await query(`
        UPDATE cash_book c
        SET bank_id = b.id
        FROM bank_book b
        WHERE (c.bank_id IS NULL OR c.bank_id = 0)
          AND (
            (c.voucher_no = b.voucher_no AND c.voucher_no NOT IN ('', '--', '-'))
            OR
            (c.date = b.date AND ABS(COALESCE(c.receipt, 0) + COALESCE(c.payment, 0) - (COALESCE(b.credit, 0) + COALESCE(b.debit, 0))) < 0.01
             AND (c.category ILIKE '%Contra%' OR b.category ILIKE '%Contra%' OR c.particulars ILIKE '%Cash Deposit%' OR b.particulars ILIKE '%Cash Deposit%' OR c.particulars ILIKE '%Cash Withdrawal%' OR b.particulars ILIKE '%Cash Withdrawal%')
            )
          );

        UPDATE bank_book b
        SET cash_id = c.id
        FROM cash_book c
        WHERE (b.cash_id IS NULL OR b.cash_id = 0)
          AND (
            (b.voucher_no = c.voucher_no AND b.voucher_no NOT IN ('', '--', '-'))
            OR
            (b.date = c.date AND ABS(COALESCE(c.receipt, 0) + COALESCE(c.payment, 0) - (COALESCE(b.credit, 0) + COALESCE(b.debit, 0))) < 0.01
             AND (c.category ILIKE '%Contra%' OR b.category ILIKE '%Contra%' OR c.particulars ILIKE '%Cash Deposit%' OR b.particulars ILIKE '%Cash Deposit%' OR c.particulars ILIKE '%Cash Withdrawal%' OR b.particulars ILIKE '%Cash Withdrawal%')
            )
          );
      `).catch(err => console.warn('Contra link warning:', err.message));
      console.log('✅ Contra entries linked successfully!');

      // Ensure default opening balance exists without overwriting existing records
      await query(`
        INSERT INTO opening_balances (financial_year, start_date, end_date, cash_amount, sbi_current_amount, sbi_fd_amount, notes)
        VALUES ('2026-2027', '2026-04-01', '2027-03-31', 0.00, 0.00, 0.00, 'Initial opening balance')
        ON CONFLICT (financial_year) DO NOTHING;
      `);

      // Ensure member titles have dot notation (Br., Sr., Pr., Evg.)
      await query(`
        UPDATE members SET title = 'Br.' WHERE title = 'Br' OR title ILIKE 'brother';
        UPDATE members SET title = 'Sr.' WHERE title = 'Sr' OR title ILIKE 'sister';
        UPDATE members SET title = 'Pr.' WHERE title = 'Pr' OR title ILIKE 'pastor';
        UPDATE members SET title = 'Evg.' WHERE title = 'Evg' OR title ILIKE 'evangelist';
      `).catch(() => {});

      // Auto-link cash_book entries to members table where member_id IS NULL
      await query(`
        UPDATE cash_book c
        SET member_id = m.id
        FROM members m
        WHERE c.member_id IS NULL
          AND c.account_name IS NOT NULL
          AND c.account_name NOT IN ('', '-', '--', 'State Bank of India', 'Contra', 'Opening Balance (Cash in Hand)')
          AND (
            LOWER(TRIM(c.account_name)) = LOWER(TRIM(m.name))
            OR LOWER(TRIM(c.account_name)) = LOWER(TRIM(COALESCE(m.title || ' ' || m.name, m.name)))
            OR LOWER(TRIM(c.account_name)) = LOWER(TRIM('Br. ' || m.name))
            OR LOWER(TRIM(c.account_name)) = LOWER(TRIM('Sr. ' || m.name))
            OR LOWER(TRIM(c.account_name)) = LOWER(TRIM('Pr. ' || m.name))
            OR LOWER(TRIM(c.account_name)) = LOWER(TRIM('Evg. ' || m.name))
            OR (m.nickname IS NOT NULL AND m.nickname <> '' AND LOWER(TRIM(c.account_name)) = LOWER(TRIM(m.nickname)))
          );
      `).catch(() => {});

      // Ensure church info setting exists
      await query(`
        INSERT INTO settings (key, value)
        VALUES 
          ('church_info', '{"name":"IPC HOREB CHURCH","subtitle":"Accounts & Financial Management System","upi_id":"ipchoreb@sbi","phone":"+91 98470 12345","address":"Horeb Nagar, Kerala"}'),
          ('phone_config', '{"default_prefix":"+91"}')
        ON CONFLICT (key) DO NOTHING;
      `);

      // Seed & link categories table
      await seedCategories();

    } catch (err: any) {
      console.error('❌ Migration failed:', err.message);
    }
  } else {
    // Local / Offline store initialization from data/local_db.json
    console.log('ℹ️ Running in Local Mode - syncing with data/local_db.json...');
    loadLocalStore();
    console.log(`✅ Loaded ${memoryStore.transactions.length} real transactions and ${memoryStore.members.length} members from local_db.json`);
  }

  console.log('🎉 Database initialization complete!');
}

export async function seedCategories(): Promise<void> {
  console.log('⚡ Ensuring categories table and standard church categories...');
  if (isPostgres()) {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_category_name_type UNIQUE (name, type)
        );
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT '';
      `);

      const standardCategories = [
        // Receipts
        { name: 'Subscription', type: 'Receipt', group_name: 'Subscription' },
        { name: 'Offering', type: 'Receipt', group_name: 'Offering' },
        { name: 'Charity Received', type: 'Receipt', group_name: 'Charity' },
        { name: 'Donations', type: 'Receipt', group_name: 'Other Income' },
        { name: 'First fruits', type: 'Receipt', group_name: 'Other Income' },
        { name: 'Anniversary Contributions Received', type: 'Receipt', group_name: 'Other Income' },
        { name: 'Sodari Samajam', type: 'Receipt', group_name: 'Other Income' },
        { name: 'Monthly Meeting Collection', type: 'Receipt', group_name: 'Monthly Meeting' },
        { name: 'Fasting Prayer Meeting', type: 'Receipt', group_name: 'Monthly Meeting' },
        { name: 'General Body / Committee Meeting', type: 'Receipt', group_name: 'Monthly Meeting' },
        { name: 'Cash Withdrawal (Contra)', type: 'Receipt', group_name: 'Contra' },
        { name: 'Bank Interest (Income)', type: 'Receipt', group_name: 'Bank' },
        { name: 'Direct Deposit for Member', type: 'Receipt', group_name: 'Bank' },
        { name: 'None / General', type: 'Receipt', group_name: 'General' },

        // Payments
        { name: 'General Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Printing and Stationery', type: 'Payment', group_name: 'Ledger' },
        { name: 'Electricity Expenses Church', type: 'Payment', group_name: 'Ledger' },
        { name: 'Electricity Expenses Parcenage', type: 'Payment', group_name: 'Ledger' },
        { name: 'Lords Supper Sunday School Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Salary Pr. T.T.Simon', type: 'Payment', group_name: 'Ledger' },
        { name: 'Allowance Pr. T.T.Simon', type: 'Payment', group_name: 'Ledger' },
        { name: 'Church Maintenance', type: 'Payment', group_name: 'Ledger' },
        { name: 'General Body Anniversary Meeting Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Fasting wednesday Prayer Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Drinking Water', type: 'Payment', group_name: 'Ledger' },
        { name: 'Church Cleaning Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Conveyance Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Suspenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Guest Visiting Pastors', type: 'Payment', group_name: 'Ledger' },
        { name: 'Generator Expenses', type: 'Payment', group_name: 'Ledger' },
        { name: 'Church Building Land Taxes', type: 'Payment', group_name: 'Ledger' },
        { name: 'IPC Church Registration Membership', type: 'Payment', group_name: 'Ledger' },
        { name: 'Kerala Water Authority for water Supply', type: 'Payment', group_name: 'Ledger' },
        { name: 'Purchases', type: 'Payment', group_name: 'Ledger' },
        { name: 'Charity Paid', type: 'Payment', group_name: 'Charity' },
        { name: 'Monthly Meeting Expenses', type: 'Payment', group_name: 'Monthly Meeting' },
        { name: 'Cash Deposit (Contra)', type: 'Payment', group_name: 'Contra' },
        { name: 'Bank Charges (Expense)', type: 'Payment', group_name: 'Bank' },
        { name: 'Direct Transfer / General', type: 'Payment', group_name: 'Bank' },
        { name: 'None / General', type: 'Payment', group_name: 'General' }
      ];

      for (const cat of standardCategories) {
        await query(`
          INSERT INTO categories (name, type, group_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (name, type) DO UPDATE SET group_name = EXCLUDED.group_name;
        `, [cat.name, cat.type, cat.group_name]);
      }

      // Upsert distinct non-empty categories from cash_book and bank_book
      await query(`
        INSERT INTO categories (name, type, group_name)
        SELECT 
          TRIM(sub.name) as name, 
          sub.type,
          MAX(CASE
            WHEN sub.name ILIKE '%contra%' THEN 'Contra'
            WHEN sub.name ILIKE '%charity%' THEN 'Charity'
            WHEN sub.name ILIKE '%meeting%' THEN 'Monthly Meeting'
            WHEN sub.name ILIKE 'bank%' OR sub.name ILIKE '%direct %' THEN 'Bank'
            WHEN sub.name = 'Subscription' THEN 'Subscription'
            WHEN sub.name = 'Offering' THEN 'Offering'
            WHEN sub.type = 'Receipt' THEN 'Other Income'
            ELSE 'Ledger'
          END) as group_name
        FROM (
          SELECT DISTINCT 
            TRIM(subtype) as name, 
            CASE 
              WHEN subtype ILIKE '%deposit%contra%' OR subtype ILIKE '%payment%' OR subtype ILIKE '%expense%' OR subtype ILIKE '%charges%' OR subtype ILIKE '%paid%' THEN 'Payment'
              WHEN subtype ILIKE '%withdrawal%contra%' OR subtype ILIKE '%interest%' OR subtype ILIKE '%receipt%' OR subtype ILIKE '%income%' OR subtype ILIKE '%subscription%' OR subtype ILIKE '%offering%' OR subtype ILIKE '%donation%' OR subtype ILIKE '%fruits%' OR subtype ILIKE '%received%' OR subtype ILIKE '%collection%' THEN 'Receipt'
              WHEN receipt > 0 THEN 'Receipt'
              ELSE 'Payment'
            END as type
          FROM cash_book
          WHERE subtype IS NOT NULL AND TRIM(subtype) <> '' AND TRIM(subtype) NOT IN ('Bank', 'General', 'Contra')
          UNION
          SELECT DISTINCT 
            TRIM(category) as name, 
            CASE 
              WHEN category ILIKE '%deposit%contra%' OR category ILIKE '%payment%' OR category ILIKE '%expense%' OR category ILIKE '%charges%' OR category ILIKE '%paid%' THEN 'Payment'
              WHEN category ILIKE '%withdrawal%contra%' OR category ILIKE '%interest%' OR category ILIKE '%receipt%' OR category ILIKE '%income%' OR category ILIKE '%subscription%' OR category ILIKE '%offering%' OR category ILIKE '%donation%' OR category ILIKE '%fruits%' OR category ILIKE '%received%' OR category ILIKE '%collection%' THEN 'Receipt'
              WHEN receipt > 0 THEN 'Receipt'
              ELSE 'Payment'
            END as type
          FROM cash_book
          WHERE category IS NOT NULL AND TRIM(category) <> '' AND TRIM(category) NOT IN ('Bank', 'General', 'Contra')
          UNION
          SELECT DISTINCT 
            TRIM(subtype) as name, 
            CASE 
              WHEN subtype ILIKE '%deposit%contra%' OR subtype ILIKE '%payment%' OR subtype ILIKE '%expense%' OR subtype ILIKE '%charges%' OR subtype ILIKE '%paid%' THEN 'Payment'
              WHEN subtype ILIKE '%withdrawal%contra%' OR subtype ILIKE '%interest%' OR subtype ILIKE '%receipt%' OR subtype ILIKE '%income%' OR subtype ILIKE '%subscription%' OR subtype ILIKE '%offering%' OR subtype ILIKE '%donation%' OR subtype ILIKE '%fruits%' OR subtype ILIKE '%received%' OR subtype ILIKE '%collection%' THEN 'Receipt'
              WHEN credit > 0 THEN 'Receipt'
              ELSE 'Payment'
            END as type
          FROM bank_book
          WHERE subtype IS NOT NULL AND TRIM(subtype) <> '' AND TRIM(subtype) NOT IN ('Bank', 'General', 'Contra')
          UNION
          SELECT DISTINCT 
            TRIM(category) as name, 
            CASE 
              WHEN category ILIKE '%deposit%contra%' OR category ILIKE '%payment%' OR category ILIKE '%expense%' OR category ILIKE '%charges%' OR category ILIKE '%paid%' THEN 'Payment'
              WHEN category ILIKE '%withdrawal%contra%' OR category ILIKE '%interest%' OR category ILIKE '%receipt%' OR category ILIKE '%income%' OR category ILIKE '%subscription%' OR category ILIKE '%offering%' OR category ILIKE '%donation%' OR category ILIKE '%fruits%' OR category ILIKE '%received%' OR category ILIKE '%collection%' THEN 'Receipt'
              WHEN credit > 0 THEN 'Receipt'
              ELSE 'Payment'
            END as type
          FROM bank_book
          WHERE category IS NOT NULL AND TRIM(category) <> '' AND TRIM(category) NOT IN ('Bank', 'General', 'Contra')
        ) sub
        WHERE sub.name <> ''
          AND NOT EXISTS (
            SELECT 1 FROM categories c 
            WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(sub.name)) 
              AND c.type = sub.type
          )
        GROUP BY TRIM(sub.name), sub.type
        ON CONFLICT (name, type) DO NOTHING;
      `);

      // Auto-link category_id in cash_book and bank_book
      await query(`
        UPDATE cash_book c
        SET category_id = cat.id
        FROM categories cat
        WHERE c.category_id IS NULL
          AND (
            LOWER(TRIM(c.subtype)) = LOWER(TRIM(cat.name))
            OR LOWER(TRIM(c.category)) = LOWER(TRIM(cat.name))
            OR LOWER(TRIM(c.type)) = LOWER(TRIM(cat.name))
          );

        UPDATE bank_book b
        SET category_id = cat.id
        FROM categories cat
        WHERE b.category_id IS NULL
          AND (
            LOWER(TRIM(b.subtype)) = LOWER(TRIM(cat.name))
            OR LOWER(TRIM(b.category)) = LOWER(TRIM(cat.name))
            OR LOWER(TRIM(b.bank_subtype)) = LOWER(TRIM(cat.name))
            OR LOWER(TRIM(b.type)) = LOWER(TRIM(cat.name))
          );
      `).catch(() => {});

      const catCheck = await query('SELECT count(*)::int as count FROM categories');
      console.log(`✅ Seeded and verified ${catCheck.rows[0]?.count || 0} categories in database.`);
    } catch (e: any) {
      console.warn('Categories seed warning:', e.message);
    }
  } else {
    if (!memoryStore.categories || memoryStore.categories.length === 0) {
      memoryStore.categories = [
        { id: 1, name: 'Subscription', type: 'Receipt', group_name: 'Subscription' },
        { id: 2, name: 'Offering', type: 'Receipt', group_name: 'Offering' },
        { id: 3, name: 'General Expenses', type: 'Payment', group_name: 'Ledger' },
        { id: 4, name: 'Charity Received', type: 'Receipt', group_name: 'Charity' },
        { id: 5, name: 'Charity Paid', type: 'Payment', group_name: 'Charity' }
      ];
    }
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
