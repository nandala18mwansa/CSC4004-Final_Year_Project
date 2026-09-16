import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextValue';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await loginUser(identifier.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login failed. Check your credentials and try again.');
    }
  };

  return (
    <div className="hubtoll-login-layout">
      {/* Left Panel: Institutional Portal & Value Proposition */}
      <div className="hubtoll-login-left">
        <div className="hubtoll-login-left-content">
          {/* Brand Badge */}
          <div className="hubtoll-brand-badge">
            <span className="hubtoll-logo-icon">
              <svg viewBox="0 0 28 28" fill="none" width="22" height="22">
                <rect x="2" y="2" width="10" height="24" rx="2.5" fill="#f97316" />
                <rect x="16" y="2" width="10" height="24" rx="2.5" fill="#f97316" />
                <rect x="12" y="10" width="4" height="8" rx="1" fill="#ffffff" />
              </svg>
            </span>
            <span className="hubtoll-logo-text">DMS Portal</span>
          </div>

          {/* Hero Section */}
          <div className="hubtoll-hero-body">
            <div className="hubtoll-eyebrow-row">
              <span className="hubtoll-dash" />
              <span className="hubtoll-eyebrow-text">DEPARTMENTAL OPERATIONS SUITE</span>
            </div>

            <h1 className="hubtoll-hero-heading">
              Departmental Resource & Financial Management.
            </h1>

            <p className="hubtoll-hero-subheading">
              Budgets, expense approvals, resource allocations, and activities — unified in one secure departmental platform.
            </p>

            {/* Feature Highlights Matching System Backbone */}
            <div className="hubtoll-features-list">
              <div className="hubtoll-feature-item">
                <div className="hubtoll-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="hubtoll-feature-text">
                  <h3>Financial Control</h3>
                  <p>Submit expense requests, track live balances, and verify budget disbursements.</p>
                </div>
              </div>

              <div className="hubtoll-feature-item">
                <div className="hubtoll-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div className="hubtoll-feature-text">
                  <h3>Resource Allocation</h3>
                  <p>Reserve rooms, equipment, and IT hardware for departmental activities.</p>
                </div>
              </div>

              <div className="hubtoll-feature-item">
                <div className="hubtoll-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="hubtoll-feature-text">
                  <h3>Activity Coordination</h3>
                  <p>Schedule departmental sessions, seminars, and calendar events.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="hubtoll-left-footer">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secure institutional access · Departmental Management System</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Clean Functional Sign In Form */}
      <div className="hubtoll-login-right">
        {/* Center Card */}
        <div className="hubtoll-form-container">
          <div className="hubtoll-workspace-badge">
            <span className="hubtoll-workspace-logo">DMS</span>
            <span className="hubtoll-workspace-name">Departmental Portal</span>
            <span className="hubtoll-workspace-hint">Sign in to continue</span>
          </div>

          <h2 className="hubtoll-form-title">Welcome back</h2>
          <p className="hubtoll-form-subtitle">Enter your credentials to access your departmental tools.</p>

          <form onSubmit={handleSubmit} className="hubtoll-form">
            <div className="hubtoll-field-group">
              <label className="hubtoll-field-label">Username or Email *</label>
              <div className="hubtoll-input-wrapper">
                <input
                  type="text"
                  className="hubtoll-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. Momo or user@department.com"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="hubtoll-field-group">
              <label className="hubtoll-field-label">Password *</label>
              <div className="hubtoll-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="hubtoll-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="hubtoll-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="hubtoll-error-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="hubtoll-btn-signin" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="hubtoll-spinner" />
              ) : (
                <>
                  <span>Sign in</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Footer */}
        <footer className="hubtoll-right-footer">
          <span>© 2026 Departmental Resource and Financial Management System</span>
        </footer>
      </div>
    </div>
  );
};

export default Login;
