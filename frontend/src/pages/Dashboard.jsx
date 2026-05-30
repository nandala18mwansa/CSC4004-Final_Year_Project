import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

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
  }, []);

  const handleUpdateStatus = async (expenseId, status) => {
    try {
      await api.patch(`expenses/${expenseId}/`, { status });
      // Refresh data
      loadDashboard();
    } catch (err) {
      console.error('Failed to update expense status', err);
      setError('Unable to update expense status.');
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

  // --- STAFF LAYOUT ---
  if (user?.role === 'STAFF') {
    // 1. My total requested expenses amount
    const myExpenses = stats.expenses; // Note: backend already filtered this to only user's expenses
    const totalRequested = myExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // 2. My pending requests count
    const pendingCount = myExpenses.filter((exp) => exp.status === 'PENDING').length;
    
    // 3. My organized activities count
    const myActivities = stats.activities.filter((act) => act.organizer === user.id);
    const upcomingMyActivities = myActivities.filter((act) => new Date(act.start_date) >= new Date()).length;
    
    // 4. My resource allocations count
    const myAllocations = stats.allocations.filter((alloc) => alloc.allocated_to === user.id);
    const upcomingMyAllocations = myAllocations.filter((alloc) => new Date(alloc.start_time) >= new Date());

    const recentMyExpenses = [...myExpenses]
      .sort((a, b) => new Date(b.date_requested) - new Date(a.date_requested))
      .slice(0, 5);

    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {user.username}</h1>
            <p className="page-subtitle">Personal workspace portal. Manage your budget requests, events, and allocations.</p>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="content-grid content-grid-4">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
              💳
            </div>
            <div className="stat-card-value">{formatCurrency(totalRequested)}</div>
            <div className="stat-card-label">My total requests</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
              ⏳
            </div>
            <div className="stat-card-value">{pendingCount}</div>
            <div className="stat-card-label">Pending approvals</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              📅
            </div>
            <div className="stat-card-value">{upcomingMyActivities}</div>
            <div className="stat-card-label">My upcoming events</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
              🔑
            </div>
            <div className="stat-card-value">{upcomingMyAllocations.length}</div>
            <div className="stat-card-label">My active bookings</div>
          </div>
        </div>

        <div className="content-grid content-grid-2" style={{ marginTop: '2rem' }}>
          {/* Recent Expense Requests */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>My recent expenses</h3>
                <p className="page-subtitle">Status of your submitted financial requests.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMyExpenses.length > 0 ? (
                    recentMyExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.description}</td>
                        <td>{formatCurrency(expense.amount)}</td>
                        <td>{statusBadge(expense.status)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No expense requests submitted yet.</td>
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
                <h3 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>My resource bookings</h3>
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
                        <td>{formatDate(alloc.start_time)} {formatTime(alloc.start_time)}</td>
                        <td>{formatDate(alloc.end_time)} {formatTime(alloc.end_time)}</td>
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

  // --- MANAGER/ADMIN LAYOUT ---
  const totalBudget = stats.budgets.reduce((sum, budget) => sum + Number(budget.total_amount || 0), 0);
  const pendingExpenses = stats.expenses.filter((expense) => expense.status === 'PENDING').length;
  const upcomingActivities = stats.activities.filter((activity) => new Date(activity.start_date) >= new Date()).length;
  const availableResources = stats.resources.filter((resource) => resource.status === 'AVAILABLE').length;
  const resourceUtilization = stats.resources.length
    ? Math.round((availableResources / stats.resources.length) * 100)
    : 0;

  const recentExpenses = [...stats.expenses]
    .sort((a, b) => {
      // Prioritize pending status first, then date requested
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.date_requested) - new Date(a.date_requested);
    })
    .slice(0, 5);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.username}</h1>
          <p className="page-subtitle">Live department insights from finance, activities, and resource allocation.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="content-grid content-grid-4">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            💼
          </div>
          <div className="stat-card-value">{formatCurrency(totalBudget)}</div>
          <div className="stat-card-label">Total budget tracked</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
            📌
          </div>
          <div className="stat-card-value">{pendingExpenses}</div>
          <div className="stat-card-label">Pending expenses</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)' }}>
            📅
          </div>
          <div className="stat-card-value">{upcomingActivities}</div>
          <div className="stat-card-label">Upcoming activities</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
            🧩
          </div>
          <div className="stat-card-value">{resourceUtilization}%</div>
          <div className="stat-card-label">Resources available</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title">Recent requests & actions</h2>
            <p className="page-subtitle">Review the latest approvals and process pending requests.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Requested by</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td><strong>{expense.description}</strong></td>
                    <td>{expense.requested_by_username || '—'}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>{statusBadge(expense.status)}</td>
                    <td>{formatDate(expense.date_requested)}</td>
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
                        <span className="badge badge-info" style={{ background: 'transparent', border: 'none' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No expense history available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
