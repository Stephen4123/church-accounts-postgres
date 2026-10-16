import { Router, Response } from 'express';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { Transaction } from '../types';

const router = Router();

// Helper to determine next voucher number
async function getNextVrNumbers() {
  let allVrNos: string[] = [];
  if (isPostgres()) {
    const res = await query('SELECT vr_no FROM transactions UNION SELECT vr_no FROM bank_transactions');
    allVrNos = res.rows.map(r => r.vr_no).filter(Boolean);
  } else {
    allVrNos = [
      ...memoryStore.transactions.map(t => t.vr_no),
      ...memoryStore.bank_transactions.map(t => t.vr_no)
    ].filter(Boolean);
  }

  let maxReceipt = 1000;
  let maxPayment = 1000;

  for (const vr of allVrNos) {
    const clean = vr.replace(/\/B$/, '').trim();
    if (clean.startsWith('R-') || clean.startsWith('R')) {
      const num = parseInt(clean.replace(/^R-?/, ''), 10);
      if (!isNaN(num) && num > maxReceipt) maxReceipt = num;
    } else if (clean.startsWith('P-') || clean.startsWith('P')) {
      const num = parseInt(clean.replace(/^P-?/, ''), 10);
      if (!isNaN(num) && num > maxPayment) maxPayment = num;
    }
  }

  return {
    nextReceipt: `R-${maxReceipt + 1}`,
    nextPayment: `P-${maxPayment + 1}`,
    nextBankReceipt: `R-${maxReceipt + 1}/B`,
    nextBankPayment: `P-${maxPayment + 1}/B`
  };
}

