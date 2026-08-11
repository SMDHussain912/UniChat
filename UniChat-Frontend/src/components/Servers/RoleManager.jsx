import { useState, useEffect } from 'react';

export function RoleManager({ serverId, onClose }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${serverId}/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRoles();
  }, [serverId]);

  const handleCreate = async () => {
    if (!newRoleName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setRoles([...roles, data.role]);
        setNewRoleName('');
        setShowCreate(false);
        setSaveError(null);
      }
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleDelete = async (roleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRoles(roles.filter(r => r._id !== roleId));
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleUpdate = async (roleId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(roles.map(r => r._id === roleId ? data.role : r));
        setEditingRole(null);
        setSaveError(null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (loading) return <div className="role-manager loading">Loading roles...</div>;

  return (
    <div className="role-manager">
      <div className="role-manager-header">
        <h3>Server Roles</h3>
        <div className="role-manager-actions">
          <button className="primary-btn" onClick={() => setShowCreate(true)}>
            Create Role
          </button>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
      </div>

      {showCreate && (
        <div className="create-role-form">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Role name"
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => { setShowCreate(false); setNewRoleName(''); }}>Cancel</button>
        </div>
      )}

      {saveError && (
        <div className="error-message">{saveError}</div>
      )}

      <div className="role-list">
        {roles.map(role => (
          <div key={role._id} className="role-item">
            <div className="role-info">
              <span
                className="role-color-dot"
                style={{ backgroundColor: role.color || '#000000' }}
              />
              <span className="role-name">{role.name}</span>
              <span className="role-position">#{role.position || 0}</span>
            </div>
            <div className="role-actions">
              <button
                className="icon-btn"
                onClick={() => setEditingRole(editingRole === role._id ? null : role._id)}
              >
                Edit
              </button>
              <button
                className="icon-btn danger"
                onClick={() => handleDelete(role._id)}
              >
                Delete
              </button>
            </div>
            {editingRole === role._id && (
              <div className="role-edit-form">
                <input
                  type="text"
                  defaultValue={role.name}
                  placeholder="Role name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdate(role._id, { name: e.target.value });
                    }
                  }}
                />
                <input
                  type="color"
                  defaultValue={role.color || '#000000'}
                  onChange={(e) => handleUpdate(role._id, { color: e.target.value })}
                />
                <input
                  type="number"
                  defaultValue={role.position || 0}
                  placeholder="Position"
                  onChange={(e) => handleUpdate(role._id, { position: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}