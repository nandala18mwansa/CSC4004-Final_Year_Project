import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const PasswordResetShell = ({ children, title, subtitle }) => (
  <div className="hubtoll-login-layout">
    <div className="hubtoll-login-left">
      <div className="hubtoll-login-left-content">
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
        <div className="hubtoll-hero-body">
          <div className="hubtoll-eyebrow-row">
            <span className="hubtoll-dash" />
            <span className="hubtoll-eyebrow-text">SECURE ACCOUNT RECOVERY</span>
          </div>
          <h1 className="hubtoll-hero-heading">Departmental Management System access.</h1>
          <p className="hubtoll-hero-subheading">
            Password recovery uses secure, time-limited reset links and preserves Django password hashing.
          </p>
        </div>
        <div className="hubtoll-left-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Secure institutional access · Departmental Management System</span>
        </div>
      </div>
    </div>
    <div className="hubtoll-login-right">
      <div className="hubtoll-form-container">
        <div className="hubtoll-workspace-badge">
          <span className="hubtoll-workspace-logo">DMS</span>
          <span className="hubtoll-workspace-name">Departmental Portal</span>
          <span className="hubtoll-workspace-hint">Account recovery</span>
        </div>
        <h2 className="hubtoll-form-title">{title}</h2>
        <p className="hubtoll-form-subtitle">{subtitle}</p>
        {children}
      </div>
      <footer className="hubtoll-right-footer">
        <span>© 2026 Departmental Resource and Financial Management System</span>
      </footer>
    </div>
  </div>
);

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await api.post('password-reset/', { email: email.trim() });
      setMessage(response.data?.detail || 'If an account exists for this email address, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.email || 'Enter a valid email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PasswordResetShell
      title="Forgot Password"
      subtitle="Enter the email address associated with your DMS account. We will send you a secure link to reset your password."
    >
      <form onSubmit={handleSubmit} className="hubtoll-form">
        <div className="hubtoll-field-group">
          <label className="hubtoll-field-label">Email Address</label>
          <input
            type="email"
            className="hubtoll-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@department.com"
            autoComplete="email"
            required
          />
        </div>
        {error && <div className="hubtoll-error-alert"><span>{error}</span></div>}
        {message && <div className="hubtoll-success-alert"><span>{message}</span></div>}
        <div className="hubtoll-recovery-actions">
          <Link className="btn btn-secondary" to="/login">Back to Login</Link>
          <button type="submit" className="hubtoll-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>
    </PasswordResetShell>
  );
};

export const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await api.post('password-reset/confirm/', {
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      });
      setMessage(response.data?.detail || 'Your password has been reset successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.detail ||
        data?.password?.[0] ||
        data?.confirm_password ||
        'This password reset link is invalid or has expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PasswordResetShell
      title="Reset Password"
      subtitle="Create a new password for your DMS account."
    >
      <form onSubmit={handleSubmit} className="hubtoll-form">
        <div className="hubtoll-field-group">
          <label className="hubtoll-field-label">New Password</label>
          <div className="hubtoll-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="hubtoll-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>
        <div className="hubtoll-field-group">
          <label className="hubtoll-field-label">Confirm New Password</label>
          <div className="hubtoll-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="hubtoll-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>
        <label className="hubtoll-checkbox-row">
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show passwords
        </label>
        {error && (
          <div className="hubtoll-error-alert">
            <span>{error}</span>
            {error.includes('invalid') || error.includes('expired') ? (
              <Link to="/forgot-password">Request New Reset Link</Link>
            ) : null}
          </div>
        )}
        {message && <div className="hubtoll-success-alert"><span>{message}</span></div>}
        <div className="hubtoll-recovery-actions">
          <Link className="btn btn-secondary" to="/login">Return to Login</Link>
          <button type="submit" className="hubtoll-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </PasswordResetShell>
  );
};