// GET /api/transactions/next-vr-no
router.get('/next-vr-no', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const numbers = await getNextVrNumbers();
    return res.json({ success: true, ...numbers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/transactions (Cash Book & general transactions)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, financialYear, mode, memberCode, search, includeCancelled } = req.query;

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (includeCancelled !== 'true') {
      sql += ` AND is_cancelled = false`;
    }

    if (startDate) {
      sql += ` AND date >= $${pIdx++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND date <= $${pIdx++}`;
      params.push(endDate);
    }

    if (mode) {
      sql += ` AND mode = $${pIdx++}`;
      params.push(mode);
    }

    if (memberCode) {
      sql += ` AND member_code = $${pIdx++}`;
      params.push(memberCode);
    }

    if (search) {
      sql += ` AND (vr_no ILIKE $${pIdx} OR account_name ILIKE $${pIdx} OR description ILIKE $${pIdx} OR subtype ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    sql += ' ORDER BY date DESC, id DESC';

    if (isPostgres()) {
      const result = await query(sql, params);
      return res.json({ success: true, transactions: result.rows });
    }

    // Memory store fallback filtering
    let list = [...memoryStore.transactions];
    if (includeCancelled !== 'true') {
      list = list.filter(t => !t.is_cancelled);
    }
    if (startDate) {
      list = list.filter(t => t.date >= (startDate as string));
    }
    if (endDate) {
      list = list.filter(t => t.date <= (endDate as string));
    }
    if (mode) {
      list = list.filter(t => t.mode === mode);
    }
    if (memberCode) {
      list = list.filter(t => t.member_code === memberCode);
    }
    if (search) {
      const s = (search as string).toLowerCase();
      list = list.filter(t => 
        (t.vr_no || '').toLowerCase().includes(s) ||
        (t.account_name || '').toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s) ||
        (t.subtype || '').toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id || 0) - (a.id || 0));
    return res.json({ success: true, transactions: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/transactions (Add Transaction / Voucher / Contra)
router.post('/', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      date,
      mode,
      entry_type = 'Cash',
      account_name = '',
      address = '',
      member_code = '',
      type = '',
      subtype = '',
      sub_month = '',
      bank_account = 'State Bank of India',
      bank_subtype = '',
      amount = 0,
      description = '',
      is_cheque = false,
      cheque_no = '',
      vr_no
    } = req.body;

    const numAmount = parseFloat(String(amount).replace(/,/g, '')) || 0;
    if (numAmount < 0) {
      return res.status(400).json({ success: false, message: 'Amount must be non-negative' });
    }

    // Auto-generate vr_no if not supplied
    let finalVrNo = vr_no ? String(vr_no).trim() : '';
    if (!finalVrNo) {
      const nextNumbers = await getNextVrNumbers();
      if (entry_type === 'Bank') {
        finalVrNo = mode === 'Receipt' ? nextNumbers.nextBankReceipt : nextNumbers.nextBankPayment;
      } else {
        finalVrNo = mode === 'Receipt' ? nextNumbers.nextReceipt : nextNumbers.nextPayment;
      }
    } else if (entry_type === 'Bank' && !finalVrNo.endsWith('/B')) {
      finalVrNo += '/B';
    }

    let receiptAmount = mode === 'Receipt' ? numAmount : 0;
    let paymentAmount = mode === 'Payment' ? numAmount : 0;

    // Contra handling
    const isContraDeposit = (bank_subtype === 'Cash Deposit (Contra)' || (type === 'Contra' && subtype.includes('Deposit')));
    const isContraWithdrawal = (bank_subtype === 'Cash Withdrawal (Contra)' || (type === 'Contra' && subtype.includes('Withdrawal')));

    if (entry_type === 'Bank') {
      if (isContraDeposit) {
        // Cash leaves cash box (Payment), enters Bank (Deposit)
        receiptAmount = 0;
        paymentAmount = numAmount;
      } else if (isContraWithdrawal) {
        // Cash enters cash box (Receipt), leaves Bank (Payment)
        receiptAmount = numAmount;
        paymentAmount = 0;
      }
    }

    let insertedTx: any = null;

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO transactions (
          vr_no, date, mode, entry_type, account_name, address, member_code,
          type, subtype, sub_month, bank_account, bank_subtype, amount,
          receipt_amount, payment_amount, description, is_cheque, cheque_no, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        finalVrNo, date, mode, entry_type, account_name, address, member_code,
        type, subtype, sub_month, bank_account, bank_subtype, numAmount,
        receiptAmount, paymentAmount, description, is_cheque, cheque_no, req.user?.name || 'System'
      ]);
      insertedTx = result.rows[0];

      // If Bank transaction or Contra, sync to bank_transactions table
      if (entry_type === 'Bank' || isContraDeposit || isContraWithdrawal) {
        let bankMode = mode === 'Receipt' ? 'Credit (Receipt)' : 'Debit (Payment)';
        if (isContraDeposit) bankMode = 'Credit (Receipt)';
        if (isContraWithdrawal) bankMode = 'Debit (Payment)';

        const bRes = await query(`
          INSERT INTO bank_transactions (
            cash_id, vr_no, date, mode, account, amount, description, subtype, cheque_no
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          insertedTx.id, finalVrNo, date, bankMode, bank_account, numAmount,
          description || (isContraDeposit ? 'Cash Deposit to Bank' : isContraWithdrawal ? 'Cash Withdrawal from Bank' : ''),
          bank_subtype || subtype, cheque_no
        ]);
        if (bRes.rows.length > 0) {
          const bankId = bRes.rows[0].id;
          await query('UPDATE cash_book SET bank_id = $1 WHERE id = $2', [bankId, insertedTx.id]);
          insertedTx.bank_id = bankId;
        }
      }

      // Auto-create public shared verification link
      await query(`
        INSERT INTO shared_links (code, target_type, target_id, payload)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `, [
        finalVrNo,
        mode === 'Receipt' ? 'receipt' : 'voucher',
        String(insertedTx.id),
        JSON.stringify(insertedTx)
      ]);

    } else {
      insertedTx = {
        id: Date.now(),
        vr_no: finalVrNo,
        date,
        mode,
        entry_type,
        account_name,
        address,
        member_code,
        type,
        subtype,
        sub_month,
        bank_account,
        bank_subtype,
        amount: numAmount,
        receipt_amount: receiptAmount,
        payment_amount: paymentAmount,
        description,
        is_cheque,
        cheque_no,
        is_printed: false,
        is_cancelled: false,
        created_by: req.user?.name || 'System',
        created_at: new Date()
      };
      memoryStore.transactions.push(insertedTx);

      if (entry_type === 'Bank' || isContraDeposit || isContraWithdrawal) {
        let bankMode = mode === 'Receipt' ? 'Deposit (Receipt)' : 'Withdrawal (Payment)';
        if (isContraDeposit) bankMode = 'Deposit (Receipt)';
        if (isContraWithdrawal) bankMode = 'Withdrawal (Payment)';

        memoryStore.bank_transactions.push({
          id: Date.now() + 1,
          tx_id: insertedTx.id,
          vr_no: finalVrNo,
          date,
          mode: bankMode,
          account: bank_account,
          amount: numAmount,
          description,
          subtype: bank_subtype || subtype,
          cheque_no,
          created_at: new Date()
        });
      }

      memoryStore.shared_links[finalVrNo] = {
        code: finalVrNo,
        target_type: mode === 'Receipt' ? 'receipt' : 'voucher',
        target_id: String(insertedTx.id),
        payload: insertedTx
      };
      saveLocalStore();
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction saved successfully',
      transaction: insertedTx,
      publicLink: `/${finalVrNo}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/transactions/:id (Edit Transaction)
router.put('/:id', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      date,
      mode,
      account_name,
      address,
      member_code,
      type,
      subtype,
      sub_month,
      bank_account,
      bank_subtype,
      amount,
      description,
      is_cheque,
      cheque_no
    } = req.body;

    const numAmount = parseFloat(String(amount).replace(/,/g, '')) || 0;
    const receiptAmount = mode === 'Receipt' ? numAmount : 0;
    const paymentAmount = mode === 'Payment' ? numAmount : 0;

    if (isPostgres()) {
      const result = await query(`
        UPDATE transactions SET
          date = COALESCE($1, date),
          mode = COALESCE($2, mode),
          account_name = COALESCE($3, account_name),
          address = COALESCE($4, address),
          member_code = COALESCE($5, member_code),
          type = COALESCE($6, type),
          subtype = COALESCE($7, subtype),
          sub_month = COALESCE($8, sub_month),
          bank_account = COALESCE($9, bank_account),
          bank_subtype = COALESCE($10, bank_subtype),
          amount = $11,
          receipt_amount = $12,
          payment_amount = $13,
          description = COALESCE($14, description),
          is_cheque = COALESCE($15, is_cheque),
          cheque_no = COALESCE($16, cheque_no),
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
      `, [
        date, mode, account_name, address, member_code,
        type, subtype, sub_month, bank_account, bank_subtype,
        numAmount, receiptAmount, paymentAmount, description,
        is_cheque, cheque_no, id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      // Update linked bank transaction if exists
      await query(`
        UPDATE bank_book SET
          date = COALESCE($1, date),
          credit = CASE WHEN particulars ILIKE '%Deposit%' OR category ILIKE '%Deposit%' THEN $2 ELSE 0 END,
          debit = CASE WHEN particulars ILIKE '%Withdrawal%' OR category ILIKE '%Withdrawal%' THEN $2 ELSE debit END,
          bank_account = COALESCE($3, bank_account),
          particulars = COALESCE($4, particulars),
          cheque_no = COALESCE($5, cheque_no)
        WHERE cash_id = $6 OR id = (SELECT bank_id FROM cash_book WHERE id = $6)
      `, [date, numAmount, bank_account, description, cheque_no, id]);

      return res.json({ success: true, transaction: result.rows[0] });
    }

    const idx = memoryStore.transactions.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });

    Object.assign(memoryStore.transactions[idx], {
      date: date || memoryStore.transactions[idx].date,
      mode: mode || memoryStore.transactions[idx].mode,
      account_name: account_name !== undefined ? account_name : memoryStore.transactions[idx].account_name,
      address: address !== undefined ? address : memoryStore.transactions[idx].address,
      member_code: member_code !== undefined ? member_code : memoryStore.transactions[idx].member_code,
      type: type !== undefined ? type : memoryStore.transactions[idx].type,
      subtype: subtype !== undefined ? subtype : memoryStore.transactions[idx].subtype,
      sub_month: sub_month !== undefined ? sub_month : memoryStore.transactions[idx].sub_month,
      bank_account: bank_account || memoryStore.transactions[idx].bank_account,
      bank_subtype: bank_subtype !== undefined ? bank_subtype : memoryStore.transactions[idx].bank_subtype,
      amount: numAmount,
      receipt_amount: receiptAmount,
      payment_amount: paymentAmount,
      description: description !== undefined ? description : memoryStore.transactions[idx].description,
      is_cheque: is_cheque !== undefined ? is_cheque : memoryStore.transactions[idx].is_cheque,
      cheque_no: cheque_no !== undefined ? cheque_no : memoryStore.transactions[idx].cheque_no,
      updated_at: new Date()
    });

    const bankIdx = memoryStore.bank_transactions.findIndex(b => b.tx_id === id);
    if (bankIdx !== -1) {
      Object.assign(memoryStore.bank_transactions[bankIdx], {
        date: date || memoryStore.bank_transactions[bankIdx].date,
        amount: numAmount,
        account: bank_account || memoryStore.bank_transactions[bankIdx].account,
        description: description || memoryStore.bank_transactions[bankIdx].description
      });
    }

    saveLocalStore();
    return res.json({ success: true, transaction: memoryStore.transactions[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/transactions/:id/print (Mark printed)
router.patch('/:id/print', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('UPDATE transactions SET is_printed = true WHERE id = $1', [id]);
    } else {
      const tx = memoryStore.transactions.find(t => t.id === id);
      if (tx) tx.is_printed = true;
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Marked as printed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/transactions/:id/cancel (Cancel transaction)
router.patch('/:id/cancel', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('UPDATE transactions SET is_cancelled = true WHERE id = $1', [id]);
      await query('DELETE FROM bank_book WHERE cash_id = $1 OR id = (SELECT bank_id FROM cash_book WHERE id = $1)', [id]);
    } else {
      const tx = memoryStore.transactions.find(t => t.id === id);
      if (tx) tx.is_cancelled = true;
      memoryStore.bank_transactions = memoryStore.bank_transactions.filter(b => b.tx_id !== id && b.cash_id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Transaction cancelled' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/transactions/:id (Delete transaction - Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('DELETE FROM bank_book WHERE cash_id = $1 OR id = (SELECT bank_id FROM cash_book WHERE id = $1)', [id]);
      await query('DELETE FROM cash_book WHERE id = $1', [id]);
    } else {
      memoryStore.transactions = memoryStore.transactions.filter(t => t.id !== id);
      memoryStore.bank_transactions = memoryStore.bank_transactions.filter(b => b.tx_id !== id && b.cash_id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Transaction permanently deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
