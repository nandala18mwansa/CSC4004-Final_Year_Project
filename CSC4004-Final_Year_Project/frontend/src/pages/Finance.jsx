import { useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

const statusClass = {
  PENDING: 'badge badge-pending',
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
};

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

const Finance = () => {
  const { user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [modalType, setModalType] = useState(null); // 'create_expense', 'edit_expense', 'create_budget', 'edit_budget', 'top_up_budget'
  const [saving, setSaving] = useState(false);

  // Expense form state
  const [activeExpenseId, setActiveExpenseId] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetId, setBudgetId] = useState('');

  // Budget form state
  const [activeBudgetId, setActiveBudgetId] = useState(null);
  const [budgetDept, setBudgetDept] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');

  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const loadFinance = useCallback(async () => {
    try {
      const requests = [api.get('expenses/'), api.get('budgets/')];
      if (isManagerOrAdmin) {
        requests.push(api.get('budget-transactions/'));
      }
      const results = await Promise.all(requests);
      setExpenses(results[0].data);
      setBudgets(results[1].data);
      if (isManagerOrAdmin && results[2]) {
        setTransactions(results[2].data);
      }
    } catch (err) {
      console.error('Failed to load finance data', err);
      setError('Unable to load finance data.');
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdmin]);

  useEffect(() => {
    loadFinance();
    const interval = setInterval(loadFinance, 5000);
    return () => clearInterval(interval);
  }, [loadFinance]);

  const openCreateExpense = () => {
    setDescription('');
    setAmount('');
    setBudgetId(budgets.length ? budgets[0].id : '');
    setError('');
    setModalType('create_expense');
  };

  const openEditExpense = (expense) => {
    setActiveExpenseId(expense.id);
    setDescription(expense.description);
    setAmount(expense.amount);
    setBudgetId(expense.budget || '');
    setError('');
    setModalType('edit_expense');
  };

  const openCreateBudget = () => {
    setBudgetDept('');
    setBudgetAmount('');
    setStartDate('');
    setEndDate('');
    setError('');
    setModalType('create_budget');
  };

  const openEditBudget = (budget) => {
    const formatToLocalDatetime = (isoStr) => {
      if (!isoStr) return '';
      const date = new Date(isoStr);
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setActiveBudgetId(budget.id);
    setBudgetDept(budget.department);
    setBudgetAmount(budget.total_amount);
    setStartDate(formatToLocalDatetime(budget.start_date));
    setEndDate(formatToLocalDatetime(budget.end_date));
    setError('');
    setModalType('edit_budget');
  };

  const openTopUpModal = (budget) => {
    setActiveBudgetId(budget.id);
    setTopUpAmount('');
    setTopUpNotes('');
    setError('');
    setModalType('top_up_budget');
  };

  const handleCreateExpense = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('expenses/', {
        description,
        amount: parseFloat(amount),
        budget: budgetId ? parseInt(budgetId) : null,
      });
      await loadFinance();
      setModalType(null);
    } catch (err) {
      console.error('Expense creation failed', err);
      setError(err.response?.data?.detail || 'Unable to submit the expense request.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditExpense = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`expenses/${activeExpenseId}/`, {
        description,
        amount: parseFloat(amount),
        budget: budgetId ? parseInt(budgetId) : null,
      });
      await loadFinance();
      setModalType(null);
    } catch (err) {
      console.error('Expense edit failed', err);
      setError(err.response?.data?.detail || 'Unable to edit the expense request.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense request?')) return;
    setError('');
    try {
      await api.delete(`expenses/${expenseId}/`);
      setExpenses((current) => current.filter((item) => item.id !== expenseId));
    } catch (err) {
      console.error('Expense deletion failed', err);
      setError(err.response?.data?.detail || 'Unable to delete expense request.');
    }
  };

  const handleCreateBudget = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('budgets/', {
        department: budgetDept,
        total_amount: parseFloat(budgetAmount),
        current_balance: parseFloat(budgetAmount),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      });
      await loadFinance();
      setModalType(null);
    } catch (err) {
      console.error('Budget creation failed', err);
      setError(err.response?.data?.detail || 'Unable to create budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBudget = async () => {
    if (!activeBudgetId) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`budgets/${activeBudgetId}/`, {
        department: budgetDept,
        total_amount: parseFloat(budgetAmount),
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
      });
      await loadFinance();
      setModalType(null);
    } catch (err) {
      console.error('Budget edit failed', err);
      setError(err.response?.data?.detail || 'Unable to edit budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this department budget category?')) return;
    setError('');
    try {
      await api.delete(`budgets/${id}/`);
      await loadFinance();
    } catch (err) {
      console.error('Budget deletion failed', err);
      setError('Unable to delete budget category.');
    }
  };

  const handleTopUpBudget = async () => {
    if (!activeBudgetId) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`budgets/${activeBudgetId}/add_funds/`, {
        amount: parseFloat(topUpAmount),
        notes: topUpNotes || 'Department fund allocation',
      });
      await loadFinance();
      setModalType(null);
    } catch (err) {
      console.error('Budget top-up failed', err);
      setError(err.response?.data?.detail || 'Unable to top-up budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (expenseId, status) => {
    setError('');
    try {
      await api.patch(`expenses/${expenseId}/`, { status });
      await loadFinance();
    } catch (err) {
      console.error('Status update failed', err);
      setError(err.response?.data?.detail || 'Unable to update expense status.');
    }
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date_requested) - new Date(a.date_requested)
  );

  const getBudgetName = (id) => {
    const budget = budgets.find((b) => b.id === id);
    return budget ? budget.department : 'General Fund';
  };

  // Math Calculations for Strict Balance Verification
  const totalInitialAllocated = budgets.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalApprovedExpenses = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalAvailableCash = totalInitialAllocated - totalApprovedExpenses;

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="spinner spinner-lg" />
          <p>Loading finance center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Department Module Header */}
      <div className="hubtoll-page-header">
        <div>
          <div className="hubtoll-module-eyebrow">
            <span className="hubtoll-module-badge-icon" style={{ background: '#ff6b2c' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>
            <span className="hubtoll-module-badge-text">DEPARTMENT FINANCE & BUDGETING</span>
          </div>
          <h1 className="page-title">{isStaff ? `${user?.department || 'Department'} Expense Portal` : 'Department Finance & Budgets'}</h1>
          <p className="page-subtitle">
            {isStaff
              ? `View ${user?.department ? user.department + ' department' : 'your'} available funding and track personal expense requests.`
              : 'Allocate departmental funds, review live balances, and manage expense disbursements.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdmin && (
            <button className="btn btn-secondary" type="button" onClick={openCreateBudget}>
              + Create Budget Category
            </button>
          )}
          <button className="hubtoll-btn-primary" type="button" onClick={openCreateExpense}>
            + Request Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="hubtoll-alert-banner hubtoll-alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Status Banner */}
      <div className="hubtoll-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            ✓
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {expenses.filter(e => e.status === 'PENDING').length === 0 ? "All requests processed" : `${expenses.filter(e => e.status === 'PENDING').length} expense requests pending verification`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {expenses.filter(e => e.status === 'PENDING').length === 0 ? 'No approvals need your attention right now.' : 'Department managers have open verification items.'}
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={loadFinance}>
          ↻ Refresh
        </button>
      </div>

      {/* Left-Accent KPI Cards */}
      <div className="hubtoll-kpi-grid">
        <div className="hubtoll-kpi-card accent-blue">
          <div className="hubtoll-kpi-label">TOTAL ALLOCATED</div>
          <div className="hubtoll-kpi-value" style={{ color: '#2563eb' }}>
            {formatCurrency(totalInitialAllocated)}
          </div>
          <div className="hubtoll-kpi-sub">Initial institutional budget</div>
        </div>

        <div className="hubtoll-kpi-card accent-red">
          <div className="hubtoll-kpi-label">APPROVED EXPENDITURE</div>
          <div className="hubtoll-kpi-value" style={{ color: 'var(--color-danger)' }}>
            {formatCurrency(totalApprovedExpenses)}
          </div>
          <div className="hubtoll-kpi-sub">Deducted from budget</div>
        </div>

        <div className="hubtoll-kpi-card accent-green">
          <div className="hubtoll-kpi-label">NET AVAILABLE BALANCE</div>
          <div className="hubtoll-kpi-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(totalAvailableCash)}
          </div>
          <div className="hubtoll-kpi-sub">Remaining balance for department requests</div>
        </div>

        <div className="hubtoll-kpi-card accent-purple">
          <div className="hubtoll-kpi-label">BUDGET CATEGORIES</div>
          <div className="hubtoll-kpi-value">
            {budgets.length}
          </div>
          <div className="hubtoll-kpi-sub">Active department funding categories</div>
        </div>
      </div>

      {/* DEPARTMENT BUDGET CATEGORIES */}
      <div className="content-grid content-grid-3" style={{ marginBottom: '2rem' }}>
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const deptApprovedExpenses = expenses
              .filter((e) => e.budget === budget.id && e.status === 'APPROVED')
              .reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const deptAvailableCash = Number(budget.total_amount || 0) - deptApprovedExpenses;

            return (
              <div key={budget.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3>{budget.department} Budget</h3>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => openTopUpModal(budget)}
                          title="Add funds"
                        >
                          💵
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => openEditBudget(budget)}
                          title="Edit budget details"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => handleDeleteBudget(budget.id)}
                          title="Delete budget category"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ margin: '0.75rem 0' }}>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Available Cash:</p>
                    <h2 style={{ color: deptAvailableCash < 0 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '1.5rem', fontWeight: 700 }}>
                      {formatCurrency(deptAvailableCash)}
                    </h2>
                  </div>

                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>Initial Allocated: <strong>{formatCurrency(budget.total_amount)}</strong></div>
                    <div>Approved Expenses: <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(deptApprovedExpenses)}</strong></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  📅 Duration: {budget.start_date ? formatDateTime(budget.start_date) : 'Flexible'} — {budget.end_date ? formatDateTime(budget.end_date) : 'Ongoing'}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel empty-state" style={{ gridColumn: 'span 3' }}>
            <h3>No Department Budgets Found</h3>
            {isAdmin ? <p>Click "+ Create Budget Category" to add funding for departments.</p> : <p>No budget allocation configured for your department yet.</p>}
          </div>
        )}
      </div>

      {/* EXPENSES TABLE */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>{isStaff ? 'My Submitted Expense Requests' : 'Expense Requests & Processing'}</h2>
            <p className="page-subtitle">Track requested dates, processing timestamps, and approval statuses.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Status</th>
                {!isStaff && <th>Requested By</th>}
                <th>Requested Date & Time</th>
                <th>Processed Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.length > 0 ? (
                sortedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td><strong>{expense.description}</strong></td>
                    <td><strong>{formatCurrency(expense.amount)}</strong></td>
                    <td>{getBudgetName(expense.budget)}</td>
                    <td>
                      <span className={statusClass[expense.status] || 'badge badge-info'}>
                        {expense.status.toLowerCase()}
                      </span>
                    </td>
                    {!isStaff && <td>{expense.requested_by_username || '—'}</td>}
                    <td>{formatDateTime(expense.date_requested)}</td>
                    <td>
                      {expense.date_processed ? (
                        <span>
                          {formatDateTime(expense.date_processed)}
                          {expense.processed_by_username && <small style={{ display: 'block', color: 'var(--text-secondary)' }}>By: {expense.processed_by_username}</small>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {expense.status === 'PENDING' && !isStaff && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              type="button"
                              onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                              title="Approve expense"
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                              title="Reject expense"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(isStaff ? expense.status === 'PENDING' : true) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            onClick={() => openEditExpense(expense)}
                            title="Edit expense details"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => handleDeleteExpense(expense.id)}
                          title="Delete expense entry"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isStaff ? "7" : "8"} style={{ textAlign: 'center', padding: '2rem' }}>
                    No expenses found. Create a new request to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT TRANSACTION HISTORY LOG (ADMIN & MANAGER ONLY) */}
      {isManagerOrAdmin && (
        <div className="glass-panel">
          <div className="page-header" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>📜 Financial Audit Log & Cash Ledger (Admin/Manager Only)</h2>
              <p className="page-subtitle">Timestamped record of cash top-ups, approved expense deductions, and rejections.</p>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Performed By</th>
                    <th>Details / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDateTime(tx.timestamp)}</td>
                      <td>
                        <span className={`badge badge-${tx.action_type === 'TOP_UP' ? 'approved' : tx.action_type === 'DEDUCTION' ? 'pending' : 'rejected'}`}>
                          {tx.action_type === 'TOP_UP' ? '➕ Funds Added' : tx.action_type === 'DEDUCTION' ? '➖ Expense Deducted' : '🚫 Rejected'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: tx.action_type === 'TOP_UP' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {tx.action_type === 'TOP_UP' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </strong>
                      </td>
                      <td><strong>{formatCurrency(tx.balance_after)}</strong></td>
                      <td>{tx.performed_by_username || 'System'}</td>
                      <td>{tx.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No financial transactions logged yet.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT EXPENSE MODAL */}
      {(modalType === 'create_expense' || modalType === 'edit_expense') && (
        <Modal
          title={modalType === 'create_expense' ? 'Request a new expense' : 'Edit expense request'}
          onClose={() => setModalType(null)}
          onSubmit={modalType === 'create_expense' ? handleCreateExpense : handleEditExpense}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Submit Request'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide details for this expense..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (ZMK)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Associated Department Budget Category</label>
            <select
              className="form-select"
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
              required
            >
              <option value="">Select budget category...</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.department} (Available: {formatCurrency(Number(budget.total_amount) - expenses.filter(e => e.budget === budget.id && e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0))})
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* CREATE / EDIT BUDGET MODAL */}
      {(modalType === 'create_budget' || modalType === 'edit_budget') && (
        <Modal
          title={modalType === 'create_budget' ? 'Create Department Budget Category' : 'Edit Department Budget'}
          onClose={() => setModalType(null)}
          onSubmit={modalType === 'create_budget' ? handleCreateBudget : handleEditBudget}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : (modalType === 'create_budget' ? 'Create Budget' : 'Save Changes')}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Department / Unit Name</label>
            <input
              type="text"
              className="form-input"
              value={budgetDept}
              onChange={(e) => setBudgetDept(e.target.value)}
              placeholder="e.g., Marketing, Computer Science, Operations"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Allocated Amount (ZMK)</label>
            <input
              type="number"
              className="form-input"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="e.g. 20000"
              step="100"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Budget Start Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Budget End Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* TOP-UP BUDGET MODAL */}
      {modalType === 'top_up_budget' && (
        <Modal
          title="Add Funds / Top-Up Department Budget"
          onClose={() => setModalType(null)}
          onSubmit={handleTopUpBudget}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Add Funds'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Additional Amount to Add (ZMK)</label>
            <input
              type="number"
              className="form-input"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="e.g. 10000"
              step="10"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Notes / Allocation Reason</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={topUpNotes}
              onChange={(e) => setTopUpNotes(e.target.value)}
              placeholder="e.g. Q3 Department Allocation Top-up"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Finance;
