const express = require('express');
const { load } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const MINUTE = 60 * 1000;

function minutesBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / MINUTE;
}

// Rebuild "how many people were waiting" at a series of points in time,
// by replaying join / call / cancel events in order.
function queueLengthSeries(events, bucketCount, bucketMs) {
  const now = Date.now();
  const start = now - bucketCount * bucketMs;
  const sorted = [...events].sort((a, b) => new Date(a.at) - new Date(b.at));

  // Fast-forward through events before the window to get the correct
  // starting waiting count.
  let waiting = 0;
  let i = 0;
  while (i < sorted.length && new Date(sorted[i].at).getTime() < start) {
    if (sorted[i].type === 'joined') waiting += 1;
    if (sorted[i].type === 'called' || sorted[i].type === 'cancelled') waiting -= 1;
    i += 1;
  }

  const buckets = [];
  for (let b = 0; b < bucketCount; b += 1) {
    const bucketStart = start + b * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    while (i < sorted.length && new Date(sorted[i].at).getTime() < bucketEnd) {
      if (sorted[i].type === 'joined') waiting += 1;
      if (sorted[i].type === 'called' || sorted[i].type === 'cancelled') waiting -= 1;
      i += 1;
    }
    buckets.push({ t: new Date(bucketEnd).toISOString(), waiting: Math.max(waiting, 0) });
  }
  return buckets;
}

function computeMetrics(tokens, events) {
  const totalTokens = tokens.length;
  const waitingNow = tokens.filter((t) => t.status === 'waiting').length;
  const servingNow = tokens.filter((t) => t.status === 'serving').length;
  const completed = tokens.filter((t) => t.status === 'completed');
  const cancelled = tokens.filter((t) => t.status === 'cancelled');

  const waitTimes = tokens
    .filter((t) => t.calledAt)
    .map((t) => minutesBetween(t.createdAt, t.calledAt));
  const serviceTimes = completed
    .filter((t) => t.calledAt && t.completedAt)
    .map((t) => minutesBetween(t.calledAt, t.completedAt));

  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

  const todayStr = new Date().toDateString();
  const completedToday = completed.filter(
    (t) => new Date(t.completedAt).toDateString() === todayStr
  ).length;

  // Trend: average wait time per day, last 7 days.
  const waitTrend = [];
  for (let d = 6; d >= 0; d -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - d);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayTimes = tokens
      .filter((t) => t.calledAt && new Date(t.createdAt) >= day && new Date(t.createdAt) < dayEnd)
      .map((t) => minutesBetween(t.createdAt, t.calledAt));

    waitTrend.push({
      date: day.toISOString().slice(0, 10),
      avgWaitMinutes: Math.round(avg(dayTimes) * 10) / 10,
      tokens: dayTimes.length
    });
  }

  const lengthTrend = queueLengthSeries(events, 24, 60 * MINUTE); // last 24 hours, hourly

  return {
    totalTokens,
    waitingNow,
    servingNow,
    completedTotal: completed.length,
    cancelledTotal: cancelled.length,
    completedToday,
    cancellationRate: totalTokens ? Math.round((cancelled.length / totalTokens) * 1000) / 10 : 0,
    avgWaitMinutes: Math.round(avg(waitTimes) * 10) / 10,
    avgServiceMinutes: Math.round(avg(serviceTimes) * 10) / 10,
    waitTrend,
    lengthTrend
  };
}

// GET /api/analytics/overview - across all of this manager's queues
router.get('/overview', (req, res) => {
  const data = load();
  const myQueueIds = data.queues.filter((q) => q.managerId === req.manager.id).map((q) => q.id);
  const tokens = data.tokens.filter((t) => myQueueIds.includes(t.queueId));
  const events = data.events.filter((e) => myQueueIds.includes(e.queueId));

  res.json({
    queueCount: myQueueIds.length,
    metrics: computeMetrics(tokens, events)
  });
});

// GET /api/queues/:id/analytics - single queue
router.get('/queue/:id', (req, res) => {
  const data = load();
  const queue = data.queues.find((q) => q.id === req.params.id);
  if (!queue || queue.managerId !== req.manager.id) {
    return res.status(404).json({ error: 'Queue not found.' });
  }
  const tokens = data.tokens.filter((t) => t.queueId === queue.id);
  const events = data.events.filter((e) => e.queueId === queue.id);

  res.json({ queue: { id: queue.id, name: queue.name }, metrics: computeMetrics(tokens, events) });
});

module.exports = router;
