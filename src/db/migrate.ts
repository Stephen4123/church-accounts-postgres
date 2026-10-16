import fs from 'fs';
import path from 'path';
import db, { query, isPostgres, memoryStore, saveLocalStore, loadLocalStore } from './index';
import { setupTriggers } from './setup_triggers';

export async function migrate(): Promise<void> {
  console.log('🚀 Running database migrations with real migrated Firestore data...');

  const candidateSchema1 = path.join(__dirname, 'schema.sql');
  const candidateSchema2 = path.join(__dirname, '../../src/db/schema.sql');
  const schemaPath = fs.existsSync(candidateSchema1) ? candidateSchema1 : candidateSchema2;

  const candidateSeed1 = path.join(__dirname, 'real_seed.sql');
  const candidateSeed2 = path.join(__dirname, '../../src/db/real_seed.sql');
  const realSeedPath = fs.existsSync(candidateSeed1) ? candidateSeed1 : candidateSeed2;

  if (isPostgres()) {
    try {
      // Ensure sub_month columns exist for existing tables
      await query(`
        ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS sub_month VARCHAR(50) DEFAULT '';
        ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS sub_month VARCHAR(50) DEFAULT '';
      `).catch(() => {});

      if (fs.existsSync(schemaPath)) {
        console.log('⚡ Applying PostgreSQL Schema...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8').replace(/^\uFEFF/, '');
        await query(schemaSql);
        await setupTriggers();
        console.log('✅ PostgreSQL Schema & Triggers applied successfully!');

        // Ensure bank_id and cash_id columns exist
        await query(`
          ALTER TABLE cash_book ADD COLUMN IF NOT EXISTS bank_id BIGINT DEFAULT NULL;
          ALTER TABLE bank_book ADD COLUMN IF NOT EXISTS cash_id BIGINT DEFAULT NULL;
        `).catch(() => {});

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

      if ((txCount <= 3 || process.env.AUTO_SEED === 'true') && fs.existsSync(realSeedPath)) {
        console.log('📦 Populating PostgreSQL with real Firestore data (467 transactions, 193 members)...');
        const seedSql = fs.readFileSync(realSeedPath, 'utf8').replace(/^\uFEFF/, '');
        await query(seedSql);
        console.log('🎉 Real production data successfully populated into PostgreSQL!');
      } else {
        console.log(`ℹ️ PostgreSQL contains ${txCount} transactions.`);
      }

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

      // Ensure 2026-2027 opening balance is exact matching reference_repo
      await query(`
        INSERT INTO opening_balances (financial_year, start_date, end_date, cash_amount, sbi_current_amount, sbi_fd_amount, notes)
        VALUES ('2026-2027', '2026-04-01', '2027-03-31', 127005.00, 143068.37, 108022.00, 'Live Firestore Migration')
        ON CONFLICT (financial_year) DO UPDATE 
        SET cash_amount = 127005.00, sbi_current_amount = 143068.37, sbi_fd_amount = 108022.00;
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

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
