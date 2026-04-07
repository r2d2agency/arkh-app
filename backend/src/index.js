require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const registerRoutes = require('./routes/register');
const churchRoutes = require('./routes/churches');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const plansRoutes = require('./routes/plans');
const logsRoutes = require('./routes/logs');
const aiRoutes = require('./routes/ai');
const settingsRoutes = require('./routes/settings');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/register', registerRoutes);

// Protected routes (Super Admin)
app.use('/api/dashboard', authenticate, requireRole('super_admin'), dashboardRoutes);
app.use('/api/churches', authenticate, requireRole('super_admin'), churchRoutes);
app.use('/api/users', authenticate, requireRole('super_admin'), usersRoutes);
app.use('/api/plans', authenticate, requireRole('super_admin'), plansRoutes);
app.use('/api/logs', authenticate, requireRole('super_admin'), logsRoutes);
app.use('/api/ai', authenticate, requireRole('super_admin'), aiRoutes);
app.use('/api/settings', authenticate, requireRole('super_admin'), settingsRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ARKHÉ API running on port ${PORT}`);
});
