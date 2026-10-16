import { Router, Request, Response } from 'express';
import { query, isPostgres, memoryStore } from '../db';

const router = Router();

// GET /api/public/verify/:code
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.trim();

    // 1. Look in shared_links
    if (isPostgres()) {
      const linkRes = await query('SELECT * FROM shared_links WHERE code = $1', [code]);
      if (linkRes.rows.length > 0) {
        return res.json({ success: true, document: linkRes.rows[0] });
      }

      // 2. Direct lookup for transaction (Receipt / Voucher)
      const txRes = await query('SELECT * FROM transactions WHERE vr_no = $1', [code]);
      if (txRes.rows.length > 0) {
        const tx = txRes.rows[0];
        return res.json({
          success: true,
          document: {
            code,
            target_type: tx.mode === 'Receipt' ? 'receipt' : 'voucher',
            target_id: String(tx.id),
            payload: tx
          }
        });
      }

      // 3. Member statement lookup (e.g. H-101)
      const memRes = await query('SELECT * FROM members WHERE member_code = $1', [code]);
      if (memRes.rows.length > 0) {
        const member = memRes.rows[0];
        const txs = await query('SELECT * FROM transactions WHERE member_code = $1 AND is_cancelled = false ORDER BY date DESC', [code]);
        return res.json({
          success: true,
          document: {
            code,
            target_type: 'statement',
            target_id: String(member.id),
            payload: {
              member,
              transactions: txs.rows
            }
          }
        });
      }
    } else {
      if (memoryStore.shared_links[code]) {
        return res.json({ success: true, document: memoryStore.shared_links[code] });
      }

      const tx = memoryStore.transactions.find(t => t.vr_no === code);
      if (tx) {
        return res.json({
          success: true,
          document: {
            code,
            target_type: tx.mode === 'Receipt' ? 'receipt' : 'voucher',
            target_id: String(tx.id),
            payload: tx
          }
        });
      }

      const member = memoryStore.members.find(m => m.member_code === code);
      if (member) {
        const txs = memoryStore.transactions.filter(t => t.member_code === code && !t.is_cancelled);
        return res.json({
          success: true,
          document: {
            code,
            target_type: 'statement',
            target_id: String(member.id),
            payload: {
              member,
              transactions: txs
            }
          }
        });
      }
    }

    return res.status(404).json({ success: false, message: 'Document or voucher not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
