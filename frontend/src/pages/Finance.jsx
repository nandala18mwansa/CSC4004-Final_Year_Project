import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContext';

const statusClass = {
  PENDING: 'badge badge-pending',
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const Finance = () => {
  const { user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [modalType, setModalType] = useState(null); // 'create_expense', 'edit_expense', 'create_budget'
  const [saving, setSaving] = useState(false);

  // Expense form state
  const [activeExpenseId, setActiveExpenseId] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetId, setBudgetId] = useState('');

  // Budget form state
  const [budgetDept, setBudgetDept] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetYear, setBudgetYear] = useState('');

  const loadFinance = async () => {
    try {
      const [expenseRes, budgetRes] = await Promise.all([
        api.get('expenses/'),
        api.get('budgets/'),
      ]);
      setExpenses(expenseRes.data);
      setBudgets(budgetRes.data);
    } catch (err) {
      console.error('Failed to load finance data', err);
      setError('Unable to load finance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const openCreateExpense = () => {
    setDescription('');
    setAmount('');
    setBudgetId('');
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
    setBudgetYear('');
    setError('');
    setModalType('create_budget');
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
        fiscal_year: budgetYear,
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

  const handleUpdateStatus = async (expenseId, status) => {
    setError('');
    try {
      await api.patch(`expenses/${expenseId}/`, { status });
      setExpenses((current) =>
        current.map((item) => (item.id === expenseId ? { ...item, status } : item))
      );
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
    return budget ? `${budget.department} (${budget.fiscal_year})` : '—';
  };

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

  const isStaff = user?.role === 'STAFF';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isStaff ? 'My Expense Requests' : 'Finance Hub'}</h1>
          <p className="page-subtitle">
            {isStaff
              ? 'Submit and manage your personal expense and budget requests.'
              : 'Approve department requests, allocate funds, and monitor budgets.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isStaff && (
            <button className="btn btn-secondary" type="button" onClick={openCreateBudget}>
              + Create Budget
            </button>
          )}
          <button className="btn btn-primary" type="button" onClick={openCreateExpense}>
            + Request Expense
          </button>
        </div>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 'var(--radius-md)' }}>{error}</p>}

      <div className="glass-panel">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Budget Category</th>
                <th>Status</th>
                {!isStaff && <th>Requested by</th>}
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.length > 0 ? (
                sortedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.description}</strong>
                    </td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>{getBudgetName(expense.budget)}</td>
                    <td>
                      <span className={statusClass[expense.status] || 'badge badge-info'}>
                        {expense.status.toLowerCase()}
                      </span>
                    </td>
                    {!isStaff && <td>{expense.requested_by_username || '—'}</td>}
                    <td>{new Date(expense.date_requested).toLocaleDateString()}</td>
                    <td>
                      {expense.status === 'PENDING' ? (
                        isStaff ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              onClick={() => openEditExpense(expense)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                        )
                      ) : (
                        <span className="badge badge-info" style={{ background: 'transparent', border: 'none' }}>No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isStaff ? "6" : "7"} style={{ textAlign: 'center', padding: '2rem' }}>
                    No expenses found. Create a new request to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT EXPENSE MODAL */}
      {(modalType === 'create_expense' || modalType === 'edit_expense') && (
        <Modal
          title={modalType === 'create_expense' ? 'Request a new expense' : 'Edit expense request'}
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={modalType === 'create_expense' ? handleCreateExpense : handleEditExpense}
                disabled={saving}
              >
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
              placeholder="Provide a detailed description of the expense request..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount ($)</label>
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
            <label className="form-label">Associated Budget</label>
            <select
              className="form-select"
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
            >
              <option value="">Choose a budget category</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.department} — Fiscal Year {budget.fiscal_year}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* CREATE BUDGET MODAL */}
      {modalType === 'create_budget' && (
        <Modal
          title="Create a new budget category"
          onClose={() => setModalType(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateBudget} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Create Budget'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Department / Responsibility</label>
            <input
              type="text"
              className="form-input"
              value={budgetDept}
              onChange={(e) => setBudgetDept(e.target.value)}
              placeholder="e.g., Marketing, IT, Human Resources"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Total Allocated Amount ($)</label>
            <input
              type="number"
              className="form-input"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="e.g. 50000"
              step="100"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fiscal Year</label>
            <input
              type="text"
              className="form-input"
              value={budgetYear}
              onChange={(e) => setBudgetYear(e.target.value)}
              placeholder="e.g. 2026-2027"
              maxLength="9"
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Finance;
