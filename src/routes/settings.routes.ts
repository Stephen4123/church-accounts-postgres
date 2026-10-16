import { Router, Response } from 'express';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/settings/subtypes
router.get('/subtypes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query('SELECT * FROM subtypes WHERE is_active = true ORDER BY category, sort_order, id ASC');
      return res.json({ success: true, subtypes: result.rows });
    }
    const active = memoryStore.subtypes.filter(s => s.is_active !== false);
    return res.json({ success: true, subtypes: active });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/subtypes
router.post('/subtypes', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, name, code, sort_order = 0 } = req.body;
    if (!category || !name) {
      return res.status(400).json({ success: false, message: 'Category and name are required' });
    }

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO subtypes (category, name, code, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [category, name.trim(), code || '', sort_order]);
      return res.status(201).json({ success: true, subtype: result.rows[0] });
    }

    const newSub = {
      id: Date.now(),
      category,
      name: name.trim(),
      code: code || '',
      sort_order,
      is_active: true
    };
    memoryStore.subtypes.push(newSub);
    saveLocalStore();
    return res.status(201).json({ success: true, subtype: newSub });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/bank-accounts
router.get('/bank-accounts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query('SELECT * FROM bank_accounts ORDER BY id ASC');
      return res.json({ success: true, bankAccounts: result.rows });
    }
    return res.json({ success: true, bankAccounts: memoryStore.bank_accounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/bank-accounts
router.post('/bank-accounts', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { account_name, account_type = 'Current', account_number = '', bank_name = 'State Bank of India', branch = '', is_default = false } = req.body;
    if (!account_name) {
      return res.status(400).json({ success: false, message: 'Account name is required' });
    }

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO bank_accounts (account_name, account_type, account_number, bank_name, branch, is_default)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [account_name.trim(), account_type, account_number, bank_name, branch, is_default]);
      return res.status(201).json({ success: true, bankAccount: result.rows[0] });
    }

    const newBank = {
      id: Date.now(),
      account_name: account_name.trim(),
      account_type,
      account_number,
      bank_name,
      branch,
      is_default
    };
    memoryStore.bank_accounts.push(newBank);
    saveLocalStore();
    return res.status(201).json({ success: true, bankAccount: newBank });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/opening-balances
router.get('/opening-balances', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query('SELECT * FROM opening_balances ORDER BY financial_year DESC');
      return res.json({ success: true, openingBalances: result.rows });
    }
    return res.json({ success: true, openingBalances: memoryStore.opening_balances });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/opening-balances
router.post('/opening-balances', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const financial_year = req.body.financial_year || req.body.financialYear;
    const cash_amount = Number(req.body.cash_amount ?? req.body.cash ?? 0);
    const sbi_current_amount = Number(req.body.sbi_current_amount ?? req.body.sbiCurrent ?? req.body.sbi ?? 0);
    const sbi_fd_amount = Number(req.body.sbi_fd_amount ?? req.body.sbiFd ?? req.body.fd ?? 0);
    const start_date = req.body.start_date || req.body.startDate;
    const end_date = req.body.end_date || req.body.endDate;
    const notes = req.body.notes || '';
    if (!financial_year) {
      return res.status(400).json({ success: false, message: 'Financial year required' });
    }

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO opening_balances (financial_year, start_date, end_date, cash_amount, sbi_current_amount, sbi_fd_amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (financial_year) DO UPDATE SET
          cash_amount = EXCLUDED.cash_amount,
          sbi_current_amount = EXCLUDED.sbi_current_amount,
          sbi_fd_amount = EXCLUDED.sbi_fd_amount,
          notes = EXCLUDED.notes
        RETURNING *
      `, [financial_year, start_date || `${financial_year.split('-')[0]}-04-01`, end_date || `${parseInt(financial_year.split('-')[0]) + 1}-03-31`, cash_amount, sbi_current_amount, sbi_fd_amount, notes]);
      return res.json({ success: true, openingBalance: result.rows[0] });
    }

    const idx = memoryStore.opening_balances.findIndex(o => o.financial_year === financial_year);
    const item = {
      id: idx !== -1 ? memoryStore.opening_balances[idx].id : Date.now(),
      financial_year,
      start_date: start_date || `${financial_year.split('-')[0]}-04-01`,
      end_date: end_date || `${parseInt(financial_year.split('-')[0]) + 1}-03-31`,
      cash_amount,
      sbi_current_amount,
      sbi_fd_amount,
      notes
    };
    if (idx !== -1) {
      memoryStore.opening_balances[idx] = item;
    } else {
      memoryStore.opening_balances.push(item);
    }
    saveLocalStore();

    return res.json({ success: true, openingBalance: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/info
router.get('/info', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query("SELECT value FROM settings WHERE key = 'church_info'");
      if (result.rows.length > 0) {
        return res.json({ success: true, churchInfo: result.rows[0].value });
      }
    }
    return res.json({
      success: true,
      churchInfo: memoryStore.settings['church_info'] || {
        name: 'IPC HOREB CHURCH',
        subtitle: 'Accounts & Financial Management System',
        upi_id: 'ipchoreb@sbi',
        phone: '+91 98470 12345',
        address: 'Horeb Nagar, Kerala'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
