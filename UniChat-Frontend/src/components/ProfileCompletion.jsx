import { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfileCompletion.css';

const API_URL = import.meta.env.VITE_API_URL;

function ProfileCompletion({ user, onComplete }) {
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNo: '',
    gender: 'prefer-not-to-say',
    dateOfBirth: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing profile data if available
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phoneNo: user.phoneNo || '',
        gender: user.gender || 'prefer-not-to-say',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/profile/complete`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Update user in localStorage
        const updatedUser = { ...user, ...response.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        onComplete(updatedUser);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-completion-overlay">
      <div className="profile-completion-modal">
        <div className="profile-completion-header">
          <h2>Complete Your Profile</h2>
          <p>Please fill in your details to get started</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">Display Name *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
              placeholder="How you want to be called"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNo">Phone Number *</label>
            <input
              type="tel"
              id="phoneNo"
              name="phoneNo"
              value={formData.phoneNo}
              onChange={handleChange}
              required
              placeholder="+1234567890"
              pattern="[+]?[0-9]{10,15}"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender *</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="prefer-not-to-say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth *</label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio (Optional)</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              maxLength={500}
              rows={3}
            />
            <span className="char-count">{formData.bio.length}/500</span>
          </div>

          <div className="form-group">
            <label htmlFor="avatar">Profile Picture (Optional)</label>
            <input
              type="file"
              id="avatar"
              name="avatar"
              accept="image/*"
              onChange={(e) => {
                // Handle file upload - you can implement this later
                console.log('Avatar selected:', e.target.files[0]);
              }}
            />
            <small>You can add a profile picture later</small>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileCompletion;