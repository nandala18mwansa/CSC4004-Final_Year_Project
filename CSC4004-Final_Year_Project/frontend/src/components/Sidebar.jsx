import { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextValue';
import './Sidebar.css';

const Sidebar = ({ collapsed }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine current active module info accurately based on system backbone
  let activeModule = {
    title: 'Corporate Dashboard',
    subLabel: 'Department overview',
    iconColor: '#f97316',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  };

  if (currentPath.startsWith('/finance')) {
    activeModule = {
      title: 'Finance & Budgets',
      subLabel: 'Department budgets & expenses',
      iconColor: '#ff6b2c',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    };
  } else if (currentPath.startsWith('/resources')) {
    activeModule = {
      title: 'Department Resources',
      subLabel: 'Equipment & venue allocations',
      iconColor: '#3b82f6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    };
  } else if (currentPath.startsWith('/activities')) {
    activeModule = {
      title: 'Department Activities',
      subLabel: 'Event & session scheduling',
      iconColor: '#10b981',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    };
  } else if (currentPath.startsWith('/control') || currentPath.startsWith('/admin')) {
    activeModule = {
      title: 'Control & Access',
      subLabel: 'User security & permissions',
      iconColor: '#8b5cf6',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    };
  }

  return (
    <aside className={`hubtoll-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* 1. Top Active Module Card */}
      {!collapsed ? (
        <div className="hubtoll-active-module-card">
          <div className="hubtoll-active-module-icon-box" style={{ background: activeModule.iconColor }}>
            {activeModule.icon}
          </div>
          <div className="hubtoll-active-module-info">
            <span className="hubtoll-active-module-eyebrow">ACTIVE MODULE</span>
            <span className="hubtoll-active-module-title">{activeModule.title}</span>
          </div>
        </div>
      ) : (
        <div className="hubtoll-rail-active-pill" title={activeModule.title}>
          <div className="hubtoll-rail-icon-box" style={{ background: activeModule.iconColor }}>
            {activeModule.icon}
          </div>
        </div>
      )}

      {/* 2. Menu Section Header */}
      {!collapsed && (
        <div className="hubtoll-menu-label">
          <span>NAVIGATION</span>
        </div>
      )}

      {/* 3. Navigation List - 100% Functional Links */}
      <nav className="hubtoll-nav-list">
        {/* Corporate Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `hubtoll-nav-link ${isActive ? 'active' : ''}`
          }
          title="Corporate Dashboard"
        >
          <span className="hubtoll-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          {!collapsed && <span className="hubtoll-nav-text">Corporate Dashboard</span>}
        </NavLink>

        {/* Finance & Budgets */}
        <NavLink
          to="/finance"
          className={({ isActive }) =>
            `hubtoll-nav-link ${isActive ? 'active' : ''}`
          }
          title="Finance & Budgets"
        >
          <span className="hubtoll-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          {!collapsed && <span className="hubtoll-nav-text">Finance & Budgets</span>}
        </NavLink>

        {/* Resources & Assets */}
        <NavLink
          to="/resources"
          className={({ isActive }) =>
            `hubtoll-nav-link ${isActive ? 'active' : ''}`
          }
          title="Department Resources"
        >
          <span className="hubtoll-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </span>
          {!collapsed && <span className="hubtoll-nav-text">Resources & Assets</span>}
        </NavLink>

        {/* Activities & Events */}
        <NavLink
          to="/activities"
          className={({ isActive }) =>
            `hubtoll-nav-link ${isActive ? 'active' : ''}`
          }
          title="Department Activities"
        >
          <span className="hubtoll-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          {!collapsed && <span className="hubtoll-nav-text">Activities & Events</span>}
        </NavLink>

        {/* Control & Access (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <NavLink
            to="/control"
            className={({ isActive }) =>
              `hubtoll-nav-link ${isActive ? 'active' : ''}`
            }
            title="Control & Access"
          >
            <span className="hubtoll-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            {!collapsed && <span className="hubtoll-nav-text">Control</span>}
          </NavLink>
        )}
      </nav>

      {/* Rail Mode Bottom Avatar */}
      {collapsed && (
        <div className="hubtoll-rail-footer">
          <div className="hubtoll-rail-avatar" title={user?.username || 'User'}>
            {(user?.username || 'DM').slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
