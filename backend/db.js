// db.js
// A tiny, dependency-free, file-backed JSON "database".
// Good enough for a demo/assignment app; swap for Postgres/Mongo in production.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function defaultData() {
  return {
    managers: [],   // { id, username, passwordHash, createdAt }
    queues: [],     // { id, managerId, name, createdAt }
    tokens: [],     // { id, queueId, label, note, status, position, createdAt, calledAt, completedAt, cancelledAt }
    events: []      // { id, queueId, type, at }  -- used to build analytics trends
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Corrupt db.json, resetting to default.', e);
    const fresh = defaultData();
    save(fresh);
    return fresh;
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Very small in-process write queue so concurrent requests don't clobber
// each other's writes (fine for a single-instance demo server).
let queue = Promise.resolve();
function transact(fn) {
  queue = queue.then(async () => {
    const data = load();
    const result = await fn(data);
    save(data);
    return result;
  });
  return queue;
}

module.exports = { load, save, transact };
