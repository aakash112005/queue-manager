import React from 'react';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export default function TicketRow({
  token,
  isTop,
  onMoveUp,
  onMoveDown,
  onAssign,
  onCancel,
  onComplete,
  disableUp,
  disableDown
}) {
  return (
    <div className="ticket-row">
      <div className="position">{String(token.position ?? '—').padStart(2, '0')}</div>
      <div className="divider" />
      <div className="info">
        <div className="name">
          {token.label} <span className={`badge ${token.status}`}>{token.status}</span>
        </div>
        <div className="meta">
          Joined {timeAgo(token.createdAt)}
          {token.note ? ` · ${token.note}` : ''}
        </div>
      </div>

      {token.status === 'waiting' && (
        <>
          <div className="reorder">
            <button className="btn ghost icon small" onClick={onMoveUp} disabled={disableUp} aria-label="Move up">
              ▲
            </button>
            <button className="btn ghost icon small" onClick={onMoveDown} disabled={disableDown} aria-label="Move down">
              ▼
            </button>
          </div>
          <div className="row-actions">
            <button className="btn amber small" onClick={onAssign} disabled={!isTop} title={!isTop ? 'Only the top token can be called' : ''}>
              Call up
            </button>
            <button className="btn danger small" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}

      {token.status === 'serving' && (
        <div className="row-actions">
          <button className="btn small" onClick={onComplete}>
            Mark served
          </button>
          <button className="btn danger small" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
