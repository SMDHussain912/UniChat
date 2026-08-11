import { useState, useEffect } from 'react';
import './UserProfile.css';

const API_URL = import.meta.env.VITE_API_URL;

function UserProfile({ userId, currentUser, onClose, onSendRequest }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState('none'); // none, pending, accepted
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phoneNo: '',
    gender: 'prefer-not-to-say',
    bio: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friend-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverId: userId })
      });

      const data = await response.json();
      
      if (response.ok) {
        setRequestStatus('pending');
        alert('Friend request sent successfully!');
        if (onSendRequest) onSendRequest();
      } else {
        alert(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request');
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEdit = () => {
    setEditForm({
      displayName: profile.displayName || '',
      phoneNo: profile.phoneNo || '',
      gender: profile.gender || 'prefer-not-to-say',
      bio: profile.bio || ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.user);
        setIsEditing(false);
        alert('Profile updated successfully!');
        // Reload profile in parent component
        if (onSendRequest) onSendRequest();
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="profile-overlay">
        <div className="profile-modal">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-overlay" onClick={onClose}>
        <div className="profile-modal">
          <p>User not found</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar-large">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} />
            ) : (
              getInitials(profile.name)
            )}
          </div>
          <h2>{profile.displayName || profile.name}</h2>
          <p className="profile-username">@{profile.name}</p>
        </div>

          <div className="profile-content">
            {profile.bio && (
              <div className="profile-section">
                <h3>Bio</h3>
                <p>{profile.bio}</p>
              </div>
            )}

            <div className="profile-section">
              <h3>Information</h3>
              {isEditing && profile.id === currentUser.id ? (
                <div className="edit-form">
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    value={editForm.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter display name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNo"
                    value={editForm.phoneNo}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleInputChange}
                  >
                    <option value="prefer-not-to-say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={editForm.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                    rows="4"
                  ></textarea>
                </div>
              </div>
            ) : (
              <div className="profile-info-grid">
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{profile.email}</span>
                </div>
                {profile.phoneNo && (
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{profile.phoneNo}</span>
                  </div>
                )}
                {profile.gender && profile.gender !== 'prefer-not-to-say' && (
                  <div className="info-item">
                    <span className="info-label">Gender:</span>
                    <span className="info-value">{profile.gender}</span>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div className="info-item">
                    <span className="info-label">Date of Birth:</span>
                    <span className="info-value">
                      {new Date(profile.dateOfBirth).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Member since:</span>
                  <span className="info-value">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {profile.id === currentUser.id && !isEditing && (
          <div className="profile-actions">
            <button 
              className="edit-profile-btn"
              onClick={handleEdit}
            >
              Edit Profile
            </button>
          </div>
        )}

        {profile.id === currentUser.id && isEditing && (
          <div className="profile-actions">
            <button 
              className="save-profile-btn"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              className="cancel-profile-btn"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        )}

        {profile.id !== currentUser.id && (
          <div className="profile-actions">
            {requestStatus === 'none' ? (
              <button 
                className="friend-request-btn"
                onClick={handleSendFriendRequest}
              >
                Send Friend Request
              </button>
            ) : (
              <button className="friend-request-btn pending" disabled>
                Request Pending
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;