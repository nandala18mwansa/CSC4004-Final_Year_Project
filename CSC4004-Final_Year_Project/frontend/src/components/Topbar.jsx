import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import { ThemeContext } from '../context/ThemeContextValue';

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

const Topbar = ({ sidebarCollapsed, onToggleSidebar }) => {
  const { user, logoutUser } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const launcherRef = useRef(null);
  const profileRef = useRef(null);

  // Live ticking clock with GMT+2 format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentTime(`GMT+2 ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (launcherRef.current && !launcherRef.current.contains(e.target)) {
        setLauncherOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'DM';
    return name.slice(0, 2).toUpperCase();
  };

  // Get active module title based on current path
  const currentPath = location.pathname;
  let activeModuleTitle = 'Corporate Dashboard';
  if (currentPath.startsWith('/finance')) {
    activeModuleTitle = 'Department Finance & Budgets';
  } else if (currentPath.startsWith('/resources')) {
    activeModuleTitle = 'Department Resources & Assets';
  } else if (currentPath.startsWith('/activities')) {
    activeModuleTitle = 'Activities & Event Scheduling';
  } else if (currentPath.startsWith('/control') || currentPath.startsWith('/admin')) {
    activeModuleTitle = 'User Access & System Control';
  }

  const allowedModules = moduleList.filter(
    (m) => !m.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <header className="hubtoll-topbar">
      {/* Left: Accurate Brand & Hamburger Toggle */}
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

        {/* Dynamic Title (visible when collapsed) */}
        {sidebarCollapsed && (
          <div className="hubtoll-collapsed-title">
            <span>{activeModuleTitle}</span>
          </div>
        )}
      </div>

      {/* Right: Module Launcher, Time Pill, Profile Avatar */}
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
              <circle cx="5" cy="5" r="2" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
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
                    onClick={() => {
                      navigate(item.path);
                      setLauncherOpen(false);
                    }}
                  >
                    <div className="hubtoll-launcher-icon" style={{ color: item.iconColor }}>
                      {item.icon}
                    </div>
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
                  <div className="hubtoll-profile-role">{user?.role || 'MEMBER'}</div>
                  <div className="hubtoll-profile-dept">{user?.department || 'Department Staff'}</div>
                </div>
              </div>

              <div className="hubtoll-profile-actions">
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="hubtoll-profile-menu-item"
                    onClick={() => {
                      navigate('/control');
                      setProfileOpen(false);
                    }}
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
