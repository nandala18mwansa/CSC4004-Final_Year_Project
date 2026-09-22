import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import { ThemeContext } from '../context/ThemeContextValue';
import api from '../utils/api';

const moduleList = [
  {
    id: 'dashboard',
    name: 'Corporate Dashboard',
    path: '/',
    badge: 'System Overview',
    iconColor: '#f97316',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'finance',
    name: 'Finance & Budgets',
    path: '/finance',
    badge: 'Budgets & Expense Claims',
    iconColor: '#ff6b2c',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'resources',
    name: 'Department Resources',
    path: '/resources',
    badge: 'Equipment & Room Allocations',
    iconColor: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'activities',
    name: 'Department Activities',
    path: '/activities',
    badge: 'Events & Operations Calendar',
    iconColor: '#10b981',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'control',
    name: 'Control & Access',
    path: '/control',
    badge: 'User Accounts & Security',
    iconColor: '#8b5cf6',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const NOTIF_TYPE_COLORS = {
  ACTIVITY_INVITE: '#10b981',
  ACTIVITY_UPDATE: '#3b82f6',
  ACTIVITY_CANCEL: '#ef4444',
  EXPENSE_SUBMITTED: '#f97316',
  EXPENSE_APPROVED: '#16a34a',
  EXPENSE_REJECTED: '#dc2626',
  RESOURCE_ASSIGNED: '#8b5cf6',
  RESOURCE_BOOKING: '#2563eb',
  RESOURCE_APPROVED: '#16a34a',
  RESOURCE_REJECTED: '#dc2626',
  ACTIVITY_SUBMITTED: '#f97316',
  ACTIVITY_APPROVED: '#16a34a',
  ACTIVITY_REJECTED: '#dc2626',
  REPORT_REJECTED: '#dc2626',
  GENERAL: '#64748b',
};

const NOTIF_TYPE_ICONS = {
  ACTIVITY_INVITE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  ACTIVITY_UPDATE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  ACTIVITY_CANCEL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  EXPENSE_SUBMITTED: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  EXPENSE_APPROVED: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  EXPENSE_REJECTED: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  RESOURCE_ASSIGNED: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  RESOURCE_BOOKING: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  GENERAL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const timeAgo = (isoString) => {
  const now = new Date();
  const then = new Date(isoString);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const Topbar = ({ sidebarCollapsed, onToggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'dark';

  const [currentTime, setCurrentTime] = useState('');
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const launcherRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const allowedModules = moduleList.filter((m) => !m.adminOnly || user?.role === 'ADMIN');
  const effectiveRole = user?.has_finance_privilege || user?.has_resource_privilege || user?.has_activity_privilege
    ? [
        user?.has_finance_privilege ? 'Finance' : null,
        user?.has_resource_privilege ? 'Resources' : null,
        user?.has_activity_privilege ? 'Activities' : null,
      ].filter(Boolean).join(' + ')
    : (user?.role === 'ADMIN' ? 'Control' : 'Staff');

  // Active module title
  const activeModuleTitle = (() => {
    const found = moduleList.find((m) => location.pathname === m.path || (m.path !== '/' && location.pathname.startsWith(m.path)));
    return found?.name || 'Departmental Management System';
  })();

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (launcherRef.current && !launcherRef.current.contains(e.target)) setLauncherOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('notifications/?limit=20'),
        api.get('notifications/unread-count/'),
      ]);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : (notifRes.data.results || []));
      setUnreadCount(countRes.data.unread_count || 0);
    } catch {
      // Fail silently — notification errors should never break the UI
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const handleMarkRead = async (notifId) => {
    try {
      await api.post(`notifications/${notifId}/mark-read/`);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = (notif) => {
    if (!notif.is_read) handleMarkRead(notif.id);
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/[\s_\-]+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <header className="hubtoll-topbar">
      {/* Left: Brand & Hamburger */}
      <div className="hubtoll-topbar-left">
        <div className="hubtoll-topbar-brand" onClick={() => navigate('/')}>
          <span className="hubtoll-logo-icon">
            <svg viewBox="0 0 28 28" fill="none" width="22" height="22">
              <rect x="2" y="2" width="10" height="24" rx="2.5" fill="#f97316" />
              <rect x="16" y="2" width="10" height="24" rx="2.5" fill="#f97316" />
              <rect x="12" y="10" width="4" height="8" rx="1" fill="#ffffff" />
            </svg>
          </span>
          <span className="hubtoll-brand-text">Department Management</span>
        </div>

        <button
          type="button"
          className="hubtoll-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {sidebarCollapsed && (
          <div className="hubtoll-collapsed-title">
            <span>{activeModuleTitle}</span>
          </div>
        )}
      </div>

      {/* Right: Launcher, Notifications, Time, Profile */}
      <div className="hubtoll-topbar-right">

        {/* 9-Dots App Launcher */}
        <div className="hubtoll-dropdown-container" ref={launcherRef}>
          <button
            type="button"
            className={`hubtoll-icon-btn ${launcherOpen ? 'active' : ''}`}
            onClick={() => setLauncherOpen(!launcherOpen)}
            title="Switch module"
            aria-label="Module Launcher"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
            </svg>
          </button>

          {launcherOpen && (
            <div className="hubtoll-launcher-popover">
              <div className="hubtoll-popover-header">
                <span className="hubtoll-popover-title">Department Modules</span>
                <span className="hubtoll-popover-sub">Departmental Management System</span>
              </div>
              <div className="hubtoll-launcher-grid">
                {allowedModules.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`hubtoll-launcher-item ${location.pathname === item.path ? 'current' : ''}`}
                    onClick={() => { navigate(item.path); setLauncherOpen(false); }}
                  >
                    <div className="hubtoll-launcher-icon" style={{ color: item.iconColor }}>{item.icon}</div>
                    <div className="hubtoll-launcher-info">
                      <span className="hubtoll-launcher-name">{item.name}</span>
                      <span className="hubtoll-launcher-badge">{item.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="hubtoll-dropdown-container" ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`hubtoll-icon-btn ${notifOpen ? 'active' : ''}`}
            onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
            title="Notifications"
            aria-label="Notifications"
            style={{ position: 'relative' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '3px', right: '3px',
                background: '#ef4444', color: '#fff',
                borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                minWidth: '17px', height: '17px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1, border: '2px solid var(--topbar-bg, #1e293b)',
                pointerEvents: 'none',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: '360px', maxHeight: '480px',
              background: isDark ? '#181C23' : '#ffffff',
              border: `1px solid ${isDark ? '#303743' : '#e2e8f0'}`,
              borderRadius: '12px',
              boxShadow: isDark ? '0 18px 45px rgba(0,0,0,0.45)' : '0 18px 45px rgba(15,23,42,0.16)',
              zIndex: 9999, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px 10px', borderBottom: `1px solid ${isDark ? '#303743' : '#e5e7eb'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: isDark ? '#F4F6F8' : '#0f172a' }}>Notifications</div>
                  {unreadCount > 0 && (
                    <div style={{ fontSize: '11px', color: isDark ? '#AAB3C2' : '#64748b', marginTop: '1px' }}>
                      {unreadCount} unread
                    </div>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      fontSize: '11px', color: isDark ? '#93c5fd' : '#1d4ed8', background: isDark ? '#1D222B' : '#eff6ff', border: `1px solid ${isDark ? '#303743' : '#bfdbfe'}`,
                      cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
                      fontWeight: 600,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: isDark ? '#AAB3C2' : '#64748b', fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px', opacity: 0.5, fontSize: '24px' }}>🔔</div>
                    <div>No notifications yet</div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const typeColor = NOTIF_TYPE_COLORS[notif.notification_type] || NOTIF_TYPE_COLORS.GENERAL;
                    const typeIcon = NOTIF_TYPE_ICONS[notif.notification_type] || NOTIF_TYPE_ICONS.GENERAL;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          display: 'flex', gap: '10px', padding: '11px 16px',
                          cursor: notif.link ? 'pointer' : 'default',
                          background: notif.is_read ? (isDark ? '#181C23' : '#ffffff') : (isDark ? '#1D222B' : '#f8fbff'),
                          borderBottom: `1px solid ${isDark ? '#303743' : '#eef2f7'}`,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#222833' : '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = notif.is_read ? (isDark ? '#181C23' : '#ffffff') : (isDark ? '#1D222B' : '#f8fbff'); }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: `${typeColor}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: typeColor, marginTop: '1px',
                        }}>
                          {typeIcon}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: notif.is_read ? 500 : 700,
                            fontSize: '13px', color: isDark ? '#F4F6F8' : '#0f172a',
                            marginBottom: '2px', lineHeight: '1.3',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {notif.title}
                          </div>
                          <div style={{
                            fontSize: '12px', color: isDark ? '#AAB3C2' : '#475569',
                            lineHeight: '1.4', marginBottom: '3px',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: '11px', color: isDark ? '#778292' : '#64748b' }}>
                            {timeAgo(notif.created_at)}
                          </div>
                        </div>
                        {/* Unread dot */}
                        {!notif.is_read && (
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#3b82f6', flexShrink: 0, marginTop: '8px',
                          }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Time / Timezone Pill */}
        <div className="hubtoll-time-pill" title="Current system time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>{currentTime || 'GMT+2'}</span>
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div className="hubtoll-dropdown-container" ref={profileRef}>
          <button
            type="button"
            className="hubtoll-avatar-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User profile menu"
            title={`${user?.username || 'User'} (${user?.role || 'Member'})`}
          >
            <span>{getInitials(user?.username)}</span>
          </button>

          {profileOpen && (
            <div className="hubtoll-profile-popover">
              <div className="hubtoll-profile-header">
                <div className="hubtoll-profile-avatar-large">
                  {getInitials(user?.username)}
                </div>
                <div className="hubtoll-profile-details">
                  <div className="hubtoll-profile-name">{user?.username || 'User'}</div>
                  <div className="hubtoll-profile-role">{effectiveRole}</div>
                  <div className="hubtoll-profile-dept">{user?.department || 'Department Staff'}</div>
                </div>
              </div>

              <div className="hubtoll-profile-actions">
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="hubtoll-profile-menu-item"
                    onClick={() => { navigate('/control'); setProfileOpen(false); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Control & User Access</span>
                  </button>
                )}

                <button
                  type="button"
                  className="hubtoll-profile-menu-item"
                  onClick={toggleTheme}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
                </button>

                <div className="hubtoll-popover-divider" />

                <button
                  type="button"
                  className="hubtoll-profile-menu-item hubtoll-signout-item"
                  onClick={handleLogout}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
