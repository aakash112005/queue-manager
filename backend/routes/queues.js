const express = require('express');
const { v4: uuid } = require('uuid');
const { load, transact } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function summarize(queue, tokens) {
  const waiting = tokens.filter((t) => t.queueId === queue.id && t.status === 'waiting');
  const serving = tokens.filter((t) => t.queueId === queue.id && t.status === 'serving');
  return {
    ...queue,
    waitingCount: waiting.length,
    servingCount: serving.length
  };
}

// GET /api/queues - list this manager's queues
router.get('/', (req, res) => {
  const data = load();
  const mine = data.queues.filter((q) => q.managerId === req.manager.id);
  res.json({ queues: mine.map((q) => summarize(q, data.tokens)) });
});

// POST /api/queues - create a queue
router.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Queue name is required.' });
  }

  const queue = await transact(async (data) => {
    const q = {
      id: uuid(),
      managerId: req.manager.id,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    data.queues.push(q);
    return q;
  });

  res.status(201).json({ queue: summarize(queue, []) });
});

// GET /api/queues/:id - fetch a single queue (with ownership check)
router.get('/:id', (req, res) => {
  const data = load();
  const queue = data.queues.find((q) => q.id === req.params.id);
  if (!queue || queue.managerId !== req.manager.id) {
    return res.status(404).json({ error: 'Queue not found.' });
  }
  res.json({ queue: summarize(queue, data.tokens) });
});

// DELETE /api/queues/:id - remove a queue and its tokens
router.delete('/:id', async (req, res) => {
  const result = await transact(async (data) => {
    const queue = data.queues.find((q) => q.id === req.params.id);
    if (!queue || queue.managerId !== req.manager.id) {
      return { error: 'not_found' };
    }
    data.queues = data.queues.filter((q) => q.id !== req.params.id);
    data.tokens = data.tokens.filter((t) => t.queueId !== req.params.id);
    data.events = data.events.filter((e) => e.queueId !== req.params.id);
    return { ok: true };
  });

  if (result.error) return res.status(404).json({ error: 'Queue not found.' });
  res.status(204).end();
});

module.exports = router;
