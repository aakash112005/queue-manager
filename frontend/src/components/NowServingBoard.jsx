import React from 'react';

export default function NowServingBoard({ serving, nextWaiting, onAssignNext }) {
  return (
    <div className="serving-board">
      <div>
        <div className="label">Now serving</div>
        {serving.length === 0 ? (
          <div className="value empty">No one being served</div>
        ) : (
          <div className="value">{serving.map((t) => t.label).join(', ')}</div>
        )}
        {nextWaiting && <div className="up-next">Up next: {nextWaiting.label}</div>}
      </div>
      <div className="actions">
        <button className="btn amber" onClick={onAssignNext} disabled={!nextWaiting}>
          Call next
        </button>
      </div>
    </div>
  );
}
