import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContextValue';

const formatCurrency = (value) =>
  `ZMW ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatActivitySlot = (activity) => {
  if (!activity?.start_date) return 'Time not set';
  const start = new Date(activity.start_date);
  const end = activity.end_date ? new Date(activity.end_date) : null;
  const day = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endTime = end?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} | ${startTime}${endTime ? `-${endTime}` : ''}`;
};

const toArray = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const statusClass = (status) => {
  if (['APPROVED', 'COMPLETED', 'AVAILABLE'].includes(status)) return 'badge badge-approved';
  if (['REJECTED', 'FAILED', 'UNAVAILABLE', 'UNDER_REPAIR', 'MAINTENANCE'].includes(status)) return 'badge badge-rejected';
  if (['PENDING', 'BOOKED'].includes(status)) return 'badge badge-pending';
  return 'badge badge-info';
};

const statusLabel = (status) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'FAILED') return 'Failed';
  if (status === 'PENDING') return 'Pending';
  return status || 'Updated';
};

const reportStatusLabel = (status) => {
  if (status === 'COMPLETED' || status === 'APPROVED') return 'Ready';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'FAILED') return 'Failed';
  return 'Pending';
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    budgets: [],
    expenses: [],
    activities: [],
    resources: [],
    allocations: [],
    summaryRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canManageFinance = Boolean(user?.is_superuser || user?.has_finance_privilege);
  const canManageResources = Boolean(user?.is_superuser || user?.has_resource_privilege);
  const canManageActivities = Boolean(user?.is_superuser || user?.has_activity_privilege);
  const canViewFinanceBalances = canManageFinance || Boolean(user?.has_finance_balance_access);

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const [budgetRes, expenseRes, activityRes, resourceRes, allocationRes, summaryRequestRes] = await Promise.all([
        canViewFinanceBalances ? api.get('budgets/?page_size=100') : Promise.resolve({ data: [] }),
        api.get('expenses/?page_size=100'),
        api.get('activities/'),
        api.get('resources/'),
        api.get('allocations/'),
        canManageFinance ? api.get('financial-summary-requests/?page_size=100') : Promise.resolve({ data: [] }),
      ]);

      setStats({
        budgets: toArray(budgetRes),
        expenses: toArray(expenseRes),
        activities: toArray(activityRes),
        resources: toArray(resourceRes),
        allocations: toArray(allocationRes),
        summaryRequests: toArray(summaryRequestRes),
      });
    } catch (err) {
      console.error('Dashboard load failed', err);
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [canManageFinance, canViewFinanceBalances]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

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

  const { budgets, expenses, activities, resources, allocations, summaryRequests } = stats;
  const totalAvailableBalance = budgets.reduce((sum, b) => sum + Number(b.current_balance || 0), 0);
  const totalApprovedExpenses = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pendingExpenses = expenses.filter((expense) => expense.status === 'PENDING').length;
  const processedExpenses = expenses.filter((expense) => expense.status !== 'PENDING').length;
  const availableResources = resources.filter((resource) => resource.status === 'AVAILABLE').length;
  const allocatedResources = resources.filter((resource) => ['IN_USE', 'BOOKED'].includes(resource.status)).length;
  const resourceAttention = resources.filter((resource) => ['MAINTENANCE', 'UNDER_REPAIR', 'UNAVAILABLE'].includes(resource.status) || ['UNDER_REPAIR', 'DAMAGED'].includes(resource.condition)).length;
  const pendingResourceBookings = allocations.filter((allocation) => allocation.status === 'PENDING').length;
  const approvedBookings = allocations.filter((allocation) => allocation.status === 'APPROVED').length;
  const pendingActivities = activities.filter((activity) => activity.approval_status === 'PENDING').length;
  const upcomingActivitiesList = activities
    .filter((activity) => activity.approval_status !== 'REJECTED' && activity.start_date && new Date(activity.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

  const reportCounts = summaryRequests.reduce((acc, request) => {
    const label = reportStatusLabel(request.status);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const attentionItems = [
    canManageFinance && pendingExpenses > 0 ? {
      key: 'expense-approvals',
      count: pendingExpenses,
      title: 'Pending expense approvals',
      text: 'Expense requests await Finance & Budgets review.',
      path: '/finance',
    } : null,
    canManageActivities && pendingActivities > 0 ? {
      key: 'activity-approvals',
      count: pendingActivities,
      title: 'Pending activity approvals',
      text: 'Activity submissions await Activities & Events review.',
      path: '/activities',
    } : null,
    canManageResources && pendingResourceBookings > 0 ? {
      key: 'booking-approvals',
      count: pendingResourceBookings,
      title: 'Pending resource bookings',
      text: 'Booking requests await Resources & Assets review.',
      path: '/resources',
    } : null,
    canManageResources && resourceAttention > 0 ? {
      key: 'resource-attention',
      count: resourceAttention,
      title: 'Resources requiring attention',
      text: 'Assets need maintenance, repair, or availability review.',
      path: '/resources',
    } : null,
    canManageFinance && (reportCounts.Pending || 0) > 0 ? {
      key: 'report-requests',
      count: reportCounts.Pending,
      title: 'Financial reports pending',
      text: 'Report requests are awaiting Finance Center action.',
      path: '/finance',
    } : null,
  ].filter(Boolean);

  const recentEvents = [
    ...expenses.map((expense) => ({
      key: `expense-${expense.id}`,
      time: expense.date_processed || expense.date_requested,
      label: `Expense ${expense.reference || expense.id} ${String(expense.status || 'updated').toLowerCase()}`,
      detail: expense.description,
      status: expense.status,
      path: '/finance',
      allowed: canManageFinance || expense.requested_by === user?.id,
    })),
    ...activities.map((activity) => ({
      key: `activity-${activity.id}`,
      time: activity.updated_at || activity.created_at || activity.start_date,
      label: `Activity "${activity.title}" ${String(activity.approval_status || 'scheduled').toLowerCase()}`,
      detail: activity.location || activity.venue || 'Department activity',
      status: activity.approval_status,
      path: '/activities',
      allowed: true,
    })),
    ...allocations.map((allocation) => ({
      key: `allocation-${allocation.id}`,
      time: allocation.updated_at || allocation.created_at || allocation.start_time,
      label: `Resource ${allocation.resource_name || allocation.resource} booking ${String(allocation.status || 'updated').toLowerCase()}`,
      detail: allocation.purpose || allocation.allocated_to_username || 'Resource booking',
      status: allocation.status,
      path: '/resources',
      allowed: canManageResources || allocation.allocated_to === user?.id,
    })),
  ]
    .filter((event) => event.allowed && event.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  return (
    <div className="page-container">
      <div className="hubtoll-hero-banner">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            {user?.department ? `${user.department} Department` : 'Department Administration'} | Department command centre
          </p>
        </div>
        <div className="hubtoll-workspace-tag-card">
          <div className="hubtoll-workspace-tag-logo">
            {user?.department ? user.department.slice(0, 2).toUpperCase() : 'DM'}
          </div>
          <div className="hubtoll-workspace-tag-info">
            <span className="hubtoll-workspace-tag-eyebrow">WORKSPACE</span>
            <span className="hubtoll-workspace-tag-title">{user?.department || 'Administration'}</span>
            <span className="hubtoll-workspace-tag-category">Summary and action hub</span>
          </div>
        </div>
      </div>

      {error && <div className="hubtoll-alert-banner hubtoll-alert-error"><span>{error}</span></div>}

      <div className="hubtoll-kpi-grid">
        {canViewFinanceBalances && (
          <div className="hubtoll-kpi-card accent-green">
            <div className="hubtoll-kpi-label">AVAILABLE BUDGET</div>
            <div className="hubtoll-kpi-value">{formatCurrency(totalAvailableBalance)}</div>
            <div className="hubtoll-kpi-sub">Visible under your finance permissions</div>
          </div>
        )}
        {canManageFinance && (
          <div className="hubtoll-kpi-card accent-red">
            <div className="hubtoll-kpi-label">APPROVED EXPENDITURE</div>
            <div className="hubtoll-kpi-value">{formatCurrency(totalApprovedExpenses)}</div>
            <div className="hubtoll-kpi-sub">Processed department expense requests</div>
          </div>
        )}
        <div className="hubtoll-kpi-card accent-blue">
          <div className="hubtoll-kpi-label">RESOURCE AVAILABILITY</div>
          <div className="hubtoll-kpi-value">{availableResources} / {resources.length}</div>
          <div className="hubtoll-kpi-sub">Assets currently marked available</div>
        </div>
        <div className="hubtoll-kpi-card accent-orange">
          <div className="hubtoll-kpi-label">PENDING APPROVALS</div>
          <div className="hubtoll-kpi-value">
            {(canManageFinance ? pendingExpenses : 0) + (canManageResources ? pendingResourceBookings : 0) + (canManageActivities ? pendingActivities : 0)}
          </div>
          <div className="hubtoll-kpi-sub">Items requiring your module review</div>
        </div>
      </div>

      <div className="hubtoll-dashboard-grid">
        <section className="hubtoll-card hubtoll-dashboard-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Needs Your Attention</h3>
              <p className="page-subtitle">Only actionable items assigned to your permissions.</p>
            </div>
          </div>
          <div className="hubtoll-attention-list">
            {attentionItems.length === 0 ? (
              <div className="empty-state compact">No action is required right now.</div>
            ) : attentionItems.map((item) => (
              <button key={item.key} type="button" className="hubtoll-attention-item alert-orange" onClick={() => navigate(item.path)}>
                <div className="hubtoll-attention-left">
                  <div className="hubtoll-attention-pill">{item.count}</div>
                  <div>
                    <div className="hubtoll-attention-title">{item.title}</div>
                    <div className="hubtoll-attention-text">{item.text}</div>
                  </div>
                </div>
                <span className="hubtoll-attention-chevron">›</span>
              </button>
            ))}
          </div>
        </section>

        {canManageFinance && (
          <section className="hubtoll-card hubtoll-dashboard-panel">
            <div className="finance-panel-head">
              <div>
                <h3>Financial Reports</h3>
                <p className="page-subtitle">Compact report request status.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => navigate('/finance')}>Open Finance Center</button>
            </div>
            <div className="hubtoll-mini-metrics">
              {['Ready', 'Pending', 'Rejected', 'Failed'].map((label) => (
                <div key={label} className="hubtoll-mini-metric">
                  <strong>{reportCounts[label] || 0}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="hubtoll-card hubtoll-dashboard-panel">
        <div className="finance-panel-head">
          <div>
            <h3>Department Operations</h3>
            <p className="page-subtitle">Compact module summaries based on your access.</p>
          </div>
        </div>
        <div className="hubtoll-ops-grid">
          {canManageFinance && (
            <div className="hubtoll-op-card op-finance">
              <div className="hubtoll-op-card-head">
                <span className="hubtoll-op-kicker">Finance Center</span>
                <h4>Finance</h4>
              </div>
              <div className="hubtoll-op-metrics">
                <p><strong>{pendingExpenses}</strong><span>Pending requests</span></p>
                <p><strong>{processedExpenses}</strong><span>Recently processed</span></p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/finance')}>Open Finance</button>
            </div>
          )}
          <div className="hubtoll-op-card op-resources">
            <div className="hubtoll-op-card-head">
              <span className="hubtoll-op-kicker">Assets Register</span>
              <h4>Resources</h4>
            </div>
            <div className="hubtoll-op-metrics">
              <p><strong>{availableResources}</strong><span>Available resources</span></p>
              <p><strong>{allocatedResources + approvedBookings}</strong><span>Allocated or booked</span></p>
              <p><strong>{resourceAttention}</strong><span>Requiring attention</span></p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/resources')}>Open Resources</button>
          </div>
          <div className="hubtoll-op-card op-activities">
            <div className="hubtoll-op-card-head">
              <span className="hubtoll-op-kicker">Events Desk</span>
              <h4>Activities</h4>
            </div>
            <div className="hubtoll-op-metrics">
              <p><strong>{canManageActivities ? pendingActivities : 0}</strong><span>Pending approvals</span></p>
              <p><strong>{upcomingActivitiesList.length}</strong><span>Upcoming activities</span></p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/activities')}>Open Activities</button>
          </div>
        </div>
      </section>

      <div className="hubtoll-dashboard-grid">
        <section className="hubtoll-card hubtoll-dashboard-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Recent Department Activity</h3>
              <p className="page-subtitle">Recent cross-module events visible to you.</p>
            </div>
          </div>
          <div className="hubtoll-activity-list">
            {recentEvents.length === 0 ? (
              <div className="empty-state compact">No recent activity to show.</div>
            ) : recentEvents.map((event) => (
              <button key={event.key} type="button" className="hubtoll-activity-row" onClick={() => navigate(event.path)}>
                <div>
                  <strong>{event.label}</strong>
                  <small>{event.detail || 'No additional details'}</small>
                </div>
                <div className="hubtoll-activity-meta">
                  <span className={statusClass(event.status)}>{statusLabel(event.status)}</span>
                  <small>{formatDateTime(event.time)}</small>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="hubtoll-card hubtoll-dashboard-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Upcoming Activities</h3>
              <p className="page-subtitle">Next scheduled department activities.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/activities')}>View Activities</button>
          </div>
          <div className="hubtoll-activity-list">
            {upcomingActivitiesList.length === 0 ? (
              <div className="empty-state compact">No upcoming activities scheduled.</div>
            ) : upcomingActivitiesList.map((activity) => (
              <button key={activity.id} type="button" className="hubtoll-activity-row" onClick={() => navigate('/activities')}>
                <div>
                  <strong>{activity.title}</strong>
                  <small>{activity.location || activity.venue || 'Location not set'}</small>
                </div>
                <div className="hubtoll-activity-meta">
                  <span className={statusClass(activity.approval_status)}>{activity.approval_status || 'Scheduled'}</span>
                  <small>{formatActivitySlot(activity)}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
