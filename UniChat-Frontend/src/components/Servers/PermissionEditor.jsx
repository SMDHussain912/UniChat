import { useState } from 'react';

const ALL_PERMISSIONS = [
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'MANAGE_MESSAGES',
  'MANAGE_CHANNELS',
  'MANAGE_ROLES',
  'MANAGE_SERVER',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'MUTE_MEMBERS',
  'DEAFEN_MEMBERS',
  'MOVE_MEMBERS',
  'CONNECT',
  'CREATE_INSTANT_INVITE',
  'MANAGE_NICKNAMES',
  'MANAGE_WEBHOOKS',
  'USE_APPLICATION_COMMANDS',
  'PRIORITY_SPEAKER'
];

const PERMISSION_CATEGORIES = {
  'General': ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT', 'PRIORITY_SPEAKER'],
  'Channel Management': ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'],
  'Server Management': ['MANAGE_SERVER', 'MANAGE_ROLES', 'MANAGE_NICKNAMES', 'MANAGE_WEBHOOKS'],
  'Moderation': ['KICK_MEMBERS', 'BAN_MEMBERS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'],
  'Invites': ['CREATE_INSTANT_INVITE'],
  'Commands': ['USE_APPLICATION_COMMANDS']
};

export function PermissionEditor({ permissions, onChange }) {
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(PERMISSION_CATEGORIES)
  );

  const toggleCategory = (category) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handlePermissionChange = (permName, granted) => {
    const updated = [...permissions];
    const existing = updated.find(p => p.name === permName);
    if (existing) {
      existing.granted = granted;
    } else {
      updated.push({ name: permName, granted });
    }
    onChange(updated);
  };

  const toggleAllInCategory = (categoryPerms, granted) => {
    const updated = [...permissions];
    categoryPerms.forEach(permName => {
      const existing = updated.find(p => p.name === permName);
      if (existing) {
        existing.granted = granted;
      } else {
        updated.push({ name: permName, granted });
      }
    });
    onChange(updated);
  };

  return (
    <div className="permission-editor">
      {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPerms]) => (
        <div key={category} className="permission-category">
          <div
            className="permission-category-header"
            onClick={() => toggleCategory(category)}
          >
            <span className="category-toggle">
              {expandedCategories.includes(category) ? '▼' : '▶'}
            </span>
            <span className="category-name">{category}</span>
            <button
              type="button"
              className="text-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleAllInCategory(categoryPerms, true);
              }}
            >
              All Allow
            </button>
            <button
              type="button"
              className="text-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleAllInCategory(categoryPerms, false);
              }}
            >
              All Deny
            </button>
          </div>
          {expandedCategories.includes(category) && (
            <div className="permission-list">
              {categoryPerms.map(permName => {
                const perm = permissions.find(p => p.name === permName);
                const granted = perm ? perm.granted : true;
                return (
                  <div key={permName} className="permission-item">
                    <label className="permission-label">
                      <input
                        type="checkbox"
                        checked={granted}
                        onChange={(e) => handlePermissionChange(permName, e.target.checked)}
                      />
                      <span className="permission-name">{permName.replace(/_/g, ' ')}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}