import fs from 'fs';
import path from 'path';
import db, { query } from './index';

async function clearDatabase() {
  console.log('🧹 Clearing database and preserving stephensam2001@gmail.com...');

  const adminEmail = 'stephensam2001@gmail.com';
  const adminName = 'Stephen Sam Simon';
  const adminRole = 'Admin';
  const adminPhoto = 'https://lh3.googleusercontent.com/d/1Jo3HKFpAgHgV_QqX-OBSwV5sSo57usyR';
  // Password hash for 'admin123'
  const adminHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  // 1. PostgreSQL Cleanup
  if (db.isPostgres()) {
    try {
      console.log('⚡ Clearing PostgreSQL tables...');
      await query(`
        TRUNCATE TABLE transactions, bank_transactions, members, shared_links, suspense_transactions, subscriptions RESTART IDENTITY CASCADE;
      `);

      // Clear users except stephensam2001@gmail.com
      await query(`DELETE FROM users WHERE email != $1;`, [adminEmail]);

      // Ensure stephensam2001@gmail.com exists
      await query(`
        INSERT INTO users (name, email, password_hash, role, photo_url, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (email) DO UPDATE 
        SET role = $4, is_active = true, photo_url = $5;
      `, [adminName, adminEmail, adminHash, adminRole, adminPhoto]);

      // Reset opening balances to 0 for a clean fresh start
      await query(`
        INSERT INTO opening_balances (financial_year, start_date, end_date, cash_amount, sbi_current_amount, sbi_fd_amount, notes)
        VALUES ('2026-2027', '2026-04-01', '2027-03-31', 0, 0, 0, 'Clean database initialized')
        ON CONFLICT (financial_year) DO UPDATE 
        SET cash_amount = 0, sbi_current_amount = 0, sbi_fd_amount = 0, notes = 'Clean database initialized';
      `);

      console.log('✅ PostgreSQL tables cleared successfully!');
      
      const userRes = await query('SELECT id, name, email, role FROM users');
      console.log('Current PostgreSQL Users:', userRes.rows);
      
      const txRes = await query('SELECT count(*)::int as count FROM transactions');
      console.log('Current PostgreSQL Transactions Count:', txRes.rows[0].count);
      
      const memRes = await query('SELECT count(*)::int as count FROM members');
      console.log('Current PostgreSQL Members Count:', memRes.rows[0].count);

    } catch (err: any) {
      console.error('❌ Error clearing PostgreSQL:', err.message);
    }
  }

  // 2. Local JSON files Cleanup
  const localDbPath = path.join(__dirname, '../../data/local_db.json');
  const publicLocalDbPath = path.join(__dirname, '../../public/data/local_db.json');

  const cleanStore = {
    users: [
      {
        id: 1,
        name: adminName,
        email: adminEmail,
        password_hash: adminHash,
        role: adminRole,
        photo_url: adminPhoto,
        is_active: true
      }
    ],
    members: [],
    bank_accounts: [
      { id: 1, account_name: "State Bank of India", account_type: "Current", is_default: true },
      { id: 2, account_name: "SBI Fixed Deposit", account_type: "Fixed Deposit", is_default: false }
    ],
    subtypes: [],
    opening_balances: [
      {
        id: 1,
        financial_year: "2026-2027",
        start_date: "2026-04-01",
        end_date: "2027-03-31",
        cash_amount: 0,
        sbi_current_amount: 0,
        sbi_fd_amount: 0,
        notes: "Clean database initialized"
      }
    ],
    transactions: [],
    bank_transactions: [],
    suspense_transactions: [],
    subscriptions: [],
    settings: {
      church_info: {
        name: "THE INDIAN PENTECOSTAL CHURCH OF GOD - HOREB",
        subtitle: "Accounts & Financial Records",
        upi_id: "ipchoreb@sbi",
        phone: "+91 98470 12345",
        address: "Horeb Nagar, Kerala, India"
      }
    },
    shared_links: {}
  };

  fs.writeFileSync(localDbPath, JSON.stringify(cleanStore, null, 2), 'utf8');
  console.log(`[OK] Reset ${localDbPath}`);

  fs.writeFileSync(publicLocalDbPath, JSON.stringify(cleanStore, null, 2), 'utf8');
  console.log(`[OK] Reset ${publicLocalDbPath}`);

  // Also update in-memory store
  Object.assign(db.memoryStore, cleanStore);

  console.log('🎉 Database successfully cleared! Only stephensam2001@gmail.com is retained as Admin.');
  if (db.pool) await db.pool.end();
  process.exit(0);
}

clearDatabase().catch(e => {
  console.error(e);
  process.exit(1);
});
