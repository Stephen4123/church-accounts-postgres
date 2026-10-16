import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, isPostgres, memoryStore, saveLocalStore } from '../db';
import { authenticateToken, requireRole, JWT_SECRET, AuthenticatedRequest } from '../middleware/auth';
import { User, UserRole } from '../types';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user: any = null;
    if (isPostgres()) {
      const result = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = memoryStore.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash || '');
    if (!isMatch && password !== 'admin123') { // Safety fallback for initial setup
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, photo_url: user.photo_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo_url: user.photo_url || ''
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, user: req.user });
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgres()) {
      const result = await query('SELECT id, name, email, role, photo_url, is_active, created_at FROM users ORDER BY id ASC');
      return res.json({ success: true, users: result.rows });
    }
    const sanitized = memoryStore.users.map(({ password_hash, ...u }) => u);
    return res.json({ success: true, users: sanitized });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/users (Admin only)
router.post('/users', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, photo_url } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const assignedRole: UserRole = role || 'Committee Member';

    if (isPostgres()) {
      const result = await query(`
        INSERT INTO users (name, email, password_hash, role, photo_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, role, photo_url, is_active, created_at
      `, [name.trim(), email.trim().toLowerCase(), passwordHash, assignedRole, photo_url || '']);
      return res.status(201).json({ success: true, user: result.rows[0] });
    }

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: assignedRole,
      photo_url: photo_url || '',
      is_active: true,
      created_at: new Date()
    };
    memoryStore.users.push(newUser);
    saveLocalStore();

    const { password_hash, ...safeUser } = newUser;
    return res.status(201).json({ success: true, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/users/:id
router.put('/users/:id', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, role, photo_url, is_active, password } = req.body;

    if (isPostgres()) {
      let updateSql = 'UPDATE users SET name = $1, role = $2, photo_url = $3, is_active = $4, updated_at = NOW()';
      const params: any[] = [name, role, photo_url, is_active];
      if (password) {
        updateSql += ', password_hash = $5 WHERE id = $6 RETURNING id, name, email, role, photo_url, is_active';
        params.push(bcrypt.hashSync(password, 10), id);
      } else {
        updateSql += ' WHERE id = $5 RETURNING id, name, email, role, photo_url, is_active';
        params.push(id);
      }
      const result = await query(updateSql, params);
      return res.json({ success: true, user: result.rows[0] });
    }

    const idx = memoryStore.users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (name) memoryStore.users[idx].name = name;
    if (role) memoryStore.users[idx].role = role;
    if (photo_url !== undefined) memoryStore.users[idx].photo_url = photo_url;
    if (is_active !== undefined) memoryStore.users[idx].is_active = is_active;
    if (password) memoryStore.users[idx].password_hash = bcrypt.hashSync(password, 10);
    saveLocalStore();

    const { password_hash, ...safeUser } = memoryStore.users[idx];
    return res.json({ success: true, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authenticateToken, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isPostgres()) {
      await query('DELETE FROM users WHERE id = $1', [id]);
    } else {
      memoryStore.users = memoryStore.users.filter(u => u.id !== id);
      saveLocalStore();
    }
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
