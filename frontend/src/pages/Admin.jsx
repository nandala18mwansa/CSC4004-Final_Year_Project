import React, { useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/Modal';

const roleOptions = ['ADMIN', 'STAFF', 'MANAGER'];

const Admin = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsers = async () => {
    try {
      const response = await api.get('users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users', err);
      setError('Unable to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
    } else {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
    }
  }, [user]);

  const handleEditUser = (targetUser) => {
    setEditingUser(targetUser);
    setEditRole(targetUser.role);
    setEditDept(targetUser.department || '');
    setModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.patch(`users-admin/${editingUser.id}/assign_role/`, {
        role: editRole,
        department: editDept,
      });
      
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? response.data : u))
      );
      
      setSuccessMsg(`✓ ${editingUser.username} updated successfully`);
      setModalOpen(false);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update user', err);
      setError('Unable to update user permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = filterRole
    ? users.filter((u) => u.role === filterRole)
    : users;

  if (user?.role !== 'ADMIN') {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>⛔ Access Denied</h2>
          <p>You must have admin privileges to access this section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage user roles, permissions, and department assignments.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {successMsg && <p className="form-success">{successMsg}</p>}

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Filter by role:</label>
          <select
            className="form-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner spinner-lg" />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <span className={`badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'MANAGER' ? 'warning' : 'info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEditUser(u)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No users found with the selected filter.</p>
          </div>
        )}
      </div>

      <div className="module-card">
        <h3>User Role Reference</h3>
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <div className="badge badge-danger" style={{ marginBottom: '0.5rem' }}>ADMIN</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Full system access. Can manage users, permissions, and all modules.</p>
          </div>
          <div>
            <div className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>MANAGER</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Department oversight. Can approve expenses and manage activities.</p>
          </div>
          <div>
            <div className="badge badge-info" style={{ marginBottom: '0.5rem' }}>STAFF</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Standard user. Can submit requests and view assigned resources.</p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={`Assign role: ${editingUser?.username}`}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveRole} disabled={isSaving}>
                {isSaving ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Department / Responsibility</label>
            <input
              type="text"
              className="form-input"
              value={editDept}
              onChange={(e) => setEditDept(e.target.value)}
              placeholder="e.g., Finance, Operations, Marketing"
            />
          </div>

          <div className="module-card" style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              <strong>Current assignment:</strong> {editingUser?.username} is a {editingUser?.role}
              {editingUser?.department && ` in ${editingUser.department}`}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Admin;
