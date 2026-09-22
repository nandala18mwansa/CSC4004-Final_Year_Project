import { useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContextValue';
import Modal from '../components/Modal';
const Control = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuUserId, setActionMenuUserId] = useState(null);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'create_user', 'edit_user', 'reset_password', 'create_category'
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [activeUser, setActiveUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [department, setDepartment] = useState('');
  const [userCategory, setUserCategory] = useState('');
  const [hasFinancePrivilege, setHasFinancePrivilege] = useState(false);
  const [hasFinanceBalanceAccess, setHasFinanceBalanceAccess] = useState(false);
  const [hasResourcePrivilege, setHasResourcePrivilege] = useState(false);
  const [hasActivityPrivilege, setHasActivityPrivilege] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const loadUsers = async () => {
    try {
      const response = await api.get('users-admin/');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users', err);
      setError('Unable to load user list.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCategories = async () => {
    try {
      const response = await api.get('user-categories/');
      setUserCategories(response.data);
    } catch (err) {
      console.error('Failed to load user categories', err);
      setError('Unable to load user categories.');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
      loadUserCategories();
      const interval = setInterval(() => {
        loadUsers();
        loadUserCategories();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setError('Access denied. Control privileges required.');
      setLoading(false);
    }
  }, [user]);

  const openCreateUserModal = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setRole('STAFF');
    setDepartment('');
    setUserCategory('');
    setHasFinancePrivilege(false);
    setHasFinanceBalanceAccess(false);
    setHasResourcePrivilege(false);
    setHasActivityPrivilege(false);
    setIsActive(true);
    setError('');
    setModalType('create_user');
  };

  const openEditUserModal = (targetUser) => {
    setActiveUser(targetUser);
    setUsername(targetUser.username);
    setEmail(targetUser.email || '');
    setRole(targetUser.role);
    setDepartment(targetUser.department || '');
    setUserCategory(targetUser.user_category || '');
    setHasFinancePrivilege(Boolean(targetUser.has_finance_privilege));
    setHasFinanceBalanceAccess(Boolean(targetUser.has_finance_balance_access));
    setHasResourcePrivilege(Boolean(targetUser.has_resource_privilege));
    setHasActivityPrivilege(Boolean(targetUser.has_activity_privilege));
    setIsActive(targetUser.is_active);
    setError('');
    setModalType('edit_user');
  };

  const openCreateCategoryModal = () => {
    setCategoryName('');
    setCategoryDescription('');
    setError('');
    setModalType('create_category');
  };

  const openResetPasswordModal = (targetUser) => {
    setActiveUser(targetUser);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setModalType('reset_password');
  };

  const handleCreateUser = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('users-admin/', {
        username,
        password,
        email,
        role,
        department,
        user_category: userCategory || null,
        has_finance_privilege: hasFinancePrivilege,
        has_finance_balance_access: hasFinanceBalanceAccess,
        has_resource_privilege: hasResourcePrivilege,
        has_activity_privilege: hasActivityPrivilege,
        is_active: isActive,
      });
      setUsers((prev) => [response.data, ...prev]);
      setSuccessMsg(`✓ User "${username}" created successfully and saved to database`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to create user', err);
      const detail = err.response?.data?.username?.[0] || err.response?.data?.detail || 'Unable to create user.';
      setError(detail);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEditUser = async () => {
    if (!activeUser) return;
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.patch(`users-admin/${activeUser.id}/assign_role/`, {
        role,
        department,
        email,
        user_category: userCategory || null,
        has_finance_privilege: hasFinancePrivilege,
        has_finance_balance_access: hasFinanceBalanceAccess,
        has_resource_privilege: hasResourcePrivilege,
        has_activity_privilege: hasActivityPrivilege,
        is_active: isActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? response.data : u)));
      setSuccessMsg(`✓ User "${activeUser.username}" updated successfully`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update user', err);
      setError('Unable to update user details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('user-categories/', {
        name: categoryName,
        description: categoryDescription,
      });
      setUserCategories((prev) => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccessMsg(`✓ Category "${categoryName}" created successfully`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to create user category', err);
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Unable to create category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!activeUser || !password) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.patch(`users-admin/${activeUser.id}/reset_password/`, { password, confirm_password: confirmPassword });
      setSuccessMsg(`✓ Password for "${activeUser.username}" updated in database`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to reset password', err);
      const data = err.response?.data;
      const passwordError = Array.isArray(data?.password) ? data.password.join(' ') : data?.password;
      setError(data?.detail || passwordError || data?.confirm_password || 'Unable to reset password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBlockUser = async (targetUser) => {
    const actionName = targetUser.is_active ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${actionName} access for ${targetUser.username}?`)) return;
    setError('');
    try {
      const response = await api.patch(`users-admin/${targetUser.id}/toggle_block/`);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? response.data : u)));
      setSuccessMsg(`✓ Access ${actionName}ed for ${targetUser.username}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to toggle block status', err);
      setError('Unable to change user access status.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user?.id) {
      alert("You cannot archive your own active administrator account.");
      return;
    }
    if (!window.confirm(`Archive user "${targetUser.username}"? Their account will be blocked, but historical records will remain intact.`)) return;
    setError('');
    try {
      const response = await api.delete(`users-admin/${targetUser.id}/`);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? response.data : u)));
      setSuccessMsg(`✓ User "${targetUser.username}" archived and blocked`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete user', err);
      setError('Unable to delete user.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = !filterRole || u.role === filterRole;
    const matchesQuery =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.user_category_name && u.user_category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesQuery;
  });

  const modulePrivilegesFor = (u) => [
    u.has_finance_privilege ? 'Finance & Budgets' : null,
    u.has_resource_privilege ? 'Resources & Assets' : null,
    u.has_activity_privilege ? 'Activities & Events' : null,
  ].filter(Boolean);

  const classificationFor = (u) => {
    if (u.role === 'ADMIN') return 'Administrator';
    const privileges = modulePrivilegesFor(u);
    return privileges.length ? 'Module Admin' : 'Staff';
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>⛔ Access Denied</h2>
          <p>You must have Control privileges to access user control and system management.</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const blockedCount = users.filter((u) => !u.is_active).length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="page-container">
      {/* Top Banner / Module Header */}
      <div className="hubtoll-page-header">
        <div>
          <div className="hubtoll-module-eyebrow">
            <span className="hubtoll-module-badge-icon" style={{ background: '#8b5cf6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span className="hubtoll-module-badge-text">CONTROL & ACCESS MANAGEMENT</span>
          </div>
          <h1 className="page-title">User Access & System Control</h1>
          <p className="page-subtitle">
            Manage user accounts, assign roles and departments, reset security credentials, and control platform access.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="hubtoll-btn-primary" type="button" onClick={openCreateUserModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="hubtoll-alert-banner hubtoll-alert-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="hubtoll-alert-banner hubtoll-alert-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards Row with Left-border Accents (Hubtoll style) */}
      <div className="hubtoll-kpi-grid">
        <div className="hubtoll-kpi-card accent-blue">
          <div className="hubtoll-kpi-label">TOTAL ACCOUNTS</div>
          <div className="hubtoll-kpi-value">{totalUsers}</div>
          <div className="hubtoll-kpi-sub">Registered across all departments</div>
        </div>

        <div className="hubtoll-kpi-card accent-green">
          <div className="hubtoll-kpi-label">ACTIVE USERS</div>
          <div className="hubtoll-kpi-value">{activeCount}</div>
          <div className="hubtoll-kpi-sub">Authorized for platform sign in</div>
        </div>

        <div className="hubtoll-kpi-card accent-purple">
          <div className="hubtoll-kpi-label">CONTROL PRIVILEGES</div>
          <div className="hubtoll-kpi-value">{adminCount}</div>
          <div className="hubtoll-kpi-sub">Full administrative controllers</div>
        </div>

        <div className="hubtoll-kpi-card accent-red">
          <div className="hubtoll-kpi-label">BLOCKED / RESTRICTED</div>
          <div className="hubtoll-kpi-value">{blockedCount}</div>
          <div className="hubtoll-kpi-sub">{blockedCount === 0 ? 'No accounts blocked' : 'Access suspended'}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="hubtoll-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <div className="hubtoll-search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="hubtoll-search-input"
                placeholder="Search by username, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="hubtoll-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Administrator</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredUsers.length}</strong> of {users.length} accounts
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="hubtoll-card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Department</th>
                <th>Category</th>
                <th>Role</th>
                <th>Privileges</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="hubtoll-spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="hubtoll-table-avatar">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.username}</strong>
                          {u.id === user?.id && (
                            <span className="hubtoll-pill-tag" style={{ marginLeft: '6px' }}>You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>{u.department || '—'}</td>
                    <td>{u.user_category_name || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-purple' : modulePrivilegesFor(u).length ? 'badge-info' : 'badge-staff'}`}>
                        {classificationFor(u)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {u.has_finance_privilege && <span className="badge badge-approved">Finance & Budgets</span>}
                        {u.has_finance_balance_access && <span className="badge badge-info">Balance View</span>}
                        {u.has_resource_privilege && <span className="badge badge-info">Resources & Assets</span>}
                        {u.has_activity_privilege && <span className="badge badge-pending">Activities & Events</span>}
                        {!u.has_finance_privilege && !u.has_finance_balance_access && !u.has_resource_privilege && !u.has_activity_privilege && (
                          <span className="badge badge-staff">None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      <div className="hubtoll-action-menu">
                        <button
                          type="button"
                          className="btn-sm hubtoll-btn-ghost hubtoll-manage-btn"
                          onClick={() => setActionMenuUserId((current) => (current === u.id ? null : u.id))}
                          title="Manage user account"
                        >
                          Manage
                        </button>
                        {actionMenuUserId === u.id && (
                          <div className="hubtoll-action-dropdown">
                            <button type="button" onClick={() => { setActionMenuUserId(null); openEditUserModal(u); }}>
                              Edit User
                            </button>
                            <button type="button" onClick={() => { setActionMenuUserId(null); openResetPasswordModal(u); }}>
                              Reset Password
                            </button>
                            <button type="button" onClick={() => { setActionMenuUserId(null); handleToggleBlockUser(u); }}>
                              {u.is_active ? 'Block User' : 'Unblock User'}
                            </button>
                            {u.id !== user?.id && (
                              <button type="button" className="danger" onClick={() => { setActionMenuUserId(null); handleDeleteUser(u); }}>
                                Delete User
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {modalType === 'create_user' && (
        <Modal
          title="Create New Account"
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="hubtoll-btn-primary" onClick={handleCreateUser} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Account'}
              </button>
            </>
          }
        >
          <div className="hubtoll-modal-form">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set initial password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@department.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">System Role *</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Finance, Operations"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Module Administration Privileges</label>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasFinancePrivilege} onChange={(e) => setHasFinancePrivilege(e.target.checked)} />
                  Finance & Budgets administrative privilege
                </label>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasFinanceBalanceAccess} onChange={(e) => setHasFinanceBalanceAccess(e.target.checked)} />
                  View finance balances / coffers
                </label>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasResourcePrivilege} onChange={(e) => setHasResourcePrivilege(e.target.checked)} />
                  Resources & Assets administrative privilege
                </label>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasActivityPrivilege} onChange={(e) => setHasActivityPrivilege(e.target.checked)} />
                  Activities & Events administrative privilege
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActiveCheck" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                Account is Active (can sign in immediately)
              </label>
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

          </div>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {modalType === 'edit_user' && activeUser && (
        <Modal
          title={`Edit Profile: ${activeUser.username}`}
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="hubtoll-btn-primary" onClick={handleSaveEditUser} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="hubtoll-modal-form">
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Account Information</div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-input" value={username} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department name"
              />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Access Level</div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Module Administration Privileges</div>
            <div className="form-group">
              <label className="form-label">Module Privileges</label>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasFinancePrivilege} onChange={(e) => setHasFinancePrivilege(e.target.checked)} />
                  Finance & Budgets administrative privilege
                </label>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasResourcePrivilege} onChange={(e) => setHasResourcePrivilege(e.target.checked)} />
                  Resources & Assets administrative privilege
                </label>
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={hasActivityPrivilege} onChange={(e) => setHasActivityPrivilege(e.target.checked)} />
                  Activities & Events administrative privilege
                </label>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Additional Finance Permission</div>
            <div className="form-group">
              <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input type="checkbox" checked={hasFinanceBalanceAccess} onChange={(e) => setHasFinanceBalanceAccess(e.target.checked)} />
                View Department Balance
              </label>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Account Status</div>
            <div className="form-group">
              <select className="form-select" value={isActive ? 'active' : 'blocked'} onChange={(e) => setIsActive(e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

          </div>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {modalType === 'reset_password' && activeUser && (
        <Modal
          title={`Reset Password: ${activeUser.username}`}
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="hubtoll-btn-primary" onClick={handleResetPassword} disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
            </>
          }
        >
          <div className="hubtoll-modal-form">
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
              <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                Use at least 8 characters. Avoid common passwords or passwords too similar to the user account.
              </small>
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

          </div>
        </Modal>
      )}

      {/* CREATE USER CATEGORY MODAL */}
      {modalType === 'create_category' && (
        <Modal
          title="Create User Group Category"
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="hubtoll-btn-primary" onClick={handleCreateCategory} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Category'}
              </button>
            </>
          }
        >
          <div className="hubtoll-modal-form">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-input"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Finance Staff, Technical Affairs, General Staff"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Optional notes about who belongs in this category"
              />
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

          </div>
        </Modal>
      )}
    </div>
  );
};

export default Control;
