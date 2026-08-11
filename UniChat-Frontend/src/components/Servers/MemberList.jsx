import { useState, useEffect } from 'react';

export function MemberList({ serverId, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('joinedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingMember, setEditingMember] = useState(null);
  const [nickname, setNickname] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/servers/${serverId}/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllRoles(data.roles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    }
    fetchRoles();
  }, [serverId]);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: searchQuery,
        sortBy,
        sortOrder
      });
      const res = await fetch(`/api/servers/${serverId}/members?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [serverId, page, searchQuery, sortBy, sortOrder]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleNicknameUpdate = async (memberId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/members/${memberId}/nickname`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nickname })
      });
      if (res.ok) {
        fetchMembers();
        setEditingMember(null);
        setNickname('');
      }
    } catch (error) {
      console.error('Error updating nickname:', error);
    }
  };

  const handleRoleUpdate = async (memberId, roleIds) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/servers/${serverId}/members/${memberId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roleIds })
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (error) {
      console.error('Error updating roles:', error);
    }
  };

  if (loading) return <div className="member-list loading">Loading members...</div>;

  return (
    <div className="member-list">
      <div className="member-list-header">
        <h3>Members</h3>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="member-search">
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={handleSearch}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="joinedAt">Join Date</option>
          <option value="name">Name</option>
          <option value="role">Role</option>
        </select>
        <button
          className="icon-btn"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="member-items">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-avatar">
              {member.avatar ? (
                <img src={member.avatar} alt={member.displayName} />
              ) : (
                <span className="avatar-placeholder">
                  {(member.displayName || member.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className={`online-dot ${member.isOnline ? 'online' : 'offline'}`} />
            </div>
            <div className="member-info">
              <span className="member-name">
                {member.displayName || member.name}
                {member.nickname && <span className="member-nickname"> (@{member.nickname})</span>}
              </span>
              <span className="member-role-badge">{member.role}</span>
              <span className="member-join-date">
                Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div className="member-actions">
              <button
                className="icon-btn"
                onClick={() => {
                  setEditingMember(editingMember === member.id ? null : member.id);
                  setNickname(member.nickname || '');
                }}
              >
                Nickname
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  const memberRoles = member.memberRoles
                    ? member.memberRoles.map(r => r.id)
                    : [];
                  setSelectedRoles(selectedRoles.includes(member.id) ? [] : memberRoles);
                  if (selectedRoles.includes(member.id)) {
                    handleRoleUpdate(member.id, []);
                  }
                }}
              >
                Roles
              </button>
            </div>
            {editingMember === member.id && (
              <div className="nickname-edit-form">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Set nickname"
                  maxLength={32}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNicknameUpdate(member.id);
                  }}
                />
                <button onClick={() => handleNicknameUpdate(member.id)}>Save</button>
                <button onClick={() => { setEditingMember(null); setNickname(''); }}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}