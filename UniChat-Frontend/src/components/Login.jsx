import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const { login: authLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    dateOfBirth: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Check password strength when password changes
    if (e.target.name === 'password') {
      checkPasswordStrength(e.target.value);
    }
  };

  const checkPasswordStrength = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    setPasswordRequirements(requirements);

    // Calculate strength (0-4)
    const strength = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        authLogin({ email: formData.email, password: formData.password });
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (passwordStrength < 3) {
          setError('Password is too weak. Please meet at least 3 requirements.');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/auth/register`, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        authLogin({ email: formData.email, password: formData.password });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: '',
      dateOfBirth: ''
    });
    setPasswordStrength(0);
    setPasswordRequirements({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        <p className="subtitle">{isLogin ? 'Welcome back to UniChat' : 'Create your UniChat account'}</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                placeholder="Enter your full name"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={!isLogin}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required={!isLogin}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {!isLogin && formData.password && (
            <div className="password-strength">
              <div className="strength-bar">
                <div 
                  className="strength-fill" 
                  style={{ 
                    width: `${(passwordStrength / 4) * 100}%`,
                    backgroundColor: passwordStrength <= 1 ? '#f44336' : 
                                    passwordStrength <= 2 ? '#ff9800' : 
                                    passwordStrength <= 3 ? '#ffc107' : '#4caf50'
                  }}
                ></div>
              </div>
              <div className="strength-text">
                Strength: {passwordStrength <= 1 ? 'Weak' : 
                          passwordStrength <= 2 ? 'Fair' : 
                          passwordStrength <= 3 ? 'Good' : 'Strong'}
              </div>
              <div className="password-requirements">
                <div className={`requirement ${passwordRequirements.length ? 'met' : ''}`}>
                  {passwordRequirements.length ? '✓' : '○'} At least 8 characters
                </div>
                <div className={`requirement ${passwordRequirements.uppercase ? 'met' : ''}`}>
                  {passwordRequirements.uppercase ? '✓' : '○'} One uppercase letter
                </div>
                <div className={`requirement ${passwordRequirements.lowercase ? 'met' : ''}`}>
                  {passwordRequirements.lowercase ? '✓' : '○'} One lowercase letter
                </div>
                <div className={`requirement ${passwordRequirements.number ? 'met' : ''}`}>
                  {passwordRequirements.number ? '✓' : '○'} One number
                </div>
                <div className={`requirement ${passwordRequirements.special ? 'met' : ''}`}>
                  {passwordRequirements.special ? '✓' : '○'} One special character
                </div>
              </div>
            </div>
          )}
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <div className="toggle-mode">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={toggleMode} className="toggle-btn">
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;