import { Router, Response } from 'express';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/bank/transactions
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { account, startDate, endDate, search } = req.query;

    let sql = 'SELECT * FROM bank_transactions WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (account) {
      sql += ` AND account = $${pIdx++}`;
      params.push(account);
    }
    if (startDate) {
      sql += ` AND date >= $${pIdx++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND date <= $${pIdx++}`;
      params.push(endDate);
    }
    if (search) {
      sql += ` AND (description ILIKE $${pIdx} OR vr_no ILIKE $${pIdx} OR cheque_no ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    sql += ' ORDER BY date DESC, id DESC';

    if (isPostgres()) {
      const result = await query(sql, params);
      return res.json({ success: true, transactions: result.rows });
    }

    let list = [...memoryStore.bank_transactions];
    if (account) {
      list = list.filter(b => b.account === account);
    }
    if (startDate) {
      list = list.filter(b => b.date >= (startDate as string));
    }
    if (endDate) {
      list = list.filter(b => b.date <= (endDate as string));
    }
    if (search) {
      const s = (search as string).toLowerCase();
      list = list.filter(b =>
        (b.description || '').toLowerCase().includes(s) ||
        (b.vr_no || '').toLowerCase().includes(s) ||
        (b.cheque_no || '').toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id || 0) - (a.id || 0));
    return res.json({ success: true, transactions: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bank/summary (Balances for SBI Current, SBI FD, and Total Bank Balance)
router.get('/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let openingSbi = 0;
    let openingFd = 0;

    if (isPostgres()) {
      const opRes = await query('SELECT sbi_current_amount, sbi_fd_amount FROM opening_balances ORDER BY id DESC LIMIT 1');
      if (opRes.rows.length > 0) {
        openingSbi = parseFloat(opRes.rows[0].sbi_current_amount) || 0;
        openingFd = parseFloat(opRes.rows[0].sbi_fd_amount) || 0;
      }

      const txRes = await query('SELECT account, mode, amount FROM bank_transactions');
      let currentSbi = openingSbi;
      let currentFd = openingFd;

      for (const row of txRes.rows) {
        const amt = parseFloat(row.amount) || 0;
        const isReceipt = String(row.mode).includes('Receipt') || String(row.mode).includes('Deposit') || String(row.mode).includes('Credit');
        const acc = String(row.account).toLowerCase();

        if (acc.includes('fixed deposit') || acc.includes('fd')) {
          currentFd += isReceipt ? amt : -amt;
        } else {
          currentSbi += isReceipt ? amt : -amt;
        }
      }

      return res.json({
        success: true,
        sbiCurrentBalance: currentSbi,
        sbiFdBalance: currentFd,
        totalBankBalance: currentSbi + currentFd,
        openingSbi,
        openingFd
      });
    }

    const op = memoryStore.opening_balances[memoryStore.opening_balances.length - 1];
    openingSbi = op ? Number(op.sbi_current_amount || 0) : 0;
    openingFd = op ? Number(op.sbi_fd_amount || 0) : 0;

    let currentSbi = openingSbi;
    let currentFd = openingFd;

    for (const b of memoryStore.bank_transactions) {
      const amt = Number(b.amount || 0);
      const isReceipt = String(b.mode).includes('Receipt') || String(b.mode).includes('Deposit') || String(b.mode).includes('Credit');
      const acc = String(b.account).toLowerCase();

      if (acc.includes('fixed deposit') || acc.includes('fd')) {
        currentFd += isReceipt ? amt : -amt;
      } else {
        currentSbi += isReceipt ? amt : -amt;
      }
    }

    return res.json({
      success: true,
      sbiCurrentBalance: currentSbi,
      sbiFdBalance: currentFd,
      totalBankBalance: currentSbi + currentFd,
      openingSbi,
      openingFd
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bank/transactions (Direct bank voucher / adjustment)
router.post('/transactions', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, mode, account = 'State Bank of India', amount, description, cheque_no, vr_no } = req.body;
    const numAmount = parseFloat(String(amount).replace(/,/g, '')) || 0;

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required' });
    }

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO bank_transactions (date, mode, account, amount, description, cheque_no, vr_no)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [date, mode, account, numAmount, description, cheque_no, vr_no || '']);
      return res.status(201).json({ success: true, transaction: result.rows[0] });
    }

    const newTx = {
      id: Date.now(),
      date,
      mode,
      account,
      amount: numAmount,
      description,
      cheque_no,
      vr_no: vr_no || '',
      created_at: new Date()
    };
    memoryStore.bank_transactions.push(newTx);
    saveLocalStore();
    return res.status(201).json({ success: true, transaction: newTx });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/bank/transactions/:id
router.delete('/transactions/:id', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('DELETE FROM bank_transactions WHERE id = $1', [id]);
    } else {
      memoryStore.bank_transactions = memoryStore.bank_transactions.filter(b => b.id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Bank entry removed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
