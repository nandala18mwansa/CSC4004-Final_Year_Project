import React, { useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/Modal';

const roleOptions = ['ADMIN', 'MANAGER', 'STAFF'];

const Admin = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'create_user', 'edit_user', 'reset_password'
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [activeUser, setActiveUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive] = useState(true);

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

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
      const interval = setInterval(loadUsers, 5000);
      return () => clearInterval(interval);
    } else {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
    }
  }, [user]);

  const openCreateUserModal = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setRole('STAFF');
    setDepartment('');
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
    setIsActive(targetUser.is_active);
    setError('');
    setModalType('edit_user');
  };

  const openResetPasswordModal = (targetUser) => {
    setActiveUser(targetUser);
    setPassword('');
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
        is_active: isActive,
      });
      setUsers((prev) => [response.data, ...prev]);
      setSuccessMsg(`✓ User "${username}" created successfully and added to database`);
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

  const handleResetPassword = async () => {
    if (!activeUser || !password) return;
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.patch(`users-admin/${activeUser.id}/reset_password/`, { password });
      setSuccessMsg(`✓ Password for "${activeUser.username}" updated in database`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to reset password', err);
      setError('Unable to reset password.');
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
      alert("You cannot delete your own active admin account.");
      return;
    }
    if (!window.confirm(`⚠️ PERMANENT ACTION: Delete user "${targetUser.username}" from database?`)) return;
    setError('');
    try {
      await api.delete(`users-admin/${targetUser.id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setSuccessMsg(`✓ User "${targetUser.username}" removed from database`);
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
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesQuery;
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>⛔ Access Denied</h2>
          <p>You must have Admin privileges to access user control and system management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin User & Security Suite</h1>
          <p className="page-subtitle">Add users, assign roles & passwords, control privileges, and block/unblock system access.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreateUserModal}>
          + Add New User
        </button>
      </div>

      {error && (
        <p className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </p>
      )}
      {successMsg && (
        <p className="form-success" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: 'var(--radius-md)', color: '#34d399' }}>
          {successMsg}
        </p>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search user by username, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="glass-panel">
        {loading ? (
          <div className="empty-state">
            <div className="spinner spinner-lg" />
            <p>Loading user database...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role / Privilege</th>
                  <th>Department</th>
                  <th>Access Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.65 }}>
                    <td>
                      <strong>{u.username}</strong> {u.id === user.id && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>(You)</span>}
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'MANAGER' ? 'warning' : 'info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.is_active ? 'approved' : 'rejected'}`}>
                        {u.is_active ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          title="Edit role or department"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => openResetPasswordModal(u)}
                          title="Reset Password"
                        >
                          🔑 Password
                        </button>
                        <button
                          className={`btn btn-${u.is_active ? 'warning' : 'success'} btn-sm`}
                          type="button"
                          onClick={() => handleToggleBlockUser(u)}
                          title={u.is_active ? 'Block user access' : 'Unblock user access'}
                        >
                          {u.is_active ? '🚫 Block' : '✅ Enable'}
                        </button>
                        {u.id !== user.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete user permanently"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No user accounts found matching your filter criteria.</p>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {modalType === 'create_user' && (
        <Modal
          title="Add New User Account"
          onClose={() => setModalType(null)}
          onSubmit={handleCreateUser}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <span className="spinner" /> : 'Create User'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., mchaswala / jdoe"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Initial Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter initial secure password..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., user@department.org"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Role / Permission Level</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="STAFF">STAFF — Submit requests & view assets</option>
              <option value="MANAGER">MANAGER — Approve requests & schedule events</option>
              <option value="ADMIN">ADMIN — Full system administration & user control</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Department / Unit</label>
            <input
              type="text"
              className="form-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Computer Science, IT, Finance, Operations"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="isActiveCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
              Account active (uncheck to block initial login)
            </label>
          </div>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {modalType === 'edit_user' && activeUser && (
        <Modal
          title={`Edit Account: ${activeUser.username}`}
          onClose={() => setModalType(null)}
          onSubmit={handleSaveEditUser}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Role / Access Level</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
            <label className="form-label">Department / Unit</label>
            <input
              type="text"
              className="form-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Operations, Finance, IT"
            />
          </div>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {modalType === 'reset_password' && activeUser && (
        <Modal
          title={`Reset Password for ${activeUser.username}`}
          onClose={() => setModalType(null)}
          onSubmit={handleResetPassword}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <span className="spinner" /> : 'Update Password'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password..."
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Admin;
