import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContextValue';
import Modal from '../components/Modal';

const formatCurrency = (value) =>
  `ZMK ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusBadge = (status) => {
  const statusMap = {
    PENDING: 'badge badge-pending',
    APPROVED: 'badge badge-approved',
    REJECTED: 'badge badge-rejected',
  };
  return <span className={statusMap[status] || 'badge badge-info'}>{status.toLowerCase()}</span>;
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ budgets: [], expenses: [], activities: [], resources: [], allocations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Top-Up Modal State for Admin / Control
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDashboard = async () => {
    try {
      const [budgetRes, expenseRes, activityRes, resourceRes, allocationRes] = await Promise.all([
        api.get('budgets/'),
        api.get('expenses/'),
        api.get('activities/'),
        api.get('resources/'),
        api.get('allocations/'),
      ]);

      setStats({
        budgets: budgetRes.data,
        expenses: expenseRes.data,
        activities: activityRes.data,
        resources: resourceRes.data,
        allocations: allocationRes.data,
      });
    } catch (err) {
      console.error('Dashboard load failed', err);
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (expenseId, status) => {
    try {
      await api.patch(`expenses/${expenseId}/`, { status });
      loadDashboard();
    } catch (err) {
      console.error('Failed to update expense status', err);
      setError('Unable to update expense status.');
    }
  };

  const handleTopUpBudget = async () => {
    if (!selectedBudgetId && stats.budgets.length === 0) return;
    const targetId = selectedBudgetId || stats.budgets[0].id;
    setSaving(true);
    setError('');
    try {
      await api.post(`budgets/${targetId}/add_funds/`, {
        amount: parseFloat(topUpAmount),
        notes: topUpNotes || 'Department fund allocation',
      });
      await loadDashboard();
      setTopUpModalOpen(false);
      setTopUpAmount('');
      setTopUpNotes('');
    } catch (err) {
      console.error('Budget top-up failed', err);
      setError(err.response?.data?.detail || 'Unable to top-up budget.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="spinner spinner-lg" />
          <p>Loading Departmental Dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';

  const totalAvailableBalance = stats.budgets.reduce((sum, b) => sum + Number(b.current_balance || 0), 0);
  const totalApprovedExpenses = stats.expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalResources = stats.resources.length;
  const availableResources = stats.resources.filter((resource) => resource.status === 'AVAILABLE').length;
  const allocatedResources = stats.resources.filter((resource) => resource.status === 'IN_USE').length;
  const pendingExpenses = stats.expenses.filter((expense) => expense.status === 'PENDING').length;
  const upcomingActivities = stats.activities.filter((activity) => new Date(activity.start_date) >= new Date()).length;

  const recentExpenses = [...stats.expenses]
    .sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.date_requested) - new Date(a.date_requested);
    })
    .slice(0, 10);

  // --- STAFF SPECIFIC CALCULATIONS ---
  const myExpenses = isStaff ? stats.expenses : [];
  const myApprovedTotal = myExpenses
    .filter((exp) => exp.status === 'APPROVED')
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const myPendingCount = myExpenses.filter((exp) => exp.status === 'PENDING').length;

  return (
    <div className="page-container">
      {/* 1. Department Workspace Banner */}
      <div className="hubtoll-hero-banner">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            {user?.department ? `${user.department} Department` : 'Department Administration'} · Resource & Financial Management Portal
          </p>
        </div>

        <div className="hubtoll-workspace-tag-card">
          <div className="hubtoll-workspace-tag-logo">
            {user?.department ? user.department.slice(0, 2).toUpperCase() : 'DM'}
          </div>
          <div className="hubtoll-workspace-tag-info">
            <span className="hubtoll-workspace-tag-eyebrow">DEPARTMENT WORKSPACE</span>
            <span className="hubtoll-workspace-tag-title">{user?.department || 'Administration'}</span>
            <span className="hubtoll-workspace-tag-category">Resource & Financial System</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="hubtoll-alert-banner hubtoll-alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* 2. Left-Accent KPI Cards with Real System Backbone Data */}
      <div className="hubtoll-kpi-grid">
        <div className="hubtoll-kpi-card accent-green">
          <div className="hubtoll-kpi-label">AVAILABLE BUDGET</div>
          <div className="hubtoll-kpi-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(totalAvailableBalance)}
          </div>
          <div className="hubtoll-kpi-sub">Total unallocated cash across budgets</div>
        </div>

        <div className="hubtoll-kpi-card accent-red">
          <div className="hubtoll-kpi-label">APPROVED EXPENDITURE</div>
          <div className="hubtoll-kpi-value" style={{ color: 'var(--color-danger)' }}>
            {formatCurrency(isStaff ? myApprovedTotal : totalApprovedExpenses)}
          </div>
          <div className="hubtoll-kpi-sub">{isStaff ? 'Your approved disbursements' : 'Total processed expense claims'}</div>
        </div>

        <div className="hubtoll-kpi-card accent-blue">
          <div className="hubtoll-kpi-label">RESOURCE AVAILABILITY</div>
          <div className="hubtoll-kpi-value">
            {availableResources} / {totalResources}
          </div>
          <div className="hubtoll-kpi-sub">{allocatedResources} units currently in active deployment</div>
        </div>

        <div className="hubtoll-kpi-card accent-orange">
          <div className="hubtoll-kpi-label">PENDING APPROVALS</div>
          <div className="hubtoll-kpi-value" style={{ color: '#ea580c' }}>
            {isStaff ? myPendingCount : pendingExpenses}
          </div>
          <div className="hubtoll-kpi-sub">
            {pendingExpenses === 0 ? 'All requests processed' : 'Requests awaiting controller review'}
          </div>
        </div>
      </div>

      {/* 3. System Operational Lifecycle Flow */}
      <div className="hubtoll-pipeline-card">
        <div className="hubtoll-pipeline-header">
          <h2 className="hubtoll-pipeline-title">Department Operations Lifecycle</h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Click any step to open its module</span>
        </div>
        <p className="hubtoll-pipeline-sub">
          Automated departmental workflow connecting allocations, requests, manager reviews, and equipment bookings.
        </p>

        <div className="hubtoll-pipeline-flow">
          <div className="hubtoll-flow-step" onClick={() => navigate('/finance')} style={{ cursor: 'pointer' }}>
            <div className="hubtoll-flow-title">1. Budget Allocation</div>
            <div className="hubtoll-flow-count">{stats.budgets.length} categories</div>
            <div className="hubtoll-flow-desc">Funding allocated per fiscal year.</div>
          </div>

          <div className="hubtoll-flow-arrow">›</div>

          <div className="hubtoll-flow-step" onClick={() => navigate('/finance')} style={{ cursor: 'pointer' }}>
            <div className="hubtoll-flow-title">2. Expense Claims</div>
            <div className="hubtoll-flow-count">{stats.expenses.length} claims</div>
            <div className="hubtoll-flow-desc">Staff expense & procurement requests.</div>
          </div>

          <div className="hubtoll-flow-arrow">›</div>

          <div className="hubtoll-flow-step" onClick={() => navigate('/finance')} style={{ cursor: 'pointer' }}>
            <div className="hubtoll-flow-title">3. Manager Approval</div>
            <div className="hubtoll-flow-count">{pendingExpenses} pending</div>
            <div className="hubtoll-flow-desc">Controller review and status verification.</div>
          </div>

          <div className="hubtoll-flow-arrow">›</div>

          <div className="hubtoll-flow-step" onClick={() => navigate('/resources')} style={{ cursor: 'pointer' }}>
            <div className="hubtoll-flow-title">4. Asset Allocations</div>
            <div className="hubtoll-flow-count">{stats.allocations.length} bookings</div>
            <div className="hubtoll-flow-desc">Rooms and equipment checked out.</div>
          </div>

          <div className="hubtoll-flow-arrow">›</div>

          <div className="hubtoll-flow-step" onClick={() => navigate('/activities')} style={{ cursor: 'pointer' }}>
            <div className="hubtoll-flow-title">5. Scheduled Activities</div>
            <div className="hubtoll-flow-count">{upcomingActivities} upcoming</div>
            <div className="hubtoll-flow-desc">Departmental sessions on calendar.</div>
          </div>
        </div>
      </div>

      {/* 4. Actionable Priority Items */}
      <div className="hubtoll-attention-section">
        <div className="hubtoll-attention-header">
          <h3>Needs your attention</h3>
          <p>Active items requiring review across your department.</p>
        </div>

        <div className="hubtoll-attention-list">
          {pendingExpenses > 0 ? (
            <div
              className="hubtoll-attention-item alert-orange"
              onClick={() => navigate('/finance')}
            >
              <div className="hubtoll-attention-left">
                <div className="hubtoll-attention-pill">{pendingExpenses}</div>
                <div>
                  <div className="hubtoll-attention-title">Pending Expense Approvals</div>
                  <div className="hubtoll-attention-text">
                    {pendingExpenses} expense request{pendingExpenses > 1 ? 's' : ''} awaiting management verification.
                  </div>
                </div>
              </div>
              <span className="hubtoll-attention-chevron">›</span>
            </div>
          ) : (
            <div className="hubtoll-attention-item alert-blue">
              <div className="hubtoll-attention-left">
                <div className="hubtoll-attention-pill">✓</div>
                <div>
                  <div className="hubtoll-attention-title">All Expense Requests Approved</div>
                  <div className="hubtoll-attention-text">
                    No pending expense claims currently require review.
                  </div>
                </div>
              </div>
              <span className="hubtoll-attention-chevron">›</span>
            </div>
          )}

          {upcomingActivities > 0 && (
            <div
              className="hubtoll-attention-item alert-blue"
              onClick={() => navigate('/activities')}
            >
              <div className="hubtoll-attention-left">
                <div className="hubtoll-attention-pill">{upcomingActivities}</div>
                <div>
                  <div className="hubtoll-attention-title">Upcoming Department Activities</div>
                  <div className="hubtoll-attention-text">
                    Scheduled events arriving on the departmental calendar.
                  </div>
                </div>
              </div>
              <span className="hubtoll-attention-chevron">›</span>
            </div>
          )}

          {allocatedResources > 0 && (
            <div
              className="hubtoll-attention-item alert-red"
              onClick={() => navigate('/resources')}
            >
              <div className="hubtoll-attention-left">
                <div className="hubtoll-attention-pill">{allocatedResources}</div>
                <div>
                  <div className="hubtoll-attention-title">Resources Currently in Use</div>
                  <div className="hubtoll-attention-text">
                    Rooms and equipment currently checked out by department members.
                  </div>
                </div>
              </div>
              <span className="hubtoll-attention-chevron">›</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Expense Requests Table */}
      <div className="hubtoll-card">
        <div className="hubtoll-page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Expense Requests & Processing Timestamps
            </h2>
            <p className="page-subtitle">
              Audit log of requested dates, verification timestamps, and action buttons.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isAdmin && stats.budgets.length > 0 && (
              <button
                className="hubtoll-btn-primary"
                type="button"
                onClick={() => { setSelectedBudgetId(stats.budgets[0].id); setTopUpModalOpen(true); }}
              >
                + Add Budget Funds
              </button>
            )}
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => navigate('/finance')}
            >
              Open Full Finance Center →
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Requested By</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date Requested</th>
                <th>Date Processed</th>
                {(isAdmin || isManager) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td><strong>{expense.description}</strong></td>
                    <td>{expense.requested_by_username || '—'}</td>
                    <td><strong>{formatCurrency(expense.amount)}</strong></td>
                    <td>{statusBadge(expense.status)}</td>
                    <td>{formatDateTime(expense.date_requested)}</td>
                    <td>{formatDateTime(expense.date_processed)}</td>
                    {(isAdmin || isManager) && (
                      <td>
                        {expense.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-sm hubtoll-btn-success"
                              onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-sm hubtoll-btn-danger"
                              onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No expense requests on record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOP-UP BUDGET MODAL (Admin / Control) */}
      {topUpModalOpen && (
        <Modal title="Top-Up Department Budget Funds" onClose={() => setTopUpModalOpen(false)}>
          <div className="hubtoll-modal-form">
            <div className="form-group">
              <label className="form-label">Target Budget Category *</label>
              <select
                className="form-select"
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
              >
                {stats.budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department} (Current Balance: {formatCurrency(b.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Amount (ZMK) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="e.g. 5000.00"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Allocation Notes</label>
              <input
                type="text"
                className="form-input"
                value={topUpNotes}
                onChange={(e) => setTopUpNotes(e.target.value)}
                placeholder="e.g. Q4 Supplementary Allocation"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setTopUpModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="hubtoll-btn-primary"
                onClick={handleTopUpBudget}
                disabled={saving || !topUpAmount}
              >
                {saving ? 'Processing...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
