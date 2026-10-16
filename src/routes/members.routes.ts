import { Router, Response } from 'express';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/members
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, status } = req.query;

    let sql = 'SELECT * FROM members WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (status) {
      sql += ` AND status = $${pIdx++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (member_code ILIKE $${pIdx} OR name ILIKE $${pIdx} OR phone ILIKE $${pIdx} OR address ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    sql += ' ORDER BY member_code ASC';

    if (isPostgres()) {
      const result = await query(sql, params);
      return res.json({ success: true, members: result.rows });
    }

    let list = [...memoryStore.members];
    if (status) {
      list = list.filter(m => m.status === status);
    }
    if (search) {
      const s = (search as string).toLowerCase();
      list = list.filter(m =>
        (m.member_code || '').toLowerCase().includes(s) ||
        (m.name || '').toLowerCase().includes(s) ||
        (m.phone || '').toLowerCase().includes(s) ||
        (m.address || '').toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => (a.member_code || '').localeCompare(b.member_code || ''));
    return res.json({ success: true, members: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/members/:code/ledger (Member Statement & Contributions History)
router.get('/:code/ledger', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const code = req.params.code;
    let member: any = null;
    let transactions: any[] = [];

    if (isPostgres()) {
      const mRes = await query('SELECT * FROM members WHERE member_code = $1', [code]);
      if (mRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
      member = mRes.rows[0];

      const tRes = await query(`
        SELECT * FROM transactions
        WHERE (member_code = $1 OR account_name ILIKE $2) AND is_cancelled = false
        ORDER BY date DESC, id DESC
      `, [code, `%${member.name}%`]);
      transactions = tRes.rows;
    } else {
      member = memoryStore.members.find(m => m.member_code === code);
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

      transactions = memoryStore.transactions.filter(t => 
        (t.member_code === code || (t.account_name && t.account_name.toLowerCase().includes(member.name.toLowerCase()))) &&
        !t.is_cancelled
      );
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    let totalReceipts = 0;
    let totalPayments = 0;
    const categoryBreakdown: Record<string, number> = {};

    transactions.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.mode === 'Receipt') {
        totalReceipts += amt;
        const sub = t.subtype || 'General Contribution';
        categoryBreakdown[sub] = (categoryBreakdown[sub] || 0) + amt;
      } else {
        totalPayments += amt;
      }
    });

    return res.json({
      success: true,
      member,
      totalReceipts,
      totalPayments,
      netContribution: totalReceipts - totalPayments,
      categoryBreakdown,
      transactions,
      publicLink: `/${code}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/members
router.post('/', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { member_code, name, phone, address, family_head, photo_url, status = 'Active', monthly_pledge = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Member name is required' });
    }

    let code = member_code ? String(member_code).trim().toUpperCase() : '';
    if (!code) {
      let maxNum = 100;
      if (isPostgres()) {
        const cRes = await query('SELECT member_code FROM members');
        for (const r of cRes.rows) {
          const num = parseInt(String(r.member_code).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      } else {
        for (const m of memoryStore.members) {
          const num = parseInt(String(m.member_code).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      code = `H-${maxNum + 1}`;
    }

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO members (member_code, name, phone, address, family_head, photo_url, status, monthly_pledge)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [code, name.trim(), phone || '', address || '', family_head || '', photo_url || '', status, monthly_pledge]);

      // Seed public member statement shareable link
      await query(`
        INSERT INTO shared_links (code, target_type, target_id, payload)
        VALUES ($1, 'statement', $2, $3)
        ON CONFLICT (code) DO NOTHING
      `, [code, String(result.rows[0].id), JSON.stringify(result.rows[0])]);

      return res.status(201).json({ success: true, member: result.rows[0] });
    }

    const newMember = {
      id: Date.now(),
      member_code: code,
      name: name.trim(),
      phone: phone || '',
      address: address || '',
      family_head: family_head || '',
      photo_url: photo_url || '',
      status,
      monthly_pledge,
      created_at: new Date()
    };
    memoryStore.members.push(newMember);
    memoryStore.shared_links[code] = {
      code,
      target_type: 'statement',
      target_id: String(newMember.id),
      payload: newMember
    };
    saveLocalStore();

    return res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/members/:id
router.put('/:id', authenticateToken, requireRole(['Admin', 'Treasurer']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, phone, address, family_head, photo_url, status, monthly_pledge } = req.body;

    if (isPostgres()) {
      const result = await query(`
        UPDATE members SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          address = COALESCE($3, address),
          family_head = COALESCE($4, family_head),
          photo_url = COALESCE($5, photo_url),
          status = COALESCE($6, status),
          monthly_pledge = COALESCE($7, monthly_pledge),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [name, phone, address, family_head, photo_url, status, monthly_pledge, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
      return res.json({ success: true, member: result.rows[0] });
    }

    const idx = memoryStore.members.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Member not found' });

    Object.assign(memoryStore.members[idx], {
      name: name !== undefined ? name : memoryStore.members[idx].name,
      phone: phone !== undefined ? phone : memoryStore.members[idx].phone,
      address: address !== undefined ? address : memoryStore.members[idx].address,
      family_head: family_head !== undefined ? family_head : memoryStore.members[idx].family_head,
      photo_url: photo_url !== undefined ? photo_url : memoryStore.members[idx].photo_url,
      status: status !== undefined ? status : memoryStore.members[idx].status,
      monthly_pledge: monthly_pledge !== undefined ? monthly_pledge : memoryStore.members[idx].monthly_pledge,
      updated_at: new Date()
    });
    saveLocalStore();

    return res.json({ success: true, member: memoryStore.members[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/members/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('DELETE FROM members WHERE id = $1', [id]);
    } else {
      memoryStore.members = memoryStore.members.filter(m => m.id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'Member removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
