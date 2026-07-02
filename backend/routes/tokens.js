const express = require('express');
const { v4: uuid } = require('uuid');
const { load, transact } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

function assertOwnsQueue(data, queueId, managerId) {
  const queue = data.queues.find((q) => q.id === queueId);
  if (!queue || queue.managerId !== managerId) return null;
  return queue;
}

function nextPosition(data, queueId) {
  const waiting = data.tokens.filter(
    (t) => t.queueId === queueId && t.status === 'waiting'
  );
  if (waiting.length === 0) return 1;
  return Math.max(...waiting.map((t) => t.position)) + 1;
}

// GET /api/queues/:queueId/tokens - full roster (waiting first, in order, then others)
router.get('/', (req, res) => {
  const data = load();
  const queue = assertOwnsQueue(data, req.params.queueId, req.manager.id);
  if (!queue) return res.status(404).json({ error: 'Queue not found.' });

  const all = data.tokens.filter((t) => t.queueId === queue.id);
  const waiting = all.filter((t) => t.status === 'waiting').sort((a, b) => a.position - b.position);
  const serving = all.filter((t) => t.status === 'serving');
  const rest = all
    .filter((t) => t.status !== 'waiting' && t.status !== 'serving')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ waiting, serving, history: rest });
});

// POST /api/queues/:queueId/tokens - add a new token/person
router.post('/', async (req, res) => {
  const { label, note } = req.body || {};
  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'A name or label for the token is required.' });
  }

  const result = await transact(async (data) => {
    const queue = assertOwnsQueue(data, req.params.queueId, req.manager.id);
    if (!queue) return { error: 'not_found' };

    const token = {
      id: uuid(),
      queueId: queue.id,
      label: label.trim(),
      note: (note || '').trim(),
      status: 'waiting',
      position: nextPosition(data, queue.id),
      createdAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null,
      cancelledAt: null
    };
    data.tokens.push(token);
    data.events.push({ id: uuid(), queueId: queue.id, type: 'joined', at: token.createdAt });
    return { token };
  });

  if (result.error) return res.status(404).json({ error: 'Queue not found.' });
  res.status(201).json({ token: result.token });
});

module.exports = router;
