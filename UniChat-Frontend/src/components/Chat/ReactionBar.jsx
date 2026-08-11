import React from 'react';

const COMMON_EMOJIS = ['👍','❤️','😂','😮','😢','😡','🎉','🔥','⭐','💯'];

export function ReactionBar({ reactions, currentUserId, onReact }) {
  if (!reactions) return null;

  return (
    <div className="reaction-bar">
      {reactions.map(r => (
        <button
          key={r.emoji}
          className={`reaction-btn ${r.hasReacted ? 'active' : ''}`}
          onClick={() => onReact(r.emoji)}
        >
          <span className="reaction-emoji">{r.emoji}</span>
          <span className="reaction-count">{r.count}</span>
        </button>
      ))}
      <button className="reaction-btn add-reaction" title="Add reaction">
        +
      </button>
    </div>
  );
}