const express = require('express');
const { v4: uuid } = require('uuid');
const { load, transact } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function findOwnedToken(data, tokenId, managerId) {
  const token = data.tokens.find((t) => t.id === tokenId);
  if (!token) return { error: 'not_found' };
  const queue = data.queues.find((q) => q.id === token.queueId);
  if (!queue || queue.managerId !== managerId) return { error: 'not_found' };
  return { token, queue };
}

// PATCH /api/tokens/:id/move  { direction: 'up' | 'down' }
router.patch('/:id/move', async (req, res) => {
  const { direction } = req.body || {};
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: "direction must be 'up' or 'down'." });
  }

  const result = await transact(async (data) => {
    const found = findOwnedToken(data, req.params.id, req.manager.id);
    if (found.error) return found;
    const { token } = found;
    if (token.status !== 'waiting') {
      return { error: 'not_waiting' };
    }

    const waiting = data.tokens
      .filter((t) => t.queueId === token.queueId && t.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    const idx = waiting.findIndex((t) => t.id === token.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx < 0 || swapIdx >= waiting.length) {
      return { error: 'edge' };
    }

    const neighbor = waiting[swapIdx];
    const tmp = token.position;
    token.position = neighbor.position;
    neighbor.position = tmp;

    return { ok: true };
  });

  if (result.error === 'not_found') return res.status(404).json({ error: 'Token not found.' });
  if (result.error === 'not_waiting')
    return res.status(400).json({ error: 'Only waiting tokens can be reordered.' });
  if (result.error === 'edge')
    return res.status(400).json({ error: 'Token is already at that end of the queue.' });

  res.json({ ok: true });
});

// POST /api/tokens/:id/assign - call this token up for service.
// Enforces that it is currently at the top of the waiting list, matching
// "assign the token at the top of the queue for service" from the brief.
router.post('/:id/assign', async (req, res) => {
  const result = await transact(async (data) => {
    const found = findOwnedToken(data, req.params.id, req.manager.id);
    if (found.error) return found;
    const { token } = found;

    if (token.status !== 'waiting') return { error: 'not_waiting' };

    const waiting = data.tokens
      .filter((t) => t.queueId === token.queueId && t.status === 'waiting')
      .sort((a, b) => a.position - b.position);

    if (waiting[0].id !== token.id) {
      return { error: 'not_top' };
    }

    token.status = 'serving';
    token.calledAt = new Date().toISOString();
    data.events.push({ id: uuid(), queueId: token.queueId, type: 'called', at: token.calledAt });
    return { token };
  });

  if (result.error === 'not_found') return res.status(404).json({ error: 'Token not found.' });
  if (result.error === 'not_waiting')
    return res.status(400).json({ error: 'Only waiting tokens can be assigned.' });
  if (result.error === 'not_top')
    return res.status(400).json({ error: 'Only the token at the top of the queue can be assigned.' });

  res.json({ token: result.token });
});

// POST /api/tokens/:id/complete - mark a serving token as done
router.post('/:id/complete', async (req, res) => {
  const result = await transact(async (data) => {
    const found = findOwnedToken(data, req.params.id, req.manager.id);
    if (found.error) return found;
    const { token } = found;
    if (token.status !== 'serving') return { error: 'not_serving' };

    token.status = 'completed';
    token.completedAt = new Date().toISOString();
    data.events.push({ id: uuid(), queueId: token.queueId, type: 'completed', at: token.completedAt });
    return { token };
  });

  if (result.error === 'not_found') return res.status(404).json({ error: 'Token not found.' });
  if (result.error === 'not_serving')
    return res.status(400).json({ error: 'Only a token currently being served can be completed.' });

  res.json({ token: result.token });
});

// DELETE /api/tokens/:id - cancel a token
router.delete('/:id', async (req, res) => {
  const result = await transact(async (data) => {
    const found = findOwnedToken(data, req.params.id, req.manager.id);
    if (found.error) return found;
    const { token } = found;
    if (token.status === 'completed' || token.status === 'cancelled') {
      return { error: 'already_final' };
    }

    token.status = 'cancelled';
    token.cancelledAt = new Date().toISOString();
    data.events.push({ id: uuid(), queueId: token.queueId, type: 'cancelled', at: token.cancelledAt });
    return { token };
  });

  if (result.error === 'not_found') return res.status(404).json({ error: 'Token not found.' });
  if (result.error === 'already_final')
    return res.status(400).json({ error: 'That token has already been completed or cancelled.' });

  res.json({ token: result.token });
});

module.exports = router;
