import { useState, useEffect } from 'react';

export function ChannelSettings({ channelId, serverId, onClose, onUpdate }) {
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topic: '',
    nsfw: false,
    rateLimitPerUser: 0,
    isVisible: true
  });

  useEffect(() => {
    async function fetchChannel() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/channels/${channelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChannel(data.channel);
          setFormData({
            name: data.channel.name || '',
            description: data.channel.description || '',
            topic: data.channel.topic || '',
            nsfw: data.channel.nsfw || false,
            rateLimitPerUser: data.channel.rateLimitPerUser || 0,
            isVisible: data.channel.isVisible !== false
          });
        }
      } catch (error) {
        console.error('Error fetching channel:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchChannel();
  }, [channelId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdate) onUpdate(data.channel);
      }
    } catch (error) {
      console.error('Error updating channel:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="channel-settings loading">Loading channel settings...</div>;

  return (
    <div className="channel-settings">
      <div className="channel-settings-header">
        <h3>Channel Settings</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Channel Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            maxLength={100}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            maxLength={500}
          />
        </div>
        <div className="form-group">
          <label>Topic</label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            maxLength={1024}
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.nsfw}
              onChange={(e) => setFormData(prev => ({ ...prev, nsfw: e.target.checked }))}
            />
            NSFW Channel
          </label>
        </div>
        <div className="form-group">
          <label>Slow Mode (seconds, 0 = off)</label>
          <input
            type="number"
            min="0"
            value={formData.rateLimitPerUser}
            onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerUser: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.isVisible}
              onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
            />
            Channel Visible
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