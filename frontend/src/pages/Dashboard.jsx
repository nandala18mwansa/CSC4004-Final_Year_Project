import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
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
  const [stats, setStats] = useState({ budgets: [], expenses: [], activities: [], resources: [], allocations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Top-Up Modal State for Admin
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
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  // Math Calculations for Strict Balance Verification Across Visible Budgets & Expenses
  const totalInitialAllocated = stats.budgets.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalApprovedExpenses = stats.expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netAvailableCash = totalInitialAllocated - totalApprovedExpenses;

  // --- STAFF LAYOUT ---
  if (user?.role === 'STAFF') {
    const myExpenses = stats.expenses;
    const totalRequested = myExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    // Incrementing Approved Expenses total for this staff member
    const myApprovedTotal = myExpenses
      .filter((exp) => exp.status === 'APPROVED')
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    const pendingCount = myExpenses.filter((exp) => exp.status === 'PENDING').length;
    const myActivities = stats.activities.filter((act) => act.organizer === user.id);
    const upcomingMyActivities = myActivities.filter((act) => new Date(act.start_date) >= new Date()).length;
    const myAllocations = stats.allocations.filter((alloc) => alloc.allocated_to === user.id);
    const upcomingMyAllocations = myAllocations.filter((alloc) => new Date(alloc.start_time) >= new Date());

    const recentMyExpenses = [...myExpenses]
      .sort((a, b) => new Date(b.date_requested) - new Date(a.date_requested))
      .slice(0, 10);

    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {user.username}</h1>
            <p className="page-subtitle">
              {user.department ? `${user.department} Department Portal` : 'Staff Workspace Portal'}. Submit requests and track reimbursement status.
            </p>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        {/* MATH BALANCE BAR FOR STAFF DEPARTMENT */}
        <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
              🏢 {user.department || 'Department'} Funding Balance:
            </span>
            <span className="badge badge-approved">
              Allocated ({formatCurrency(totalInitialAllocated)}) = Available Cash ({formatCurrency(netAvailableCash)}) + Department Approved Expenses ({formatCurrency(totalApprovedExpenses)})
            </span>
          </div>
        </div>

        <div className="content-grid content-grid-4">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              ✅
            </div>
            <div className="stat-card-value">{formatCurrency(myApprovedTotal)}</div>
            <div className="stat-card-label">My Approved Expenses</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
              💳
            </div>
            <div className="stat-card-value">{formatCurrency(totalRequested)}</div>
            <div className="stat-card-label">My Total Requested</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
              ⏳
            </div>
            <div className="stat-card-value">{pendingCount}</div>
            <div className="stat-card-label">Pending Approvals</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              📅
            </div>
            <div className="stat-card-value">{upcomingMyActivities}</div>
            <div className="stat-card-label">Upcoming Events</div>
          </div>
        </div>

        <div className="content-grid content-grid-2" style={{ marginTop: '2rem' }}>
          {/* Recent Expense Requests */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>My Expense Requests & Status Timestamps</h3>
                <p className="page-subtitle">Requested dates and processing timestamps for your requests.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date Requested</th>
                    <th>Date Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMyExpenses.length > 0 ? (
                    recentMyExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td><strong>{expense.description}</strong></td>
                        <td><strong>{formatCurrency(expense.amount)}</strong></td>
                        <td>{statusBadge(expense.status)}</td>
                        <td>{formatDateTime(expense.date_requested)}</td>
                        <td>{formatDateTime(expense.date_processed)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No expense requests submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* My Upcoming Bookings */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>My Resource Bookings</h3>
                <p className="page-subtitle">Your allocated assets and equipment bookings.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Starts</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMyAllocations.length > 0 ? (
                    upcomingMyAllocations.slice(0, 5).map((alloc) => (
                      <tr key={alloc.id}>
                        <td><strong>{alloc.resource_name || 'Asset'}</strong></td>
                        <td>{formatDateTime(alloc.start_time)}</td>
                        <td>{formatDateTime(alloc.end_time)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No upcoming bookings scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MANAGER / ADMIN LAYOUT ---
  const pendingExpenses = stats.expenses.filter((expense) => expense.status === 'PENDING').length;
  const upcomingActivities = stats.activities.filter((activity) => new Date(activity.start_date) >= new Date()).length;

  const recentExpenses = [...stats.expenses]
    .sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.date_requested) - new Date(a.date_requested);
    })
    .slice(0, 10);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.username}</h1>
          <p className="page-subtitle">Live department overview, balanced accounting ledger, and expense approvals.</p>
        </div>
        {isAdmin && stats.budgets.length > 0 && (
          <button className="btn btn-primary" type="button" onClick={() => { setSelectedBudgetId(stats.budgets[0].id); setTopUpModalOpen(true); }}>
            💵 Set / Top-up Department Budget
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {/* BALANCED ACCOUNTING VERIFICATION BAR */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
            📐 Strict Accounting Balance Equation:
          </span>
          <span className="badge badge-approved" style={{ fontSize: 'var(--font-xs)' }}>
            Initial ({formatCurrency(totalInitialAllocated)}) = Available Cash ({formatCurrency(netAvailableCash)}) + Approved Expenses ({formatCurrency(totalApprovedExpenses)})
          </span>
        </div>
      </div>

      <div className="content-grid content-grid-4">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            💰
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(netAvailableCash)}</div>
          <div className="stat-card-label">Net Available Cash</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            🧾
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(totalApprovedExpenses)}</div>
          <div className="stat-card-label">Total Approved Expenses</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            💼
          </div>
          <div className="stat-card-value">{formatCurrency(totalInitialAllocated)}</div>
          <div className="stat-card-label">Total Initial Allocated Funds</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            ⏳
          </div>
          <div className="stat-card-value">{pendingExpenses}</div>
          <div className="stat-card-label">Pending Expenses</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title">Recent Expense Requests & Processing Timestamps</h2>
            <p className="page-subtitle">Review requested dates, processing timestamps, and approve/reject pending expenses.</p>
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
                <th>Requested Date & Time</th>
                <th>Processed Date & Time</th>
                <th>Actions</th>
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
                    <td>
                      {expense.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-success btn-sm"
                            type="button"
                            onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="badge badge-info" style={{ background: 'transparent', border: 'none' }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">No expense history available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOP-UP BUDGET MODAL (ADMIN ONLY) */}
      {topUpModalOpen && (
        <Modal
          title="Set / Top-Up Department Funds"
          onClose={() => setTopUpModalOpen(false)}
          onSubmit={handleTopUpBudget}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setTopUpModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Add Funds'}
              </button>
            </>
          }
        >
          {stats.budgets.length > 1 && (
            <div className="form-group">
              <label className="form-label">Department Budget Category</label>
              <select
                className="form-select"
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
              >
                {stats.budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department} (Initial: {formatCurrency(b.total_amount)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Funds to Add (ZMK)</label>
            <input
              type="number"
              className="form-input"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="e.g. 50000"
              step="10"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Allocation Details</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={topUpNotes}
              onChange={(e) => setTopUpNotes(e.target.value)}
              placeholder="e.g. Initial department funding allocation"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
