import { Router, Request, Response } from 'express';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to format any Date, ISO string, or DB date into pure YYYY-MM-DD
export function formatDateYMD(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const m = str.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  if (m) {
    const parts = m[1].replace(/\//g, '-').split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  const mWord = str.match(/(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/i);
  if (mWord) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };
    const mo = months[mWord[1].toLowerCase()] || '01';
    const day = mWord[2].padStart(2, '0');
    return `${mWord[3]}-${mo}-${day}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dDay = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dDay}`;
  }
  return str.split('T')[0];
}

// Mapping helper for Transaction row -> Firestore format
function mapTransactionRow(row: any) {
  const isReceipt = (row.mode === 'Receipt' || (!row.mode && Number(row.receipt_amount || 0) > 0));
  const amount = Number(row.amount || (isReceipt ? row.receipt_amount : row.payment_amount) || 0);
  const typeVal = row.type || row.category || 'General';
  const subTypeVal = row.subtype || row.sub_type || row.subType || '';
  const descStr = String(row.particulars || row.description || '').toLowerCase();
  const bSubStr = String(row.bank_subtype || row.subtype || '').toLowerCase();
  const isContraRow = descStr.includes('cash deposit') || descStr.includes('cash withdrawal') || bSubStr.includes('cash deposit') || bSubStr.includes('cash withdrawal');
  const isBankRow = (String(row.entry_type || '').toLowerCase() === 'bank' || String(row.vr_no || row.voucher_no || '').trim().toLowerCase().endsWith('/b'));

  // Resolve category directly from database category column
  let catVal = String(row.category || '').trim();
  const genericCats = ['ledger', 'payment', 'general', 'bank', 'cash', 'expenses', 'expense'];
  if (!catVal || genericCats.includes(catVal.toLowerCase())) {
    catVal = subTypeVal || typeVal;
  }
  if (!catVal || genericCats.includes(catVal.toLowerCase())) {
    const allTxText = `${descStr} ${subTypeVal} ${bSubStr} ${row.vr_no || row.voucher_no || ''}`.toLowerCase();
    if (allTxText.includes('interest') || /\bint(\.|\b|\d)/i.test(allTxText)) {
      catVal = (allTxText.includes('sodari') || allTxText.includes('sodhari')) ? 'Sodari Samajam for Deposit' : 'Bank Interest (Income)';
    }
  } else if (catVal.toLowerCase().includes('bank interest')) {
    catVal = 'Bank Interest (Income)';
  }

  return {
    id: Number(row.id),
    date: formatDateYMD(row.date),
    vrNo: row.vr_no || row.voucher_no || '--',
    vr_no: row.vr_no || row.voucher_no || '--',
    accountName: row.account_name || '',
    particulars: row.particulars || row.description || '',
    description: row.description || row.particulars || '',
    category: catVal,
    subtype: subTypeVal,
    subType: subTypeVal,
    type: typeVal,
    amount: amount,
    receipt: isReceipt ? amount : '',
    payment: !isReceipt ? amount : '',
    mode: isReceipt ? 'Receipt' : 'Payment',
    entryType: row.entry_type || (isBankRow ? 'Bank' : 'Cash'),
    bankAccount: row.bank_account || 'State Bank of India',
    bankSubtype: row.bank_subtype || '',
    subMonth: row.sub_month || '',
    memberCode: row.member_code || '',
    address: row.address || '',
    phone: row.phone || '',
    financialYear: row.financial_year || '2026-2027',
    isCancelled: !!row.is_cancelled,
    inCashBook: isContraRow ? true : (isBankRow ? (row.in_cash_book === true || row.add_to_cash_book === true) : row.in_cash_book !== false),
    addToCashBook: isContraRow ? true : (isBankRow ? (row.add_to_cash_book === true || row.in_cash_book === true) : row.add_to_cash_book !== false),
    chequeNo: row.cheque_no || '',
    chqNo: row.cheque_no || '',
    isCheque: !!row.is_cheque,
    bankId: row.bank_id ? Number(row.bank_id) : (row.bankId ? Number(row.bankId) : null),
    bank_id: row.bank_id ? Number(row.bank_id) : (row.bankId ? Number(row.bankId) : null),
    transactionId: row.transaction_id || '',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    _docId: String(row.id)
  };
}

function mapMemberRow(row: any) {
  let title = (row.title || '').trim();
  if (title) {
    if (/^Br\.?\b|^Brother\b/i.test(title)) title = 'Br.';
    else if (/^Pr\.?\b|^Pastor\b/i.test(title)) title = 'Pr.';
    else if (/^Sr\.?\b|^Sister\b/i.test(title)) title = 'Sr.';
    else if (/^Evg\.?\b|^Evangelist\b/i.test(title)) title = 'Evg.';
    else if (!title.endsWith('.')) title = title + '.';
  } else if (row.name && row.name.toLowerCase() !== 'offertory') {
    title = 'Br.';
  }

  return {
    id: Number(row.id),
    code: row.member_code || `H${row.id}`,
    memberCode: row.member_code || `H${row.id}`,
    title: title,
    nickname: row.nickname || '',
    name: row.name || '',
    address: row.address || '',
    phone: row.phone || '',
    status: row.status || (row.is_active !== false ? 'Active' : 'Inactive'),
    is_active: row.is_active !== false,
    _docId: String(row.id)
  };
}

// Mapping helper for Bank Transaction row -> Firestore format
function mapBankTxRow(row: any) {
  const isReceipt = (
    String(row.mode || '').includes('Receipt') ||
    String(row.mode || '').includes('Credit') ||
    String(row.mode || '').includes('Deposit') ||
    String(row.particulars || row.description || '').toLowerCase().includes('cash deposit') ||
    String(row.bank_subtype || row.category || '').toLowerCase().includes('cash deposit') ||
    Number(row.receipt_amount || 0) > 0 ||
    Number(row.credit || 0) > 0
  );
  const amount = Number(row.amount || (isReceipt ? (row.receipt_amount || row.credit) : (row.payment_amount || row.debit)) || 0);
  const subTypeVal = row.subtype || row.sub_type || row.subType || '';
  const bankSubVal = row.bank_subtype || row.bankSubtype || row.bank_sub_type || '';
  let catVal = String(row.category || '').trim();
  const genericCats = ['bank', 'ledger', 'payment', 'general', 'cash', 'expenses', 'expense'];
  if (!catVal || genericCats.includes(catVal.toLowerCase())) {
    catVal = (subTypeVal && !genericCats.includes(String(subTypeVal).trim().toLowerCase())) 
      ? subTypeVal 
      : (bankSubVal && !genericCats.includes(String(bankSubVal).trim().toLowerCase()) ? bankSubVal : (row.type || 'Bank'));
  }
  if (!catVal || genericCats.includes(catVal.toLowerCase())) {
    const allBankText = `${row.particulars || ''} ${row.description || ''} ${subTypeVal} ${bankSubVal} ${row.voucher_no || ''}`.toLowerCase();
    if (allBankText.includes('interest') || /\bint(\.|\b|\d)/i.test(allBankText)) {
      catVal = (allBankText.includes('sodari') || allBankText.includes('sodhari')) ? 'Sodari Samajam for Deposit' : 'Bank Interest (Income)';
    }
  } else if (catVal.toLowerCase().includes('bank interest')) {
    catVal = 'Bank Interest (Income)';
  }

  return {
    id: Number(row.id),
    date: formatDateYMD(row.date),
    vrNo: row.vr_no || row.voucher_no || '--',
    vr_no: row.vr_no || row.voucher_no || '--',
    accountName: row.account_name || '',
    account_name: row.account_name || '',
    name: row.account_name || '',
    particulars: row.particulars || row.description || '',
    description: row.description || row.particulars || '',
    account: row.bank_account || row.account || 'State Bank of India',
    bankAccount: row.bank_account || row.account || 'State Bank of India',
    bank_account: row.bank_account || row.account || 'State Bank of India',
    bankSubtype: bankSubVal,
    bank_subtype: bankSubVal,
    subtype: subTypeVal,
    subType: subTypeVal,
    type: row.type || bankSubVal || 'Bank',
    category: catVal,
    amount: amount,
    receipt: isReceipt ? amount : '',
    payment: !isReceipt ? amount : '',
    credit: isReceipt ? amount : 0,
    debit: !isReceipt ? amount : 0,
    mode: isReceipt ? 'Credit (Receipt)' : 'Debit (Payment)',
    entryType: 'Bank',
    financialYear: row.financial_year || '2026-2027',
    subMonth: row.sub_month || '',
    memberCode: row.member_code || '',
    member_code: row.member_code || '',
    address: row.address || '',
    phone: row.phone || '',
    memberId: row.member_id ? Number(row.member_id) : null,
    member_id: row.member_id ? Number(row.member_id) : null,
    transactionId: row.transaction_id || '',
    chequeNo: row.cheque_no || '',
    chqNo: row.cheque_no || '',
    isCheque: !!row.is_cheque,
    inCashBook: !!row.in_cash_book,
    addToCashBook: !!row.add_to_cash_book,
    cashId: row.cash_id ? Number(row.cash_id) : (row.cashId ? Number(row.cashId) : null),
    cash_id: row.cash_id ? Number(row.cash_id) : (row.cashId ? Number(row.cashId) : null),
    contraVrNo: row.contra_vr_no || row.cash_vr_no || '',
    contra_vr_no: row.contra_vr_no || row.cash_vr_no || '',
    cashVrNo: row.cash_vr_no || row.contra_vr_no || '',
    cash_vr_no: row.cash_vr_no || row.contra_vr_no || '',
    isPrinted: !!row.is_printed,
    isCancelled: !!row.is_cancelled,
    notes: row.notes || '',
    _docId: String(row.id)
  };
}

