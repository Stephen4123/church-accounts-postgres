import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { migrate } from './db/migrate';
import { isPostgres } from './db';
import authRoutes from './routes/auth.routes';
import transactionsRoutes from './routes/transactions.routes';
import bankRoutes from './routes/bank.routes';
import membersRoutes from './routes/members.routes';
import reportsRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';
import publicRoutes from './routes/public.routes';
import syncRoutes from './routes/sync.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend assets
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Endpoints
app.use('/api/sync', syncRoutes);
app.use('/api/categories', (req, res, next) => {
  req.url = '/categories' + (req.url === '/' ? '' : req.url);
  syncRoutes(req, res, next);
});
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);

// Health check endpoint for Render
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test-calc', async (req: Request, res: Response) => {
  try {
    const { query } = await import('./db');
    const cashRes = await query('SELECT * FROM cash_book ORDER BY id ASC');
    const bankRes = await query('SELECT * FROM bank_book ORDER BY id ASC');
    const openRes = await query('SELECT * FROM opening_balances WHERE financial_year = $1', ['2026-2027']);
    
    // We can run the same classifyCategory logic here!
    res.json({
      cashCount: cashRes.rows.length,
      bankCount: bankRes.rows.length,
      opening: openRes.rows[0],
      firstFruits: cashRes.rows.filter(r => String(r.particulars + r.category + r.subtype).toLowerCase().includes('first fruit')),
      monthlyMeeting: cashRes.rows.filter(r => String(r.particulars + r.category + r.subtype + r.type).toLowerCase().includes('monthly meeting')),
      purchases: cashRes.rows.filter(r => String(r.particulars + r.category + r.subtype).toLowerCase().includes('purchase')),
      donations: cashRes.rows.filter(r => String(r.particulars + r.category + r.subtype).toLowerCase().includes('donation')),
      generalBody: cashRes.rows.filter(r => String(r.particulars + r.category + r.subtype).toLowerCase().includes('general body') || String(r.particulars + r.category + r.subtype).toLowerCase().includes('anniversary'))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Database status & diagnostic endpoint to verify Neon in production
app.get('/api/db-status', async (req: Request, res: Response) => {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl ? dbUrl.replace(/:([^:@]+)@/, ':****@') : 'NOT_SET';
  let txCount = 0;
  let memCount = 0;
  let dbErr: string | null = null;
  const isPg = isPostgres();

  if (isPg) {
    try {
      const { query } = await import('./db');
      const tx = await query('SELECT count(*)::int as count FROM transactions');
      txCount = tx.rows[0]?.count || 0;
      const mem = await query('SELECT count(*)::int as count FROM members');
      memCount = mem.rows[0]?.count || 0;
    } catch (e: any) {
      dbErr = e.message;
    }
  }

  res.json({
    status: 'ok',
    isPostgres: isPg,
    databaseConfigured: !!dbUrl,
    databaseHost: dbUrl ? (dbUrl.split('@')[1] || '').split('/')[0] : 'none',
    databaseUrlMasked: maskedUrl,
    isNeon: dbUrl.includes('neon.tech'),
    transactionsCount: txCount,
    membersCount: memCount,
    error: dbErr,
    timestamp: new Date().toISOString()
  });
});

// Clean URL rewrites matching the original reference repo
app.get(['/R-*', '/P-*', '/L-*', '/H*'], (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'view.html'));
});

// Single Page Application fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Server and initialize database
async function startServer() {
  try {
    await migrate();
    const listenPort = Number(PORT) || 5000;
    app.listen(listenPort, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🚀 IPC Horeb Church Accounts Portal running on http://0.0.0.0:${listenPort}`);
      console.log(`📁 Static files served from: ${publicPath}`);
      console.log(`🌐 Ready for Render Deployment with PostgreSQL`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

export default app;
