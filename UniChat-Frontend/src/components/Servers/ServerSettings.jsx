import { useState, useEffect } from 'react';
import './Servers.css';

export function ServerSettings({ serverId, onClose, onUpdate }) {
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    verificationLevel: 'none',
    isPublic: true,
    discoveryEnabled: false
  });

  useEffect(() => {
    async function fetchServer() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setServer(data.server);
          setFormData({
            name: data.server.name || '',
            description: data.server.description || '',
            verificationLevel: data.server.verificationLevel || 'none',
            isPublic: data.server.isPublic !== false,
            discoveryEnabled: data.server.discoveryEnabled || false
          });
        }
      } catch (error) {
        console.error('Error fetching server:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchServer();
  }, [serverId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdate) onUpdate(data.server);
      }
    } catch (error) {
      console.error('Error updating server:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="server-settings loading">Loading server settings...</div>;

  return (
    <div className="server-settings">
      <div className="server-settings-header">
        <h3>Server Settings</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Server Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            maxLength={100}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Verification Level</label>
          <select
            value={formData.verificationLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, verificationLevel: e.target.value }))}
          >
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="very_high">Very High</option>
          </select>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
            />
            Public Server
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.discoveryEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, discoveryEnabled: e.target.checked }))}
            />
            Enable Discovery
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}