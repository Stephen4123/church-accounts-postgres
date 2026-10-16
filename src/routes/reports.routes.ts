import { Router, Response } from 'express';
import { query, isPostgres, memoryStore } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

// GET /api/reports/dashboard (Calculates all balances, reserves, surplus/deficit, income vs expense)
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { financialYear = '2026-2027' } = req.query;

    let opCash = 0;
    let opSbi = 0;
    let opFd = 0;

    let transactions: any[] = [];
    let bankTransactions: any[] = [];

    if (isPostgres()) {
      const opRes = await query('SELECT * FROM opening_balances WHERE financial_year = $1', [financialYear]);
      if (opRes.rows.length > 0) {
        opCash = parseFloat(opRes.rows[0].cash_amount) || 0;
        opSbi = parseFloat(opRes.rows[0].sbi_current_amount) || 0;
        opFd = parseFloat(opRes.rows[0].sbi_fd_amount) || 0;
      }

      const txRes = await query('SELECT * FROM transactions WHERE is_cancelled = false ORDER BY date ASC, id ASC');
      transactions = txRes.rows;

      const bRes = await query('SELECT * FROM bank_transactions ORDER BY date ASC, id ASC');
      bankTransactions = bRes.rows;
    } else {
      const op = memoryStore.opening_balances.find(o => o.financial_year === financialYear) || memoryStore.opening_balances[0];
      if (op) {
        opCash = Number(op.cash_amount || 0);
        opSbi = Number(op.sbi_current_amount || 0);
        opFd = Number(op.sbi_fd_amount || 0);
      }
      transactions = memoryStore.transactions.filter(t => !t.is_cancelled);
      bankTransactions = [...memoryStore.bank_transactions];
    }

    // 1. Calculate Cash In Hand
    let cashHand = opCash;
    let totalCashReceipts = 0;
    let totalCashPayments = 0;

    for (const tx of transactions) {
      const r = parseFloat(tx.receipt_amount || (tx.mode === 'Receipt' ? tx.amount : 0)) || 0;
      const p = parseFloat(tx.payment_amount || (tx.mode === 'Payment' ? tx.amount : 0)) || 0;
      totalCashReceipts += r;
      totalCashPayments += p;
      cashHand += (r - p);
    }

    // 2. Calculate Bank Balances
    let sbiCurrentBal = opSbi;
    let sbiFdBal = opFd;
    let totalBankDeposits = 0;
    let totalBankWithdrawals = 0;

    for (const b of bankTransactions) {
      const amt = parseFloat(b.amount) || 0;
      const isReceipt = String(b.mode).includes('Receipt') || String(b.mode).includes('Deposit') || String(b.mode).includes('Credit');
      const acc = String(b.account).toLowerCase();

      if (isReceipt) totalBankDeposits += amt;
      else totalBankWithdrawals += amt;

      if (acc.includes('fixed deposit') || acc.includes('fd')) {
        sbiFdBal += isReceipt ? amt : -amt;
      } else {
        sbiCurrentBal += isReceipt ? amt : -amt;
      }
    }

    const totalBankBalance = sbiCurrentBal + sbiFdBal;
    const totalReserves = cashHand + totalBankBalance;

    // 3. Income & Expenditure breakdown (excluding contra transfers)
    const incomeCategories: Record<string, number> = {};
    const expenseCategories: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenditure = 0;

    for (const tx of transactions) {
      const isContra = tx.type === 'Contra' || 
                       (tx.subtype && tx.subtype.toLowerCase().includes('contra')) || 
                       (tx.bank_subtype && tx.bank_subtype.toLowerCase().includes('contra'));
      if (isContra) continue;

      const amt = parseFloat(tx.amount) || 0;
      const sub = tx.subtype || 'Other';

      if (tx.mode === 'Receipt') {
        incomeCategories[sub] = (incomeCategories[sub] || 0) + amt;
        totalIncome += amt;
      } else if (tx.mode === 'Payment') {
        expenseCategories[sub] = (expenseCategories[sub] || 0) + amt;
        totalExpenditure += amt;
      }
    }

    const netSurplus = totalIncome - totalExpenditure;

    return res.json({
      success: true,
      financialYear,
      balances: {
        cashInHand: cashHand,
        sbiCurrent: sbiCurrentBal,
        sbiFd: sbiFdBal,
        totalBankBalance,
        totalReserves,
        closingBalance: totalReserves,
        openingBalances: {
          cash: opCash,
          sbiCurrent: opSbi,
          sbiFd: opFd,
          total: opCash + opSbi + opFd
        }
      },
      pnl: {
        totalIncome,
        totalExpenditure,
        netSurplus,
        incomeCategories,
        expenseCategories
      },
      cashFlow: {
        totalCashReceipts,
        totalCashPayments,
        totalBankDeposits,
        totalBankWithdrawals
      },
      recentTransactions: transactions.slice(-10).reverse()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/cashbook (With running balance)
router.get('/cashbook', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, financialYear = '2026-2027' } = req.query;

    let opCash = 0;
    if (isPostgres()) {
      const op = await query('SELECT cash_amount FROM opening_balances WHERE financial_year = $1', [financialYear]);
      if (op.rows.length > 0) opCash = parseFloat(op.rows[0].cash_amount) || 0;
    } else {
      const op = memoryStore.opening_balances.find(o => o.financial_year === financialYear);
      if (op) opCash = Number(op.cash_amount || 0);
    }

    let allTx: any[] = [];
    if (isPostgres()) {
      const res = await query('SELECT * FROM transactions WHERE is_cancelled = false ORDER BY date ASC, id ASC');
      allTx = res.rows;
    } else {
      allTx = memoryStore.transactions.filter(t => !t.is_cancelled);
      allTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
    }

    let runningBal = opCash;
    const entriesWithBalance: any[] = [];

    for (const tx of allTx) {
      const receipt = parseFloat(tx.receipt_amount || (tx.mode === 'Receipt' ? tx.amount : 0)) || 0;
      const payment = parseFloat(tx.payment_amount || (tx.mode === 'Payment' ? tx.amount : 0)) || 0;
      runningBal += (receipt - payment);

      let include = true;
      if (startDate && tx.date < (startDate as string)) include = false;
      if (endDate && tx.date > (endDate as string)) include = false;

      if (include) {
        entriesWithBalance.push({
          ...tx,
          receipt_amount: receipt,
          payment_amount: payment,
          running_balance: runningBal
        });
      }
    }

    return res.json({
      success: true,
      openingBalance: opCash,
      closingBalance: runningBal,
      entries: entriesWithBalance.reverse()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/ledger (Grouped by Account Head / Subtype)
router.get('/ledger', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subtype, startDate, endDate } = req.query;

    let allTx: any[] = [];
    if (isPostgres()) {
      let sql = 'SELECT * FROM transactions WHERE is_cancelled = false';
      const params: any[] = [];
      let p = 1;
      if (subtype) {
        sql += ` AND subtype = $${p++}`;
        params.push(subtype);
      }
      if (startDate) {
        sql += ` AND date >= $${p++}`;
        params.push(startDate);
      }
      if (endDate) {
        sql += ` AND date <= $${p++}`;
        params.push(endDate);
      }
      sql += ' ORDER BY date ASC, id ASC';
      const res = await query(sql, params);
      allTx = res.rows;
    } else {
      allTx = memoryStore.transactions.filter(t => {
        if (t.is_cancelled) return false;
        if (subtype && t.subtype !== subtype) return false;
        if (startDate && t.date < (startDate as string)) return false;
        if (endDate && t.date > (endDate as string)) return false;
        return true;
      });
      allTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
    }

    const grouped: Record<string, { totalDebit: number; totalCredit: number; balance: number; entries: any[] }> = {};

    for (const tx of allTx) {
      const head = tx.subtype || 'General Ledger';
      if (!grouped[head]) {
        grouped[head] = { totalDebit: 0, totalCredit: 0, balance: 0, entries: [] };
      }

      const debit = parseFloat(tx.payment_amount || (tx.mode === 'Payment' ? tx.amount : 0)) || 0;
      const credit = parseFloat(tx.receipt_amount || (tx.mode === 'Receipt' ? tx.amount : 0)) || 0;

      grouped[head].totalDebit += debit;
      grouped[head].totalCredit += credit;
      grouped[head].balance = grouped[head].totalCredit - grouped[head].totalDebit;

      grouped[head].entries.push({
        ...tx,
        debit,
        credit,
        running_balance: grouped[head].balance
      });
    }

    return res.json({ success: true, ledgers: grouped });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/subscriptions-matrix
router.get('/subscriptions-matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { financialYear = '2026-2027' } = req.query;

    let members: any[] = [];
    let transactions: any[] = [];

    if (isPostgres()) {
      const mRes = await query('SELECT id, member_code, name, phone FROM members ORDER BY member_code ASC');
      members = mRes.rows;
      const tRes = await query(`
        SELECT member_code, sub_month, amount, date, vr_no FROM transactions
        WHERE is_cancelled = false AND (subtype ILIKE '%subscription%' OR subtype ILIKE '%tithe%')
      `);
      transactions = tRes.rows;
    } else {
      members = memoryStore.members;
      transactions = memoryStore.transactions.filter(t => 
        !t.is_cancelled && 
        (String(t.subtype).toLowerCase().includes('subscription') || String(t.subtype).toLowerCase().includes('tithe'))
      );
    }

    const matrix = members.map(m => {
      const row: any = {
        member_code: m.member_code,
        name: m.name,
        months: {},
        totalPaid: 0
      };

      MONTHS.forEach(month => {
        row.months[month] = 0;
      });

      const memberTx = transactions.filter(t => t.member_code === m.member_code);
      memberTx.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        row.totalPaid += amt;
        if (t.sub_month) {
          const matchedMonth = MONTHS.find(mn => t.sub_month.includes(mn));
          if (matchedMonth) {
            row.months[matchedMonth] += amt;
          }
        }
      });

      return row;
    });

    return res.json({ success: true, months: MONTHS, financialYear, matrix });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
