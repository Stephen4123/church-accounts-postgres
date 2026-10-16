import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { migrate } from './db/migrate';
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
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 IPC Horeb Church Accounts Portal running on http://localhost:${PORT}`);
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
