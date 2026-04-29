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
const agentsRoutes = require('./routes/agents');
const settingsRoutes = require('./routes/settings');
const churchPanelRoutes = require('./routes/church');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/join', require('./routes/join'));
app.use('/api/catalog', require('./routes/catalog'));

// Protected routes (Super Admin)
app.use('/api/dashboard', authenticate, requireRole('super_admin'), dashboardRoutes);
app.use('/api/churches', authenticate, requireRole('super_admin'), churchRoutes);
app.use('/api/users', authenticate, requireRole('super_admin'), usersRoutes);
app.use('/api/plans', authenticate, requireRole('super_admin'), plansRoutes);
app.use('/api/logs', authenticate, requireRole('super_admin'), logsRoutes);
app.use('/api/ai', authenticate, requireRole('super_admin'), aiRoutes);
app.use('/api/agents', authenticate, requireRole('super_admin'), agentsRoutes);
app.use('/api/settings', authenticate, requireRole('super_admin'), settingsRoutes);

// Protected routes (Church — all roles)
app.use('/api/church', authenticate, churchPanelRoutes);
app.use('/api/church/groups', authenticate, require('./routes/groups'));
app.use('/api/church/studies', authenticate, require('./routes/studies'));
app.use('/api/church/polls', authenticate, require('./routes/polls'));
app.use('/api/church/events', authenticate, require('./routes/events'));
app.use('/api/church/school', authenticate, require('./routes/school'));
app.use('/api/church/onboarding', authenticate, require('./routes/onboarding'));
app.use('/api/church/media', authenticate, require('./routes/media'));
app.use('/api/church/devotional', authenticate, require('./routes/devotional'));
app.use('/api/church/suggestions', authenticate, require('./routes/suggestions'));
app.use('/api/church/quizzes', authenticate, require('./routes/quizzes'));
app.use('/api/church/notifications', authenticate, require('./routes/notifications'));
app.use('/api/church/announcements', authenticate, require('./routes/announcements'));
app.use('/api/church/assistant', authenticate, require('./routes/assistant'));
app.use('/api/church/worship', authenticate, require('./routes/worship'));
app.use('/api/church/upload', authenticate, require('./routes/upload'));
app.use('/api/church/social', authenticate, require('./routes/social'));
app.use('/api/church/gallery', authenticate, require('./routes/gallery'));
app.use('/api/church/battles', authenticate, require('./routes/battles'));
app.use('/api/church/verse-rush', authenticate, require('./routes/verse-rush'));
app.use('/api/church/mahjong', authenticate, require('./routes/mahjong'));
app.use('/api/church/notebook-ai', authenticate, require('./routes/notebook-ai'));
app.use('/api/bible-study', authenticate, require('./routes/bible-study'));

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ARKHÉ API running on port ${PORT}`);
});