// GET /api/sync/all - Fetch complete database state in one ultra-fast payload
router.get('/all', optionalAuth, async (req: Request, res: Response) => {
  try {
    let transactions: any[] = [];
    let members: any[] = [];
    let bankTransactions: any[] = [];
    let openingMap: Record<string, any> = {};
    let usersList: any[] = [];
    let subtypesConfig: any = null;
    let bankAccountsList: any[] = [];
    let churchInfo: any = null;
    let phoneConfig: any = { enabled: true, prefix: '+91' };
    let churchUpiId = 'ipchoreb@sbi';

    if (isPostgres()) {
      // 1. Transactions
      const txRes = await query('SELECT * FROM transactions ORDER BY date ASC, id ASC');
      transactions = txRes.rows.map(mapTransactionRow);

      // 2. Members
      const memRes = await query('SELECT * FROM members ORDER BY id ASC');
      members = memRes.rows.map(mapMemberRow);

      // 3. Bank Transactions
      const bankRes = await query('SELECT * FROM bank_transactions ORDER BY date ASC, id ASC');
      bankTransactions = bankRes.rows.map(mapBankTxRow);

      // 4. Opening Balances
      const opRes = await query('SELECT * FROM opening_balances ORDER BY financial_year DESC');
      opRes.rows.forEach(r => {
        const fy = r.financial_year;
        const cashVal = Number(r.cash_amount || 0);
        const sbiVal = Number(r.sbi_current_amount || 0);
        const fdVal = Number(r.sbi_fd_amount || 0);
        openingMap[fy] = {
          cash: cashVal,
          sbi: sbiVal,
          sbiCurrent: sbiVal,
          fd: fdVal,
          sbiFd: fdVal,
          startDate: formatDateYMD(r.start_date || '2026-04-01'),
          endDate: formatDateYMD(r.end_date || '2027-03-31'),
          notes: r.notes || '',
          _docId: fy
        };
      });
      // Fallback default
      if (!openingMap['2026-2027']) {
        openingMap['2026-2027'] = { cash: 127005, sbi: 143068.37, sbiCurrent: 143068.37, fd: 108022, sbiFd: 108022, _docId: '2026-2027' };
      }
      if (!openingMap['default']) {
        openingMap['default'] = openingMap['2026-2027'];
      }

      // 5. Users
      const uRes = await query('SELECT id, name, email, role, photo_url, is_active FROM users ORDER BY id ASC');
      usersList = uRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        photoUrl: u.photo_url || '',
        disabled: u.is_active === false,
        _docId: String(u.id)
      }));

      // 6. Bank Accounts
      const baRes = await query('SELECT * FROM bank_accounts ORDER BY id ASC');
      bankAccountsList = baRes.rows.map(b => ({
        id: b.id,
        accountName: b.account_name,
        accountType: b.account_type,
        accountNumber: b.account_number,
        isDefault: !!b.is_default,
        _docId: String(b.id)
      }));

      // 7. Settings
      const setRes = await query('SELECT key, value FROM settings');
      setRes.rows.forEach(s => {
        try {
          const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          if (s.key === 'church_info') churchInfo = parsed;
          if (s.key === 'phone_config') phoneConfig = parsed;
          if (s.key === 'church_upi_id') churchUpiId = parsed?.id || churchUpiId;
        } catch (e) {}
      });

      // 8. Categories
      const catRes = await query('SELECT id, name, type, COALESCE(group_name, \'\') as group_name FROM categories ORDER BY type ASC, group_name ASC, name ASC');
      var categoriesList = catRes.rows;

    } else {
      // Memory Store fallback
      transactions = (memoryStore.transactions || []).map(mapTransactionRow);
      members = (memoryStore.members || []).map(mapMemberRow);
      bankTransactions = (memoryStore.bank_transactions || []).map(mapBankTxRow);
      var categoriesList = memoryStore.categories || [];
      (memoryStore.opening_balances || []).forEach((r: any) => {
        const cashVal = Number(r.cash_amount ?? r.cash ?? 0);
        const sbiVal = Number(r.sbi_current_amount ?? r.sbiCurrent ?? r.sbi ?? 0);
        const fdVal = Number(r.sbi_fd_amount ?? r.sbiFd ?? r.fd ?? 0);
        openingMap[r.financial_year] = {
          cash: cashVal,
          sbi: sbiVal,
          sbiCurrent: sbiVal,
          fd: fdVal,
          sbiFd: fdVal,
          cash_amount: cashVal,
          sbi_current_amount: sbiVal,
          sbi_fd_amount: fdVal,
          _docId: r.financial_year
        };
      });
      if (!openingMap['2026-2027']) {
        openingMap['2026-2027'] = { cash: 127005, sbi: 143068.37, sbiCurrent: 143068.37, fd: 108022, sbiFd: 108022, cash_amount: 127005, sbi_current_amount: 143068.37, sbi_fd_amount: 108022, _docId: '2026-2027' };
      }
      openingMap['default'] = openingMap['2026-2027'];
      usersList = (memoryStore.users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        photoUrl: u.photo_url || '',
        disabled: u.is_active === false,
        _docId: String(u.id)
      }));
    }

    // Default subtypes configuration matching reference_repo
    subtypesConfig = {
      "Ledger": [
        "General Expenses", "Printing and Stationery", "Electricity Expenses Church", "Electricity Expenses Parcenage",
        "Lords Supper Sunday School Expenses", "Salary Pr. T.T.Simon", "Allowance Pr. T.T.Simon", "Church Maintenance",
        "General Body Anniversary Meeting Expenses", "Fasting wednesday Prayer Expenses", "Drinking Water",
        "Church Cleaning Expenses", "Conveyance Expenses", "Suspenses", "Guest Visiting Pastors", "Generator Expenses",
        "Church Building Land Taxes", "IPC Church Registration Membership", "Kerala Water Authority for water Supply"
      ],
      "Charity": ["Charity Paid", "Charity Received"],
      "Other Income": ["Donations", "First fruits", "Anniversary Contributions Received", "Sodari Samajam"],
      "Monthly Meeting": ["Monthly Meeting Collection", "Monthly Meeting Expenses", "General Body / Committee Meeting", "Fasting Prayer Meeting"]
    };

    // Dynamically enrich subtypes configuration from PostgreSQL categories table
    if (categoriesList && categoriesList.length > 0) {
      const dynamicSubtypes: Record<string, string[]> = {
        "Ledger": [],
        "Charity": [],
        "Other Income": [],
        "Monthly Meeting": []
      };

      categoriesList.forEach((c: any) => {
        const name = (c.name || '').trim();
        const grp = (c.group_name || '').trim();
        const type = c.type;
        if (!name || name === '-- None / General --' || name === 'None / General') return;

        if (grp === 'Ledger' || (!grp && type === 'Payment' && !name.toLowerCase().includes('contra') && !name.toLowerCase().includes('charity') && !name.toLowerCase().includes('monthly'))) {
          if (!dynamicSubtypes["Ledger"].includes(name)) dynamicSubtypes["Ledger"].push(name);
        } else if (grp === 'Charity' || name.toLowerCase().includes('charity')) {
          if (!dynamicSubtypes["Charity"].includes(name)) dynamicSubtypes["Charity"].push(name);
        } else if (grp === 'Monthly Meeting' || name.toLowerCase().includes('monthly meeting') || name.toLowerCase().includes('prayer meeting') || name.toLowerCase().includes('committee meeting')) {
          if (!dynamicSubtypes["Monthly Meeting"].includes(name)) dynamicSubtypes["Monthly Meeting"].push(name);
        } else if (grp === 'Other Income' || (!grp && type === 'Receipt' && !name.toLowerCase().includes('subscription') && !name.toLowerCase().includes('offering') && !name.toLowerCase().includes('contra'))) {
          if (!dynamicSubtypes["Other Income"].includes(name)) dynamicSubtypes["Other Income"].push(name);
        } else if (grp && !['Subscription', 'Offering', 'Contra', 'Bank', 'General'].includes(grp)) {
          if (!dynamicSubtypes[grp]) dynamicSubtypes[grp] = [];
          if (!dynamicSubtypes[grp].includes(name)) dynamicSubtypes[grp].push(name);
        }
      });

      if (dynamicSubtypes["Ledger"].length > 0) {
        subtypesConfig["Ledger"] = dynamicSubtypes["Ledger"];
      }
      if (dynamicSubtypes["Other Income"].length > 0) {
        subtypesConfig["Other Income"] = dynamicSubtypes["Other Income"];
      }
      if (dynamicSubtypes["Charity"].length > 0) {
        subtypesConfig["Charity"] = dynamicSubtypes["Charity"];
      }
      if (dynamicSubtypes["Monthly Meeting"].length > 0) {
        subtypesConfig["Monthly Meeting"] = dynamicSubtypes["Monthly Meeting"];
      }
      Object.keys(dynamicSubtypes).forEach(k => {
        if (!subtypesConfig[k] && dynamicSubtypes[k].length > 0) {
          subtypesConfig[k] = dynamicSubtypes[k];
        }
      });
    }

    if (bankAccountsList.length === 0) {
      bankAccountsList = [
        { id: 1, accountName: "State Bank of India", accountType: "Current", isDefault: true, _docId: "1" },
        { id: 2, accountName: "SBI Fixed Deposit", accountType: "Fixed Deposit", isDefault: false, _docId: "2" }
      ];
    }

    let nextReceipt = 6701;
    let nextPayment = 1;
    if (isPostgres()) {
      const nrRes = await query(`
        SELECT voucher_no FROM cash_book WHERE receipt > 0
        UNION ALL
        SELECT voucher_no FROM bank_book WHERE credit > 0
      `);
      let maxR = 6700;
      nrRes.rows.forEach(r => {
        const base = String(r.voucher_no || '').split('/')[0].replace(/\D/g, '');
        const n = parseInt(base, 10);
        if (!isNaN(n) && n >= 6701 && n < 100000 && n > maxR) maxR = n;
      });
      if (maxR >= 6701) nextReceipt = maxR + 1;

      const npRes = await query(`
        SELECT voucher_no FROM cash_book WHERE payment > 0
        UNION ALL
        SELECT voucher_no FROM bank_book WHERE debit > 0
      `);
      let maxP = 0;
      npRes.rows.forEach(r => {
        const base = String(r.voucher_no || '').split('/')[0].replace(/\D/g, '');
        const n = parseInt(base, 10);
        if (!isNaN(n) && n >= 1 && n < 6000 && n > maxP) maxP = n;
      });
      if (maxP >= 1) nextPayment = maxP + 1;
    }

    return res.json({
      success: true,
      nextReceipt,
      nextPayment,
      transactions,
      members,
      categories: categoriesList,
      bank_transactions: bankTransactions,
      opening_balances: openingMap,
      users: usersList,
      suspense_transactions: [],
      settings: {
        subtypes: subtypesConfig,
        bank_accounts: { accounts: bankAccountsList.map(b => b.accountName || b.account_name) },
        subscriptions_sheet: { data: [] },
        churchUpiId: { id: churchUpiId },
        phoneConfig: phoneConfig,
        field_rules: {},
        sidebarOrder: null,
        tabNames: null,
        auto_backup: { enabled: false }
      }
    });

  } catch (err: any) {
    console.error('Error fetching sync state:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sync/transactions/lookup - Quick voucher lookup for edit mode
router.get('/transactions/lookup', optionalAuth, async (req: Request, res: Response) => {
  try {
    const vrVal = String(req.query.vrNo || '').trim();
    const targetId = req.query.id ? Number(req.query.id) : null;
    const entryType = String(req.query.entryType || '').trim().toLowerCase();

    if (!vrVal && !targetId) {
      return res.status(400).json({ success: false, message: 'vrNo or id is required' });
    }

    const isExplicitBank = entryType === 'bank' || vrVal.toLowerCase().endsWith('/b');

    if (isPostgres()) {
      let row = null;
      let splitItems: any[] = [];
      let isBankFound = false;

      // 1. If explicit Bank request, query bank_transactions first!
      if (isExplicitBank) {
        if (targetId && !isNaN(targetId)) {
          const bIdRes = await query('SELECT * FROM bank_transactions WHERE id = $1 LIMIT 1', [targetId]);
          if (bIdRes.rows.length > 0) {
            row = bIdRes.rows[0];
            isBankFound = true;
          }
        }
        if (!row && vrVal && vrVal !== '-' && vrVal !== '--') {
          const bClean = vrVal.replace(/\/b$/i, '').trim();
          const bVrRes = await query(`
            SELECT * FROM bank_transactions
            WHERE vr_no ILIKE $1 OR voucher_no ILIKE $1 OR vr_no ILIKE $2 OR voucher_no ILIKE $2
            ORDER BY id ASC
          `, [vrVal, bClean]);
          if (bVrRes.rows.length > 0) {
            row = bVrRes.rows[0];
            splitItems = bVrRes.rows.map(mapBankTxRow);
            isBankFound = true;
          }
        }
      }

      // 2. Query transactions (Cash) if not already found in bank
      if (!row && entryType !== 'bank') {
        if (targetId && !isNaN(targetId)) {
          const idRes = await query('SELECT * FROM transactions WHERE id = $1 LIMIT 1', [targetId]);
          if (idRes.rows.length > 0) row = idRes.rows[0];
        }

        if (!row && vrVal && vrVal !== '-' && vrVal !== '--') {
          const cleanVr = vrVal.replace(/^[RP]-\s*/i, '').trim();
          const vrRes = await query(`
            SELECT * FROM transactions
            WHERE vr_no ILIKE $1
               OR voucher_no ILIKE $1
               OR vr_no ILIKE $2
               OR voucher_no ILIKE $2
               OR vr_no ILIKE $3
               OR voucher_no ILIKE $3
               OR vr_no ILIKE $4
            ORDER BY id ASC
          `, [vrVal, `R-${cleanVr}`, `P-${cleanVr}`, cleanVr]);

          if (vrRes.rows.length > 0) {
            row = vrRes.rows[0];
            splitItems = vrRes.rows.map(mapTransactionRow);
          }
        }
      }

      // 3. Fallback: query bank_transactions if still not found and wasn't queried as explicit Bank
      if (!row && !isExplicitBank) {
        if (targetId && !isNaN(targetId)) {
          const bIdRes = await query('SELECT * FROM bank_transactions WHERE id = $1 LIMIT 1', [targetId]);
          if (bIdRes.rows.length > 0) {
            row = bIdRes.rows[0];
            isBankFound = true;
          }
        }
        if (!row && vrVal && vrVal !== '-' && vrVal !== '--') {
          const bClean = vrVal.replace(/\/b$/i, '').trim();
          const bVrRes = await query(`
            SELECT * FROM bank_transactions
            WHERE vr_no ILIKE $1 OR voucher_no ILIKE $1 OR vr_no ILIKE $2 OR voucher_no ILIKE $2
            ORDER BY id ASC
          `, [vrVal, bClean]);
          if (bVrRes.rows.length > 0) {
            row = bVrRes.rows[0];
            splitItems = bVrRes.rows.map(mapBankTxRow);
            isBankFound = true;
          }
        }
      }

      if (row) {
        const mapped = isBankFound ? mapBankTxRow(row) : mapTransactionRow(row);
        return res.json({
          success: true,
          found: true,
          tx: mapped,
          splitItems: splitItems.length > 1 ? splitItems : [mapped]
        });
      }

      return res.json({ success: true, found: false });
    } else {
      let tx: any = targetId ? memoryStore.transactions.find((t: any) => t.id === targetId) : null;
      if (!tx && vrVal) {
        tx = memoryStore.transactions.find((t: any) => String(t.vrNo) === vrVal || String(t.voucher_no) === vrVal);
      }
      return res.json({ success: true, found: !!tx, tx });
    }
  } catch (err: any) {
    console.error('Error looking up transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sync/transactions/:id - Fetch single transaction
router.get('/transactions/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawId = parseInt(req.params.id, 10);
    if (isNaN(rawId)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    if (isPostgres()) {
      const txRes = await query('SELECT * FROM transactions WHERE id = $1 LIMIT 1', [rawId]);
      if (txRes.rows.length > 0) {
        return res.json({ success: true, found: true, data: mapTransactionRow(txRes.rows[0]) });
      }
      const bRes = await query('SELECT * FROM bank_transactions WHERE id = $1 LIMIT 1', [rawId]);
      if (bRes.rows.length > 0) {
        return res.json({ success: true, found: true, data: mapBankTxRow(bRes.rows[0]) });
      }
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    } else {
      const tx = memoryStore.transactions.find((t: any) => t.id === rawId);
      if (tx) return res.json({ success: true, found: true, data: tx });
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/transactions - Add new transaction to PostgreSQL
router.post('/transactions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const isReceipt = (data.mode === 'Receipt' || (data.receipt !== undefined && data.receipt !== '' && Number(data.receipt) > 0));
    const amount = parseFloat(data.amount || data.receipt || data.payment || 0);
    const date = data.date || new Date().toISOString().split('T')[0];

    let vrNo = data.vrNo || data.vr_no;
    if (!vrNo || vrNo === '--' || vrNo === 'Auto') {
      if (isReceipt) {
        let maxNum = 6700;
        if (isPostgres()) {
          const vRes = await query("SELECT voucher_no FROM cash_book WHERE receipt > 0 AND voucher_no ~ '^[0-9]+$' AND voucher_no::int >= 6701 AND voucher_no::int < 100000");
          vRes.rows.forEach(r => {
            const n = parseInt(r.voucher_no, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          });
        }
        vrNo = String(maxNum + 1);
      } else {
        let maxNum = 0;
        if (isPostgres()) {
          const vRes = await query("SELECT voucher_no FROM cash_book WHERE payment > 0 AND voucher_no ~ '^[0-9]+$' AND voucher_no::int < 6000");
          vRes.rows.forEach(r => {
            const n = parseInt(r.voucher_no, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          });
        }
        vrNo = String(maxNum + 1);
      }
    }

    let savedItem: any = null;

    if (isPostgres()) {
      let memberId: number | null = null;
      const accName = (data.accountName || '').trim();
      const memCode = (data.memberCode || '').trim();
      if (accName || memCode) {
        const mRes = await query(
          "SELECT id FROM members WHERE (name ILIKE $1 AND $1 <> '') OR (member_code ILIKE $2 AND $2 <> '') LIMIT 1",
          [accName, memCode]
        );
        if (mRes.rows.length > 0) memberId = mRes.rows[0].id;
      }

      let categoryId: number | null = null;
      const catName = (data.category || data.type || data.subType || 'General').trim();
      if (catName) {
        const cRes = await query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
        if (cRes.rows.length > 0) categoryId = cRes.rows[0].id;
      }

      const subMonth = (data.subMonth || data.sub_month || '').trim();
      let bankId: number | null = (data.bankId || data.bank_id) ? Number(data.bankId || data.bank_id) : null;
      const isContra = (
        String(data.type || '').toLowerCase() === 'contra' ||
        String(catName || '').toLowerCase().includes('contra') ||
        String(data.bankSubtype || '').toLowerCase().includes('contra') ||
        String(data.particulars || data.description || '').toLowerCase().includes('cash deposit') ||
        String(data.particulars || data.description || '').toLowerCase().includes('cash withdrawal')
      );

      const typeVal = (data.type || data.category || 'General').trim();
      const subtypeVal = (data.subtype || data.subType || '').trim();
      const entryType = (data.entryType || 'Cash').trim();
      const bankAccount = (data.bankAccount || data.account || 'State Bank of India').trim();
      const bankSubtype = (data.bankSubtype || '').trim();
      const isCheque = !!data.isCheque;
      const chequeNo = (data.chequeNo || data.chqNo || '').trim();
      const memberCode = (data.memberCode || '').trim();
      const address = (data.address || '').trim();
      const phone = (data.phone || '').trim();
      const transactionId = (data.transactionId || '').trim();
      const financialYear = (data.financialYear || '').trim();
      const isPrinted = !!data.isPrinted;
      const isCancelled = !!data.isCancelled;

      const insRes = await query(`
        INSERT INTO cash_book (
          date, voucher_no, member_id, account_name, particulars,
          receipt, payment, category_id, category, type, subtype, sub_month,
          entry_type, bank_account, bank_subtype, is_cheque, cheque_no,
          member_code, address, phone, transaction_id, financial_year,
          is_printed, is_cancelled, bank_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `, [
        date,
        vrNo,
        memberId,
        accName,
        data.particulars || data.description || '',
        isReceipt ? amount : 0,
        !isReceipt ? amount : 0,
        categoryId,
        catName,
        typeVal,
        subtypeVal,
        subMonth,
        entryType,
        bankAccount,
        bankSubtype,
        isCheque,
        chequeNo,
        memberCode,
        address,
        phone,
        transactionId,
        financialYear,
        isPrinted,
        isCancelled,
        bankId
      ]);

      const insertedId = insRes.rows[0].id;

      // Auto-link or create linked bank entry if Contra
      if (isContra) {
        if (!bankId) {
          const existingBank = await query(`
            SELECT id FROM bank_book 
            WHERE (voucher_no = $1 AND $1 <> '' AND $1 <> '--')
               OR (date = $2 AND ABS(credit + debit - $3) < 0.01 AND cash_id IS NULL AND (category ILIKE '%Contra%' OR particulars ILIKE '%Cash%'))
            LIMIT 1
          `, [vrNo, date, amount]);

          if (existingBank.rows.length > 0) {
            bankId = existingBank.rows[0].id;
            await query("UPDATE bank_book SET cash_id = $1 WHERE id = $2", [insertedId, bankId]);
            await query("UPDATE cash_book SET bank_id = $1 WHERE id = $2", [bankId, insertedId]);
          } else {
            const isDeposit = (
              String(data.bankSubtype || '').toLowerCase().includes('deposit') ||
              String(catName).toLowerCase().includes('deposit') ||
              String(data.particulars || '').toLowerCase().includes('cash deposit') ||
              !isReceipt
            );
            const bCredit = isDeposit ? amount : 0;
            const bDebit = !isDeposit ? amount : 0;
            const bParticulars = data.particulars || (isDeposit ? 'Cash Deposit to Bank' : 'Cash Withdrawal from Bank');
            const bAccount = data.bankAccount || 'State Bank of India';
            const bCat = isDeposit ? 'Cash Deposit (Contra)' : 'Cash Withdrawal (Contra)';

            const contraBankVr = data.contraVrNo || data.contra_vr_no || data.bankVrNo || data.bank_vr_no || (vrNo ? (vrNo.endsWith('/B') ? vrNo : `${vrNo}/B`) : '');
            const bRes = await query(`
              INSERT INTO bank_book (
                date, voucher_no, cheque_no, bank_account, member_id, particulars,
                credit, debit, category_id, category, sub_month, cash_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id
            `, [
              date,
              contraBankVr,
              data.chequeNo || '',
              bAccount,
              memberId,
              bParticulars,
              bCredit,
              bDebit,
              categoryId,
              bCat,
              subMonth,
              insertedId
            ]);
            bankId = bRes.rows[0].id;
            await query("UPDATE cash_book SET bank_id = $1 WHERE id = $2", [bankId, insertedId]);
          }
        } else {
          await query("UPDATE bank_book SET cash_id = $1 WHERE id = $2", [insertedId, bankId]);
        }
      }

      const viewRes = await query("SELECT * FROM transactions WHERE id = $1", [insertedId]);
      savedItem = mapTransactionRow(viewRes.rows[0] || insRes.rows[0]);
      if (bankId) {
        savedItem.bankId = bankId;
        savedItem.bank_id = bankId;
      }
    } else {
      const newId = Date.now();
      savedItem = {
        ...data,
        id: newId,
        vrNo,
        amount,
        receipt: isReceipt ? amount : '',
        payment: !isReceipt ? amount : '',
        _docId: String(newId)
      };
      memoryStore.transactions.push(savedItem);
      saveLocalStore();
    }

    return res.status(201).json({ success: true, id: savedItem.id, data: savedItem });
  } catch (err: any) {
    console.error('Error inserting transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sync/transactions/:id - Upsert transaction in PostgreSQL
router.put('/transactions/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const isNumericId = /^\d{1,8}$/.test(rawIdStr);
    const validId = isNumericId ? parseInt(rawIdStr, 10) : null;
    const data = req.body;
    const hasAmount = (data.amount !== undefined || data.receipt !== undefined || data.payment !== undefined);
    const isReceipt = (data.mode === 'Receipt' || (data.receipt !== undefined && data.receipt !== '' && Number(data.receipt) > 0));
    const amount = parseFloat(data.amount || data.receipt || data.payment || 0);

    if (isPostgres()) {
      let uRes = { rows: [] as any[] };

      let memberId: number | null = null;
      const accName = (data.accountName || '').trim();
      const memCode = (data.memberCode || '').trim();
      if (accName || memCode) {
        const mRes = await query(
          "SELECT id FROM members WHERE (name ILIKE $1 AND $1 <> '') OR (member_code ILIKE $2 AND $2 <> '') LIMIT 1",
          [accName, memCode]
        );
        if (mRes.rows.length > 0) memberId = mRes.rows[0].id;
      }

      const subMonth = (data.subMonth || data.sub_month || '').trim();
      const typeVal = (data.type || data.category || 'General').trim();
      const subtypeVal = (data.subtype || data.subType || '').trim();

      // For Ledger entries, category is the ledger account name/subtype
      let catName = (data.category || '').trim();
      if (!catName || catName.toLowerCase() === 'ledger' || catName.toLowerCase() === 'general') {
        catName = (subtypeVal || typeVal || 'General').trim();
      }

      let categoryId: number | null = null;
      if (catName) {
        const cRes = await query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
        if (cRes.rows.length > 0) categoryId = cRes.rows[0].id;
      }

      const entryType = (data.entryType || 'Cash').trim();
      const bankAccount = (data.bankAccount || data.account || 'State Bank of India').trim();
      const bankSubtype = (data.bankSubtype || '').trim();
      const isCheque = !!data.isCheque;
      const chequeNo = (data.chequeNo || data.chqNo || '').trim();
      const memberCode = (data.memberCode || '').trim();
      const address = (data.address || '').trim();
      const phone = (data.phone || '').trim();
      const transactionId = (data.transactionId || '').trim();
      const financialYear = (data.financialYear || '').trim();
      const isPrinted = data.isPrinted !== undefined ? Boolean(data.isPrinted) : (data.is_printed !== undefined ? Boolean(data.is_printed) : (data.printed !== undefined ? Boolean(data.printed) : null));
      const isCancelled = data.isCancelled !== undefined ? Boolean(data.isCancelled) : (data.is_cancelled !== undefined ? Boolean(data.is_cancelled) : null);
      const bankId: number | null = (data.bankId || data.bank_id) ? Number(data.bankId || data.bank_id) : null;

      if (validId) {
        uRes = await query(`
          UPDATE cash_book SET
            date = COALESCE(NULLIF($1, '')::date, date),
            voucher_no = COALESCE(NULLIF($2, ''), voucher_no),
            member_id = COALESCE($3, member_id),
            account_name = COALESCE($4, account_name),
            particulars = COALESCE($5, particulars),
            receipt = CASE WHEN $27 = true THEN $6 ELSE receipt END,
            payment = CASE WHEN $27 = true THEN $7 ELSE payment END,
            category_id = COALESCE($8, category_id),
            category = CASE WHEN $9 <> '' THEN $9 ELSE category END,
            type = CASE WHEN $10 <> '' THEN $10 ELSE type END,
            subtype = CASE WHEN $11 <> '' THEN $11 ELSE subtype END,
            sub_month = COALESCE($12, sub_month),
            entry_type = COALESCE(NULLIF($13, ''), entry_type),
            bank_account = COALESCE(NULLIF($14, ''), bank_account),
            bank_subtype = COALESCE(NULLIF($15, ''), bank_subtype),
            is_cheque = COALESCE($16, is_cheque),
            cheque_no = COALESCE($17, cheque_no),
            member_code = COALESCE($18, member_code),
            address = COALESCE($19, address),
            phone = COALESCE($20, phone),
            transaction_id = COALESCE($21, transaction_id),
            financial_year = COALESCE(NULLIF($22, ''), financial_year),
            is_printed = COALESCE($23, is_printed),
            is_cancelled = COALESCE($24, is_cancelled),
            bank_id = COALESCE($25, bank_id),
            updated_at = NOW()
          WHERE id = $26
          RETURNING *
        `, [
          data.date,
          data.vrNo || data.vr_no,
          memberId,
          accName,
          data.particulars || data.description,
          isReceipt ? amount : 0,
          !isReceipt ? amount : 0,
          categoryId,
          catName,
          typeVal,
          subtypeVal,
          subMonth,
          entryType,
          bankAccount,
          bankSubtype,
          isCheque,
          chequeNo,
          memberCode,
          address,
          phone,
          transactionId,
          financialYear,
          isPrinted,
          isCancelled,
          bankId,
          validId,
          hasAmount
        ]);

        const curBankId = bankId || uRes.rows[0]?.bank_id;
        if (curBankId) {
          const isDeposit = !isReceipt;
          await query(`
            UPDATE bank_book SET
              date = COALESCE(NULLIF($1, '')::date, date),
              voucher_no = COALESCE(NULLIF($2, ''), voucher_no),
              particulars = COALESCE($3, particulars),
              credit = CASE WHEN $4 = true THEN $5 ELSE 0 END,
              debit = CASE WHEN $4 = false THEN $5 ELSE 0 END,
              sub_month = COALESCE($6, sub_month),
              cash_id = $7,
              updated_at = NOW()
            WHERE id = $8
          `, [
            data.date,
            data.vrNo || data.vr_no,
            data.particulars || data.description,
            isDeposit,
            amount,
            subMonth,
            validId,
            curBankId
          ]);
        }
      }

      if (uRes.rows.length === 0) {
        // Insert new cash_book row
        const insRes = await query(`
          INSERT INTO cash_book (
            date, voucher_no, member_id, account_name, particulars,
            receipt, payment, category_id, category, type, subtype, sub_month,
            entry_type, bank_account, bank_subtype, is_cheque, cheque_no,
            member_code, address, phone, transaction_id, financial_year,
            is_printed, is_cancelled, bank_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          ) RETURNING *
        `, [
          data.date || new Date().toISOString().split('T')[0],
          data.vrNo || data.vr_no || '--',
          memberId,
          accName,
          data.particulars || data.description || '',
          isReceipt ? amount : 0,
          !isReceipt ? amount : 0,
          categoryId,
          catName,
          typeVal,
          subtypeVal,
          subMonth,
          entryType,
          bankAccount,
          bankSubtype,
          isCheque,
          chequeNo,
          memberCode,
          address,
          phone,
          transactionId,
          financialYear,
          isPrinted,
          isCancelled,
          bankId
        ]);
        const viewRes = await query("SELECT * FROM transactions WHERE id = $1", [insRes.rows[0].id]);
        return res.json({ success: true, id: insRes.rows[0].id, data: mapTransactionRow(viewRes.rows[0] || insRes.rows[0]) });
      }

      const viewRes = await query("SELECT * FROM transactions WHERE id = $1", [uRes.rows[0].id]);
      return res.json({ success: true, id: uRes.rows[0].id, data: mapTransactionRow(viewRes.rows[0] || uRes.rows[0]) });
    } else {
      const numId = validId || Date.now();
      const idx = memoryStore.transactions.findIndex(t => t.id === numId);
      if (idx !== -1) {
        memoryStore.transactions[idx] = { ...memoryStore.transactions[idx], ...data, id: numId };
      } else {
        memoryStore.transactions.push({ ...data, id: numId });
      }
      saveLocalStore();
      return res.json({ success: true, data: { ...data, id: numId } });
    }
  } catch (err: any) {
    console.error('Error updating transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sync/transactions/:id - Delete transaction from PostgreSQL
router.delete('/transactions/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const validId = /^\d{1,8}$/.test(rawIdStr) ? parseInt(rawIdStr, 10) : null;
    if (isPostgres()) {
      if (validId) {
        const linkedRes = await query("SELECT bank_id FROM cash_book WHERE id = $1", [validId]);
        const linkedBankId = linkedRes.rows[0]?.bank_id;
        if (linkedBankId) {
          await query('DELETE FROM bank_book WHERE id = $1', [linkedBankId]);
        }
        await query('DELETE FROM cash_book WHERE id = $1', [validId]);
      }
    } else {
      if (validId) {
        memoryStore.transactions = memoryStore.transactions.filter(t => t.id !== validId);
        saveLocalStore();
      }
    }
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/bank_transactions - Add bank transaction to PostgreSQL
router.post('/bank_transactions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const bSub = String(data.bankSubtype || data.category || data.type || '').toLowerCase();
    const desc = String(data.particulars || data.description || '').toLowerCase();
    const modeStr = String(data.mode || '').toLowerCase();

    let isReceipt = false;
    if (bSub.includes('cash deposit') || desc.includes('cash deposit')) {
      isReceipt = true;
    } else if (bSub.includes('cash withdrawal') || desc.includes('cash withdrawal')) {
      isReceipt = false;
    } else if (modeStr.includes('receipt') || modeStr.includes('credit') || modeStr.includes('deposit')) {
      isReceipt = true;
    } else if (modeStr.includes('payment') || modeStr.includes('debit') || modeStr.includes('withdrawal')) {
      isReceipt = false;
    } else {
      isReceipt = Number(data.receipt || 0) > 0 || Number(data.credit || 0) > 0;
    }
    const amount = parseFloat(data.amount || data.receipt || data.payment || 0);
    const date = data.date || new Date().toISOString().split('T')[0];

    if (isPostgres()) {
      let memberId: number | null = null;
      let accName = (data.accountName || data.account_name || data.name || '').trim();
      let memCode = (data.memberCode || data.member_code || '').trim();
      let address = (data.address || '').trim();
      let phone = (data.phone || '').trim();
      if (accName || memCode) {
        const mRes = await query(
          "SELECT id, member_code, name, address, phone FROM members WHERE (name ILIKE $1 AND $1 <> '') OR (member_code ILIKE $2 AND $2 <> '') LIMIT 1",
          [accName, memCode]
        );
        if (mRes.rows.length > 0) {
          memberId = mRes.rows[0].id;
          if (!memCode && mRes.rows[0].member_code) memCode = mRes.rows[0].member_code;
          if (!accName && mRes.rows[0].name) accName = mRes.rows[0].name;
          if (!address && mRes.rows[0].address) address = mRes.rows[0].address;
          if (!phone && mRes.rows[0].phone) phone = mRes.rows[0].phone;
        }
      }

      let categoryId: number | null = null;
      const catName = (data.bankSubtype || data.category || data.type || 'Bank').trim();
      if (catName) {
        const cRes = await query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
        if (cRes.rows.length > 0) categoryId = cRes.rows[0].id;
      }

      const subMonth = (data.subMonth || data.sub_month || '').trim();
      const type = (data.type || (isReceipt ? 'Receipt' : 'Payment')).trim();
      const subtype = (data.subtype || data.subType || data.category || '').trim();
      const bankSubtype = (data.bankSubtype || data.bank_subtype || '').trim();
      const entryType = (data.entryType || data.entry_type || 'Bank').trim();
      const bankAccount = (data.bankAccount || data.bank_account || data.account || 'State Bank of India').trim();
      const isCheque = Boolean(data.isCheque || data.is_cheque || data.chequeNo || data.chqNo);
      const chqNo = (data.chequeNo || data.chqNo || '').trim();
      const vrNo = (data.vrNo || data.vr_no || '--').trim();
      const transactionId = (data.transactionId || data.transaction_id || '').trim();
      const financialYear = (data.financialYear || data.financial_year || '2026-2027').trim();
      const isPrinted = Boolean(data.isPrinted || data.is_printed);
      const isCancelled = Boolean(data.isCancelled || data.is_cancelled);
      const particulars = (data.particulars || data.description || '').trim();
      let cashId: number | null = (data.cashId || data.cash_id) ? Number(data.cashId || data.cash_id) : null;
      const isContra = (
        bSub.includes('contra') ||
        desc.includes('cash deposit') ||
        desc.includes('cash withdrawal') ||
        modeStr.includes('contra')
      );

      const insRes = await query(`
        INSERT INTO bank_book (
          date, voucher_no, cheque_no, bank_account, member_id, account_name, particulars,
          credit, debit, category_id, category, type, subtype, bank_subtype,
          sub_month, entry_type, member_code, address, phone, is_cheque,
          transaction_id, financial_year, is_printed, is_cancelled, cash_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25
        )
        RETURNING *
      `, [
        date,
        vrNo,
        chqNo,
        bankAccount,
        memberId,
        accName,
        particulars,
        isReceipt ? amount : 0,
        !isReceipt ? amount : 0,
        categoryId,
        catName,
        type,
        subtype,
        bankSubtype,
        subMonth,
        entryType,
        memCode,
        address,
        phone,
        isCheque,
        transactionId,
        financialYear,
        isPrinted,
        isCancelled,
        cashId
      ]);

      const insertedId = insRes.rows[0].id;

      if (isContra) {
        if (!cashId) {
          const vr = vrNo;
          const existingCash = await query(`
            SELECT id FROM cash_book
            WHERE (voucher_no = $1 AND $1 <> '' AND $1 <> '--')
               OR (date = $2 AND ABS(receipt + payment - $3) < 0.01 AND bank_id IS NULL AND (category ILIKE '%Contra%' OR particulars ILIKE '%Cash%'))
            LIMIT 1
          `, [vr, date, amount]);

          if (existingCash.rows.length > 0) {
            cashId = existingCash.rows[0].id;
            await query("UPDATE cash_book SET bank_id = $1 WHERE id = $2", [insertedId, cashId]);
            await query("UPDATE bank_book SET cash_id = $1 WHERE id = $2", [cashId, insertedId]);
          } else {
            const isDeposit = isReceipt || bSub.includes('deposit') || desc.includes('deposit');
            const cReceipt = !isDeposit ? amount : 0;
            const cPayment = isDeposit ? amount : 0;
            const cParticulars = particulars || (isDeposit ? 'Cash Deposit to Bank' : 'Cash Withdrawal from Bank');
            const cCat = isDeposit ? 'Cash Deposit (Contra)' : 'Cash Withdrawal (Contra)';

            const cRes = await query(`
              INSERT INTO cash_book (
                date, voucher_no, member_id, account_name, particulars,
                receipt, payment, category_id, category, sub_month, bank_id,
                type, subtype, entry_type, bank_account, bank_subtype,
                member_code, address, phone, transaction_id, financial_year
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
              )
              RETURNING id
            `, [
              date,
              data.contraVrNo || data.contra_vr_no || data.cashVrNo || data.cash_vr_no || (vr && vr !== '--' ? vr.replace(/\/B$/i, '') : '--'),
              memberId,
              accName,
              cParticulars,
              cReceipt,
              cPayment,
              categoryId,
              cCat,
              subMonth,
              insertedId,
              isDeposit ? 'Contra' : 'Contra',
              cCat,
              'Cash',
              bankAccount,
              bankSubtype,
              memCode,
              address,
              phone,
              transactionId,
              financialYear
            ]);
            cashId = cRes.rows[0].id;
            await query("UPDATE bank_book SET cash_id = $1 WHERE id = $2", [cashId, insertedId]);
          }
        } else {
          await query("UPDATE cash_book SET bank_id = $1 WHERE id = $2", [insertedId, cashId]);
        }
      }

      const viewRes = await query("SELECT * FROM bank_transactions WHERE id = $1", [insertedId]);
      const savedBank = mapBankTxRow(viewRes.rows[0] || insRes.rows[0]);
      if (cashId) {
        savedBank.cashId = cashId;
        savedBank.cash_id = cashId;
      }
      return res.status(201).json({ success: true, id: insertedId, data: savedBank });
    } else {
      const newId = Date.now();
      const item = { ...data, id: newId, _docId: String(newId) };
      memoryStore.bank_transactions.push(item);
      saveLocalStore();
      return res.status(201).json({ success: true, id: newId, data: item });
    }
  } catch (err: any) {
    console.error('Error inserting bank transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sync/bank_transactions/:id - Upsert bank transaction in PostgreSQL
router.put('/bank_transactions/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const isNumericId = /^\d{1,8}$/.test(rawIdStr);
    const validId = isNumericId ? parseInt(rawIdStr, 10) : null;
    const data = req.body;
    const bSub = String(data.bankSubtype || data.category || data.type || '').toLowerCase();
    const desc = String(data.particulars || data.description || '').toLowerCase();
    const modeStr = String(data.mode || '').toLowerCase();

    let isReceipt = false;
    if (bSub.includes('cash deposit') || desc.includes('cash deposit')) {
      isReceipt = true;
    } else if (bSub.includes('cash withdrawal') || desc.includes('cash withdrawal')) {
      isReceipt = false;
    } else if (modeStr.includes('receipt') || modeStr.includes('credit') || modeStr.includes('deposit')) {
      isReceipt = true;
    } else if (modeStr.includes('payment') || modeStr.includes('debit') || modeStr.includes('withdrawal')) {
      isReceipt = false;
    } else {
      isReceipt = Number(data.receipt || 0) > 0 || Number(data.credit || 0) > 0;
    }
    const hasAmount = (data.amount !== undefined || data.credit !== undefined || data.debit !== undefined || data.receipt !== undefined || data.payment !== undefined);
    const amount = parseFloat(data.amount || data.credit || data.debit || data.receipt || data.payment || 0);
    const date = data.date ? data.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (isPostgres()) {
      let uRes = { rows: [] as any[] };

      let memberId: number | null = null;
      let accName = (data.accountName || data.account_name || data.name || '').trim();
      let memCode = (data.memberCode || data.member_code || '').trim();
      let address = (data.address || '').trim();
      let phone = (data.phone || '').trim();
      if (accName || memCode) {
        const mRes = await query(
          "SELECT id, member_code, name, address, phone FROM members WHERE (name ILIKE $1 AND $1 <> '') OR (member_code ILIKE $2 AND $2 <> '') LIMIT 1",
          [accName, memCode]
        );
        if (mRes.rows.length > 0) {
          memberId = mRes.rows[0].id;
          if (!memCode && mRes.rows[0].member_code) memCode = mRes.rows[0].member_code;
          if (!accName && mRes.rows[0].name) accName = mRes.rows[0].name;
          if (!address && mRes.rows[0].address) address = mRes.rows[0].address;
          if (!phone && mRes.rows[0].phone) phone = mRes.rows[0].phone;
        }
      }

      let categoryId: number | null = null;
      let catName = (data.category || data.type || 'Bank').trim();
      const subtype = (data.subtype || data.subType || '').trim();
      if ((!catName || catName.toLowerCase() === 'bank' || catName.toLowerCase() === 'ledger') && subtype) {
        catName = subtype;
      }
      if (catName) {
        const cRes = await query("SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1", [catName]);
        if (cRes.rows.length > 0) categoryId = cRes.rows[0].id;
      }

      const subMonth = (data.subMonth || data.sub_month || '').trim();
      const type = (data.type || (isReceipt ? 'Receipt' : 'Payment')).trim();
      const bankSubtype = (data.bankSubtype || data.bank_subtype || '').trim();
      const entryType = (data.entryType || data.entry_type || 'Bank').trim();
      const bankAccount = (data.bankAccount || data.bank_account || data.account || 'State Bank of India').trim();
      const isCheque = Boolean(data.isCheque || data.is_cheque || data.chequeNo || data.chqNo);
      const chqNo = (data.chequeNo || data.chqNo || '').trim();
      const vrNo = (data.vrNo || data.vr_no || '--').trim();
      const transactionId = (data.transactionId || data.transaction_id || '').trim();
      const financialYear = (data.financialYear || data.financial_year || '2026-2027').trim();
      const isPrinted = data.isPrinted !== undefined ? Boolean(data.isPrinted) : (data.is_printed !== undefined ? Boolean(data.is_printed) : (data.printed !== undefined ? Boolean(data.printed) : null));
      const isCancelled = data.isCancelled !== undefined ? Boolean(data.isCancelled) : (data.is_cancelled !== undefined ? Boolean(data.is_cancelled) : null);
      const particulars = (data.particulars || data.description || '').trim();
      let cashId: number | null = (data.cashId || data.cash_id) ? Number(data.cashId || data.cash_id) : null;

      if (validId) {
        uRes = await query(`
          UPDATE bank_book SET
            date = COALESCE(NULLIF($1, '')::date, date),
            voucher_no = COALESCE(NULLIF($2, ''), voucher_no),
            cheque_no = COALESCE($3, cheque_no),
            bank_account = COALESCE(NULLIF($4, ''), bank_account),
            member_id = COALESCE($5, member_id),
            account_name = COALESCE($6, account_name),
            particulars = COALESCE($7, particulars),
            credit = CASE WHEN $27 = true THEN $8 ELSE credit END,
            debit = CASE WHEN $27 = true THEN $9 ELSE debit END,
            category_id = COALESCE($10, category_id),
            category = CASE WHEN $11 <> '' THEN $11 ELSE category END,
            type = CASE WHEN $12 <> '' THEN $12 ELSE type END,
            subtype = CASE WHEN $13 <> '' THEN $13 ELSE subtype END,
            bank_subtype = CASE WHEN $14 <> '' THEN $14 ELSE bank_subtype END,
            sub_month = COALESCE($15, sub_month),
            entry_type = COALESCE(NULLIF($16, ''), entry_type),
            member_code = COALESCE($17, member_code),
            address = COALESCE($18, address),
            phone = COALESCE($19, phone),
            is_cheque = COALESCE($20, is_cheque),
            transaction_id = COALESCE($21, transaction_id),
            financial_year = COALESCE(NULLIF($22, ''), financial_year),
            is_printed = COALESCE($23, is_printed),
            is_cancelled = COALESCE($24, is_cancelled),
            cash_id = COALESCE($25, cash_id),
            updated_at = NOW()
          WHERE id = $26
          RETURNING *
        `, [
          date,
          vrNo,
          chqNo,
          bankAccount,
          memberId,
          accName,
          particulars,
          isReceipt ? amount : 0,
          !isReceipt ? amount : 0,
          categoryId,
          catName,
          type,
          subtype,
          bankSubtype,
          subMonth,
          entryType,
          memCode,
          address,
          phone,
          isCheque,
          transactionId,
          financialYear,
          isPrinted,
          isCancelled,
          cashId,
          validId,
          hasAmount
        ]);

        const curCashId = cashId || uRes.rows[0]?.cash_id;
        if (curCashId) {
          const isDeposit = isReceipt;
          await query(`
            UPDATE cash_book SET
              date = COALESCE(NULLIF($1, '')::date, date),
              voucher_no = COALESCE($2, voucher_no),
              particulars = COALESCE($3, particulars),
              payment = CASE WHEN $4 = true THEN $5 ELSE 0 END,
              receipt = CASE WHEN $4 = false THEN $5 ELSE 0 END,
              sub_month = COALESCE($6, sub_month),
              bank_id = $7,
              updated_at = NOW()
            WHERE id = $8
          `, [
            date,
            vrNo,
            particulars,
            isDeposit,
            amount,
            subMonth,
            validId,
            curCashId
          ]);
        }
      }

      if (uRes.rows.length === 0) {
        const insRes = await query(`
          INSERT INTO bank_book (
            date, voucher_no, cheque_no, bank_account, member_id, account_name, particulars,
            credit, debit, category_id, category, type, subtype, bank_subtype,
            sub_month, entry_type, member_code, address, phone, is_cheque,
            transaction_id, financial_year, is_printed, is_cancelled, cash_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25
          )
          RETURNING *
        `, [
          date,
          vrNo,
          chqNo,
          bankAccount,
          memberId,
          accName,
          particulars,
          isReceipt ? amount : 0,
          !isReceipt ? amount : 0,
          categoryId,
          catName,
          type,
          subtype,
          bankSubtype,
          subMonth,
          entryType,
          memCode,
          address,
          phone,
          isCheque,
          transactionId,
          financialYear,
          isPrinted,
          isCancelled,
          cashId
        ]);
        const viewRes = await query("SELECT * FROM bank_transactions WHERE id = $1", [insRes.rows[0].id]);
        return res.json({ success: true, id: insRes.rows[0].id, data: mapBankTxRow(viewRes.rows[0] || insRes.rows[0]) });
      }

      const viewRes = await query("SELECT * FROM bank_transactions WHERE id = $1", [uRes.rows[0].id]);
      return res.json({ success: true, id: uRes.rows[0].id, data: mapBankTxRow(viewRes.rows[0] || uRes.rows[0]) });
    } else {
      const numId = validId || Date.now();
      const idx = memoryStore.bank_transactions.findIndex(b => b.id === numId);
      if (idx !== -1) {
        memoryStore.bank_transactions[idx] = { ...memoryStore.bank_transactions[idx], ...data, id: numId };
      } else {
        memoryStore.bank_transactions.push({ ...data, id: numId });
      }
      saveLocalStore();
      return res.json({ success: true, data: { ...data, id: numId } });
    }
  } catch (err: any) {
    console.error('Error updating bank transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sync/bank_transactions/:id - Delete bank transaction from PostgreSQL
router.delete('/bank_transactions/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const validId = /^\d{1,8}$/.test(rawIdStr) ? parseInt(rawIdStr, 10) : null;
    if (isPostgres()) {
      if (validId) {
        const linkedRes = await query("SELECT cash_id FROM bank_book WHERE id = $1", [validId]);
        const linkedCashId = linkedRes.rows[0]?.cash_id;
        if (linkedCashId) {
          await query('DELETE FROM cash_book WHERE id = $1', [linkedCashId]);
        }
        await query('DELETE FROM bank_book WHERE id = $1', [validId]);
      }
    } else {
      if (validId) {
        memoryStore.bank_transactions = memoryStore.bank_transactions.filter(t => t.id !== validId);
        saveLocalStore();
      }
    }
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting bank transaction:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/members - Add member to PostgreSQL
router.post('/members', optionalAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let code = data.code || data.memberCode;
    if (isPostgres()) {
      if (!code) {
        const cRes = await query("SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '\\D', '', 'g'), '')::int), 0) as max_num FROM members WHERE length(regexp_replace(member_code, '\\D', '', 'g')) <= 6");
        const nextNum = (cRes.rows[0]?.max_num || 0) + 1;
        code = `H${nextNum}`;
      }

      const cleanTitle = (data.title || '').trim();
      let cleanName = (data.name || '').trim();
      cleanName = cleanName.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();

      const insRes = await query(`
        INSERT INTO members (member_code, title, nickname, name, address, phone, is_active, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        code,
        cleanTitle,
        data.nickname || '',
        cleanName,
        data.address || '',
        data.phone || '',
        data.status !== 'Inactive' && data.status !== 'No',
        (data.status === 'No' || data.status === 'Inactive') ? 'Inactive' : 'Active'
      ]);

      const item = mapMemberRow(insRes.rows[0]);
      return res.status(201).json({ success: true, id: item.id, data: item });
    } else {
      const newId = Date.now();
      const codeStr = code || `H${memoryStore.members.length + 1}`;
      const item = { ...data, id: newId, code: codeStr, memberCode: codeStr, _docId: String(newId) };
      memoryStore.members.push(item);
      saveLocalStore();
      return res.status(201).json({ success: true, id: newId, data: item });
    }
  } catch (err: any) {
    console.error('Error inserting member:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sync/members/:id - Update or Upsert member in PostgreSQL
router.put('/members/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const isNumericId = /^\d{1,8}$/.test(rawIdStr);
    const validId = isNumericId ? parseInt(rawIdStr, 10) : null;
    const data = req.body;

    const cleanTitle = (data.title !== undefined) ? String(data.title).trim() : undefined;
    let cleanName = (data.name !== undefined) ? String(data.name).trim() : undefined;
    if (cleanName) {
      cleanName = cleanName.replace(/^(Br|Sr|Pr|Evg|Bro|Brother|Sister|Sis|Pastor|Evangelist)\.?\s+/i, '').trim();
    }

    if (isPostgres()) {
      let uRes = { rows: [] as any[] };
      if (validId) {
        uRes = await query(`
          UPDATE members SET
            name = COALESCE($1, name),
            title = COALESCE($2, title),
            nickname = COALESCE($3, nickname),
            address = COALESCE($4, address),
            phone = COALESCE($5, phone),
            member_code = COALESCE($6, member_code),
            status = COALESCE($7, status),
            is_active = COALESCE($8, is_active),
            updated_at = NOW()
          WHERE id = $9
          RETURNING *
        `, [
          cleanName,
          cleanTitle,
          data.nickname,
          data.address,
          data.phone,
          data.code || data.memberCode,
          data.status ? ((data.status === 'No' || data.status === 'Inactive') ? 'Inactive' : 'Active') : undefined,
          data.status ? (data.status !== 'Inactive' && data.status !== 'No') : undefined,
          validId
        ]);
      }

      if (uRes.rows.length === 0) {
        // Upsert as new member
        let code = data.code || data.memberCode;
        if (!code) {
          const cRes = await query("SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '\\D', '', 'g'), '')::int), 0) as max_num FROM members WHERE length(regexp_replace(member_code, '\\D', '', 'g')) <= 6");
          const nextNum = (cRes.rows[0]?.max_num || 0) + 1;
          code = `H${nextNum}`;
        }

        const insRes = await query(`
          INSERT INTO members (member_code, title, nickname, name, address, phone, is_active, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          code,
          cleanTitle || '',
          data.nickname || '',
          cleanName || '',
          data.address || '',
          data.phone || '',
          data.status !== 'Inactive' && data.status !== 'No',
          (data.status === 'No' || data.status === 'Inactive') ? 'Inactive' : 'Active'
        ]);
        return res.json({ success: true, id: insRes.rows[0].id, data: mapMemberRow(insRes.rows[0]) });
      }

      return res.json({ success: true, id: uRes.rows[0].id, data: mapMemberRow(uRes.rows[0]) });
    } else {
      const numId = validId || Date.now();
      const idx = memoryStore.members.findIndex(m => m.id === numId);
      if (idx !== -1) {
        memoryStore.members[idx] = { ...memoryStore.members[idx], ...data, id: numId };
      } else {
        memoryStore.members.push({ ...data, id: numId });
      }
      saveLocalStore();
      return res.json({ success: true, data: { ...data, id: numId } });
    }
  } catch (err: any) {
    console.error('Error updating member:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sync/members/:id
router.delete('/members/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawIdStr = String(req.params.id);
    const validId = /^\d{1,8}$/.test(rawIdStr) ? parseInt(rawIdStr, 10) : null;
    if (isPostgres()) {
      if (validId) {
        await query('DELETE FROM members WHERE id = $1', [validId]);
      }
    } else {
      if (validId) {
        memoryStore.members = memoryStore.members.filter(m => m.id !== validId);
        saveLocalStore();
      }
    }
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting member:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/settings/:docId - Update setting document in PostgreSQL & sync bank_accounts
router.post('/settings/:docId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const docId = req.params.docId;
    const data = req.body;
    if (isPostgres()) {
      await query(`
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [docId, JSON.stringify(data)]);

      // If updating bank_accounts, sync directly to PostgreSQL bank_accounts table
      if (docId === 'bank_accounts' && Array.isArray(data.accounts)) {
        const accountNames = data.accounts.map((a: any) =>
          (typeof a === 'string' ? a : (a.accountName || a.account_name || '')).trim()
        ).filter(Boolean);

        for (const name of accountNames) {
          await query(`
            INSERT INTO bank_accounts (account_name, account_type, bank_name, is_default)
            VALUES ($1, 'Current', $1, false)
            ON CONFLICT (account_name) DO NOTHING
          `, [name]);
        }

        // Clean up removed bank accounts if safe (not referenced in bank_book)
        if (accountNames.length > 0) {
          const placeholders = accountNames.map((_, i) => `$${i + 1}`).join(', ');
          await query(`
            DELETE FROM bank_accounts 
            WHERE account_name NOT IN (${placeholders})
            AND account_name NOT IN (SELECT DISTINCT bank_account FROM bank_book WHERE bank_account IS NOT NULL)
          `, accountNames).catch(e => console.warn('Could not cleanup removed bank accounts:', e.message));
        }
      }

    } else {
      memoryStore.settings[docId] = data;
      if (docId === 'bank_accounts' && Array.isArray(data.accounts)) {
        if (!memoryStore.bank_accounts) memoryStore.bank_accounts = [];
        data.accounts.forEach((a: any) => {
          const name = (typeof a === 'string' ? a : (a.accountName || a.account_name || '')).trim();
          if (name && !memoryStore.bank_accounts.some((b: any) => (b.account_name || b.accountName) === name)) {
            memoryStore.bank_accounts.push({ id: Date.now(), account_name: name, accountName: name });
          }
        });
      }
      saveLocalStore();
    }
    return res.json({ success: true, docId, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sync/categories
router.get('/categories', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query('SELECT id, name, type, COALESCE(group_name, \'\') as group_name FROM categories ORDER BY type ASC, group_name ASC, name ASC');
      return res.json({ success: true, count: result.rows.length, categories: result.rows, data: result.rows });
    } else {
      const cats = memoryStore.categories || [];
      return res.json({ success: true, count: cats.length, categories: cats, data: cats });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sync/categories
router.post('/categories', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { name, type, group_name } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Category name and type are required' });
    }
    const cleanName = String(name).trim();
    const cleanType = String(type).trim();
    const cleanGroup = String(group_name || '').trim();

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO categories (name, type, group_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (name, type) DO UPDATE SET group_name = EXCLUDED.group_name, updated_at = NOW()
        RETURNING id, name, type, COALESCE(group_name, '') as group_name
      `, [cleanName, cleanType, cleanGroup]);
      return res.json({ success: true, category: result.rows[0], data: result.rows[0] });
    } else {
      if (!memoryStore.categories) memoryStore.categories = [];
      const newCat = { id: Date.now(), name: cleanName, type: cleanType, group_name: cleanGroup };
      memoryStore.categories.push(newCat);
      saveLocalStore();
      return res.json({ success: true, category: newCat, data: newCat });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sync/categories/:id
router.put('/categories/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, type, group_name } = req.body;
    if (!id || !name || !type) {
      return res.status(400).json({ success: false, message: 'Valid id, name and type are required' });
    }
    const cleanName = String(name).trim();
    const cleanType = String(type).trim();
    const cleanGroup = String(group_name || '').trim();

    if (isPostgres()) {
      const result = await query(`
        UPDATE categories 
        SET name = $1, type = $2, group_name = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, type, COALESCE(group_name, '') as group_name
      `, [cleanName, cleanType, cleanGroup, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      return res.json({ success: true, category: result.rows[0], data: result.rows[0] });
    } else {
      if (!memoryStore.categories) memoryStore.categories = [];
      const idx = memoryStore.categories.findIndex((c: any) => c.id === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Category not found' });
      memoryStore.categories[idx] = { ...memoryStore.categories[idx], name: cleanName, type: cleanType, group_name: cleanGroup };
      saveLocalStore();
      return res.json({ success: true, category: memoryStore.categories[idx], data: memoryStore.categories[idx] });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sync/categories/:id
router.delete('/categories/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Valid id is required' });

    if (isPostgres()) {
      await query('DELETE FROM categories WHERE id = $1', [id]);
    } else {
      if (!memoryStore.categories) memoryStore.categories = [];
      memoryStore.categories = memoryStore.categories.filter((c: any) => c.id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
