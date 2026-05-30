import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await loginUser(username, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login failed. Check your credentials and try again.');
    }
  };

  return (
    <div className="login-shell">
      <div className="login-background" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="glass-panel login-form-wrap module-card">
        <div className="login-heading page-toolbar">
          <div>
            <p className="login-eyebrow">Department Dashboard</p>
            <h1 className="page-title">Secure sign in</h1>
            <p className="login-description">Access your finance, activities, and resource planning tools securely.</p>
          </div>
          <div className="header-actions">
            <a href="#" className="link-muted">Need help?</a>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%', marginTop: '1rem' }}>
            {isSubmitting ? <span className="spinner" /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
