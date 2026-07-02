require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queues');
const tokenRoutes = require('./routes/tokens');
const tokenActionRoutes = require('./routes/tokenActions');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/queues/:queueId/tokens', tokenRoutes);
app.use('/api/tokens', tokenActionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Queue Manager API listening on http://localhost:${PORT}`);
});
