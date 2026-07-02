import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [queues, setQueues] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.listQueues();
      setQueues(data.queues);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createQueue(name.trim());
      setName('');
      setCreating(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Your queues</h1>
          <p className="sub">Create a queue for each counter, desk, or service line you run.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {queues === null ? (
        <div className="loading-line">Loading queues…</div>
      ) : (
        <div className="queue-grid">
          {queues.map((q) => (
            <Link key={q.id} to={`/queues/${q.id}`} className="queue-card">
              <h3>{q.name}</h3>
              <div className="stats">
                <div>
                  <div className="stat-num">{q.waitingCount}</div>
                  <div className="stat-label">Waiting</div>
                </div>
                <div>
                  <div className="stat-num">{q.servingCount}</div>
                  <div className="stat-label">Serving</div>
                </div>
              </div>
            </Link>
          ))}

          {creating ? (
            <form className="queue-card" onSubmit={handleCreate} style={{ justifyContent: 'center' }}>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="new-queue-name">Queue name</label>
                <input
                  id="new-queue-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pharmacy counter"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn small" type="submit" disabled={busy}>
                  Create
                </button>
                <button
                  className="btn small ghost"
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className="new-queue-card" onClick={() => setCreating(true)}>
              <span style={{ fontSize: 22 }}>+</span>
              <span>New queue</span>
            </button>
          )}
        </div>
      )}

      {queues && queues.length === 0 && !creating && (
        <div className="empty-state">No queues yet — create your first one above.</div>
      )}
    </div>
  );
}
