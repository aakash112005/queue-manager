import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import TicketRow from '../components/TicketRow.jsx';
import NowServingBoard from '../components/NowServingBoard.jsx';

export default function QueueView() {
  const { id } = useParams();
  const [queue, setQueue] = useState(null);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      const [q, tokens] = await Promise.all([api.getQueue(id), api.listTokens(id)]);
      setQueue(q.queue);
      setRoster(tokens);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function withRefresh(action) {
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddToken(e) {
    e.preventDefault();
    if (!label.trim()) return;
    await withRefresh(async () => {
      await api.addToken(id, label.trim(), note.trim());
      setLabel('');
      setNote('');
    });
  }

  if (!queue || !roster) {
    return <div className="loading-line">{error || 'Loading queue…'}</div>;
  }

  const waiting = roster.waiting;
  const topToken = waiting[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/queues" style={{ fontSize: 13, color: 'var(--ink-soft)', textDecoration: 'none' }}>
            ← All queues
          </Link>
          <h1 style={{ marginTop: 6 }}>{queue.name}</h1>
          <p className="sub">{waiting.length} waiting · {roster.serving.length} being served</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <NowServingBoard
        serving={roster.serving}
        nextWaiting={topToken}
        onAssignNext={() => topToken && withRefresh(() => api.assignToken(topToken.id))}
      />

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <h3>Add a person to the queue</h3>
        <form className="add-token-form" onSubmit={handleAddToken}>
          <input
            placeholder="Name (e.g. Priya Nair)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <input
            placeholder="Note (optional, e.g. reason for visit)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn" type="submit">
            Add token
          </button>
        </form>
      </div>

      {roster.serving.length > 0 && (
        <>
          <div className="section-title">Being served</div>
          <div className="ticket-list">
            {roster.serving.map((t) => (
              <TicketRow
                key={t.id}
                token={t}
                onComplete={() => withRefresh(() => api.completeToken(t.id))}
                onCancel={() => withRefresh(() => api.cancelToken(t.id))}
              />
            ))}
          </div>
        </>
      )}

      <div className="section-title">Waiting ({waiting.length})</div>
      {waiting.length === 0 ? (
        <div className="empty-state">No one is waiting. Add a token above to get started.</div>
      ) : (
        <div className="ticket-list">
          {waiting.map((t, idx) => (
            <TicketRow
              key={t.id}
              token={t}
              isTop={idx === 0}
              disableUp={idx === 0}
              disableDown={idx === waiting.length - 1}
              onMoveUp={() => withRefresh(() => api.moveToken(t.id, 'up'))}
              onMoveDown={() => withRefresh(() => api.moveToken(t.id, 'down'))}
              onAssign={() => withRefresh(() => api.assignToken(t.id))}
              onCancel={() => withRefresh(() => api.cancelToken(t.id))}
            />
          ))}
        </div>
      )}

      {roster.history.length > 0 && (
        <>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>History</span>
            <button className="btn ghost small" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Hide' : `Show (${roster.history.length})`}
            </button>
          </div>
          {showHistory && (
            <div className="ticket-list">
              {roster.history.map((t) => (
                <TicketRow key={t.id} token={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
