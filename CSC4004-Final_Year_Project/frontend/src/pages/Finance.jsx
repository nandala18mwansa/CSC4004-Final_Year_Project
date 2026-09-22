import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

const money = (v) => `ZMW ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (v) => v ? new Date(v).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const rows = (response) => Array.isArray(response?.data) ? response.data : (response?.data?.results || []);
const errText = (e, fallback='Something went wrong.') => {
  const d=e?.response?.data;
  if (!d) return fallback;
  if (typeof d==='string') {
    if (d.trim().startsWith('<!DOCTYPE') || d.includes('<html')) return fallback;
    return d;
  }
  if (d.detail) return d.detail;
  const v=Object.values(d)[0];
  return Array.isArray(v)?v[0]:(typeof v==='string'?v:fallback);
};
const formatDateTime = (v) => {
  if (!v) return { date: '–', time: '' };
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return { date: String(v), time: '' };
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date, time };
  } catch {
    return { date: String(v), time: '' };
  }
};

const TX_TYPE_CONFIG = {
  TOP_UP: { label: 'Top Up', bg: 'rgba(22, 163, 74, 0.1)', text: '#15803d', border: 'rgba(22, 163, 74, 0.25)' },
  DEDUCTION: { label: 'Deduction', bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c', border: 'rgba(234, 88, 12, 0.25)' },
  REFUND: { label: 'Reversal', bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' },
  ADJUSTMENT: { label: 'Adjustment', bg: 'rgba(100, 116, 139, 0.1)', text: '#475569', border: 'rgba(100, 116, 139, 0.25)' },
  REJECTION: { label: 'Rejection', bg: 'rgba(239, 68, 68, 0.1)', text: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)' },
};

const TxTypeBadge = ({ type }) => {
  const cfg = TX_TYPE_CONFIG[type] || {
    label: (type || '').replace(/_/g, ' '),
    bg: 'rgba(148, 163, 184, 0.1)',
    text: '#475569',
    border: 'rgba(148, 163, 184, 0.25)',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
};

const BudgetStatusBadge = ({ budget }) => {
  const isExpired = budget.end_date && new Date(budget.end_date) < new Date();
  const isExhausted = Number(budget.current_balance || 0) <= 0 && Number(budget.total_amount || 0) > 0;
  if (isExpired) {
    return (
      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '9999px', background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
        Expired
      </span>
    );
  }
  if (isExhausted) {
    return (
      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        Exhausted
      </span>
    );
  }
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '9999px', background: 'rgba(22, 163, 74, 0.1)', color: '#15803d', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
      Active
    </span>
  );
};

const Badge=({value})=><span className={`badge badge-${String(value).toLowerCase()}`}>{value}</span>;

export default function Finance(){
  const { user }=useContext(AuthContext);
  const privileged=Boolean(user?.is_superuser||user?.has_finance_privilege);
  const [tab,setTab]=useState('overview'); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const [expenses,setExpenses]=useState([]); const [budgets,setBudgets]=useState([]); const [transactions,setTransactions]=useState([]); const [reports,setReports]=useState([]); const [notifications,setNotifications]=useState([]); const [dashboard,setDashboard]=useState(null);
  const [modal,setModal]=useState(null); const [selected,setSelected]=useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [processingAction, setProcessingAction] = useState('');
  const [description,setDescription]=useState(''); const [amount,setAmount]=useState(''); const [budgetId,setBudgetId]=useState(''); const [reason,setReason]=useState('');
  const [budgetName,setBudgetName]=useState(''); const [budgetAmount,setBudgetAmount]=useState(''); const [startDate,setStartDate]=useState(''); const [endDate,setEndDate]=useState('');
  const [reportStart,setReportStart]=useState(''); const [reportEnd,setReportEnd]=useState(''); const [reportFormat,setReportFormat]=useState('PDF'); const [reportReason,setReportReason]=useState('');
  const [filterStatus,setFilterStatus]=useState(''); const [search,setSearch]=useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerBudget, setLedgerBudget] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerStart, setLedgerStart] = useState('');
  const [ledgerEnd, setLedgerEnd] = useState('');

  const load=useCallback(async()=>{
    setLoading(true); setError('');
    try{
      const common=await Promise.all([api.get('expenses/?page_size=100'),api.get('financial-summary-requests/?page_size=100'),api.get('finance-notifications/?page_size=20')]);
      setExpenses(rows(common[0])); setReports(rows(common[1])); setNotifications(rows(common[2]));
      if(privileged){
        const [b,t,d]=await Promise.all([api.get('budgets/?page_size=100'),api.get('budget-transactions/?page_size=100'),api.get('budget-transactions/dashboard/')]);
        setBudgets(rows(b)); setTransactions(rows(t)); setDashboard(d.data);
      }
    }catch(e){setError(errText(e,'Unable to load finance data.'));}finally{setLoading(false);}
  },[privileged]);
  useEffect(()=>{load();},[load]);

  // --- Budgets Page Calculations ---
  const budgetSummary = useMemo(() => {
    const totalAllocated = budgets.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    const totalAvailable = budgets.reduce((acc, b) => acc + Number(b.current_balance || 0), 0);
    const totalSpent = Math.max(0, totalAllocated - totalAvailable);
    const now = new Date();
    const activeBudgets = budgets.filter((b) => {
      if (!b.end_date) return true;
      return new Date(b.end_date) >= now;
    }).length;
    return {
      activeCount: activeBudgets,
      totalCount: budgets.length,
      totalAllocated,
      totalSpent,
      totalAvailable,
    };
  }, [budgets]);

  // --- Ledger Filtering & Summary Calculations ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (ledgerBudget && String(t.budget) !== String(ledgerBudget)) return false;
      if (ledgerType && t.action_type !== ledgerType) return false;
      if (ledgerSearch) {
        const q = ledgerSearch.toLowerCase();
        const refMatch = (t.reference || '').toLowerCase().includes(q);
        const descMatch = (t.notes || t.expense_description || '').toLowerCase().includes(q);
        const budgetMatch = (t.budget_department || '').toLowerCase().includes(q);
        const userMatch = (t.performed_by_username || '').toLowerCase().includes(q);
        if (!refMatch && !descMatch && !budgetMatch && !userMatch) return false;
      }
      if (ledgerStart) {
        const txDate = t.timestamp ? t.timestamp.slice(0, 10) : '';
        if (txDate && txDate < ledgerStart) return false;
      }
      if (ledgerEnd) {
        const txDate = t.timestamp ? t.timestamp.slice(0, 10) : '';
        if (txDate && txDate > ledgerEnd) return false;
      }
      return true;
    });
  }, [transactions, ledgerBudget, ledgerType, ledgerSearch, ledgerStart, ledgerEnd]);

  const ledgerSummary = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let adjustments = 0;

    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.action_type === 'TOP_UP' || t.action_type === 'REFUND') {
        credits += amt;
      } else if (t.action_type === 'DEDUCTION') {
        debits += amt;
      } else if (t.action_type === 'ADJUSTMENT') {
        adjustments += amt;
      }
    });

    const netMovement = credits - debits + adjustments;
    // Current total available across all budgets or selected budget
    let currentBalance = 0;
    if (ledgerBudget) {
      const b = budgets.find((x) => String(x.id) === String(ledgerBudget));
      currentBalance = b ? Number(b.current_balance || 0) : 0;
    } else {
      currentBalance = budgets.reduce((acc, b) => acc + Number(b.current_balance || 0), 0);
    }
    const openingBalance = Math.max(0, currentBalance - netMovement);

    return {
      opening: openingBalance,
      credits,
      debits,
      adjustments,
      netMovement,
      current: currentBalance,
    };
  }, [filteredTransactions, budgets, ledgerBudget]);

  const hasLedgerFilters = Boolean(ledgerSearch || ledgerBudget || ledgerType || ledgerStart || ledgerEnd);
  const resetLedgerFilters = () => {
    setLedgerSearch('');
    setLedgerBudget('');
    setLedgerType('');
    setLedgerStart('');
    setLedgerEnd('');
  };

    const pendingExpenses=useMemo(()=>expenses.filter(x=>x.status==='PENDING'),[expenses]);
  const filteredExpenses=useMemo(()=>expenses.filter(x=>(!filterStatus||x.status===filterStatus)&&(!search||`${x.reference} ${x.description} ${x.requested_by_username}`.toLowerCase().includes(search.toLowerCase()))),[expenses,filterStatus,search]);
  const unread=notifications.filter(n=>!n.is_read).length;
  const reset=()=>{
    setModal(null);
    setSelected(null);
    setIsRejecting(false);
    setProcessingAction('');
    setDescription('');
    setAmount('');
    setBudgetId('');
    setReason('');
    setBudgetName('');
    setBudgetAmount('');
    setStartDate('');
    setEndDate('');
    setReportReason('');
    setReportStart('');
    setReportEnd('');
  };
  const run=async(fn)=>{
    setSaving(true);
    setError('');
    try{
      await fn();
      reset();
      await load();
    }catch(e){
      setError(errText(e));
    }finally{
      setSaving(false);
      setProcessingAction('');
    }
  };

  const createExpense=()=>run(()=>api.post('expenses/',{description,amount:Number(amount),budget:budgetId?Number(budgetId):null}));
  const decideExpense = (decision) => {
      setProcessingAction(decision);
      return run(async () => {
        if (decision === 'approve') {
          if (!selected?.budget && budgetId) {
            await api.patch(`expenses/${selected.id}/`, { budget: Number(budgetId) });
          }
          await api.post(`expenses/${selected.id}/approve/`, { comments: reason });
        } else {
          await api.post(`expenses/${selected.id}/reject/`, { reason: reason.trim() });
        }
      });
    };
  const createBudget=()=>run(()=>api.post('budgets/',{department:budgetName,total_amount:Number(budgetAmount),start_date:startDate||null,end_date:endDate||null}));
  const topUp=()=>run(()=>api.post(`budgets/${selected.id}/add-funds/`,{amount:Number(budgetAmount),notes:reason||'Additional allocation'}));
  const requestReport=()=>run(()=>api.post('financial-summary-requests/',{reason:reportReason,report_start:reportStart,report_end:reportEnd,report_format:reportFormat}));
  const decideReport = (decision) => {
    setProcessingAction(decision);
    return run(() => api.post(`financial-summary-requests/${selected.id}/${decision}/`, decision === 'reject' ? { reason: reason.trim() } : {}));
  };
  const download=async(path,fallback)=>{try{const r=await api.download(path);const u=URL.createObjectURL(r.blob);const a=document.createElement('a');a.href=u;a.download=r.filename||fallback;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);}catch(e){setError(errText(e,'Unable to download report.'));}};
  const generateReport = () => {
    setError('');
    if (reportStart && reportEnd && reportStart > reportEnd) {
      setError('From date cannot be after To date.');
      return;
    }
    const p = new URLSearchParams();
    if (reportStart) p.set('start', reportStart);
    if (reportEnd) p.set('end', reportEnd);
    p.set('format', reportFormat);
    p.set('report_format', reportFormat);
    const ext = reportFormat === 'EXCEL' ? 'xlsx' : reportFormat === 'CSV' ? 'csv' : 'pdf';
    const prefix = reportFormat === 'CSV' ? 'DMS_Financial_Ledger' : 'DMS_Financial_Statement';
    const startStr = reportStart || 'beginning';
    const endStr = reportEnd || 'today';
    download(`budget-transactions/financial-report/?${p}`, `${prefix}_${startStr}_to_${endStr}.${ext}`);
  };

  if(loading)return <div className="page-container"><div className="empty-state"><div className="spinner spinner-lg"/><p>Loading finance center...</p></div></div>;
  const tabs=privileged?['overview','expenses','budgets','ledger','reports','requests']:['overview','expenses','requests','notifications'];
  return <div className="page-container finance-v2">
    <div className="hubtoll-page-header"><div><div className="hubtoll-module-eyebrow"><span className="hubtoll-module-badge-text">DEPARTMENT FINANCE & BUDGETING</span></div><h1 className="page-title">{privileged?'Department Finance & Budgets':'My Finance'}</h1><p className="page-subtitle">{privileged?'Financial control, approvals, ledger and reporting.':'Submit requests and track your financial activity.'}</p></div><div className="finance-actions"><button className="btn btn-secondary" onClick={()=>setModal('expense')}>+ Request Expense</button>{!privileged&&<button className="hubtoll-btn-primary" onClick={()=>setModal('reportRequest')}>Request Financial Report</button>}</div></div>
    {error&&<div className="hubtoll-alert-banner hubtoll-alert-error"><span>{error}</span></div>}
    <div className="finance-tabs">{tabs.map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}{t==='notifications'&&unread>0?` (${unread})`:''}</button>)}</div>

    {tab==='overview'&&privileged&&<>
      {/* Enhanced KPI Cards with Visual Indicators and Accents */}
      <div className="hubtoll-kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="hubtoll-kpi-card accent-blue">
          <div className="kpi-row-header">
            <span className="hubtoll-kpi-label">TOTAL ALLOCATED</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
          </div>
          <div className="hubtoll-kpi-value" style={{ color: '#1e3a8a', fontSize: '1.45rem', fontWeight: 700 }}>
            {money(dashboard?.total_allocated)}
          </div>
          <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Allocated across departmental budgets
          </div>
        </div>

        <div className="hubtoll-kpi-card accent-orange">
          <div className="kpi-row-header">
            <span className="hubtoll-kpi-label">APPROVED EXPENDITURE</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div className="hubtoll-kpi-value" style={{ color: '#ea580c', fontSize: '1.45rem', fontWeight: 700 }}>
            {money(dashboard?.approved_expenditure)}
          </div>
          <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Total processed & debited expenses
          </div>
        </div>

        <div className="hubtoll-kpi-card accent-green">
          <div className="kpi-row-header">
            <span className="hubtoll-kpi-label">AVAILABLE BALANCE</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            </div>
          </div>
          <div className="hubtoll-kpi-value" style={{ color: '#16a34a', fontSize: '1.45rem', fontWeight: 700 }}>
            {money(dashboard?.available_balance)}
          </div>
          <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Current unspent departmental operating funds
          </div>
        </div>

        <div className={`hubtoll-kpi-card ${(dashboard?.pending_expenses || 0) > 0 ? 'accent-amber' : 'accent-neutral'}`}>
          <div className="kpi-row-header">
            <span className="hubtoll-kpi-label">PENDING EXPENSES</span>
            <div className="kpi-icon-wrap" style={{
              background: (dashboard?.pending_expenses || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.1)',
              color: (dashboard?.pending_expenses || 0) > 0 ? '#d97706' : '#64748b'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className="hubtoll-kpi-value" style={{
            color: (dashboard?.pending_expenses || 0) > 0 ? '#d97706' : '#64748b',
            fontSize: '1.45rem',
            fontWeight: 700
          }}>
            {dashboard?.pending_expenses || 0}
          </div>
          <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {(dashboard?.pending_expenses || 0) > 0 ? 'Awaiting administrative review & approval' : 'All requests processed (clean queue)'}
          </div>
        </div>
      </div>

      <div className="finance-grid">
        {/* Attention Required Section */}
        <section className="hubtoll-card finance-panel">
          <div className="finance-panel-head">
            <h3>Attention Required</h3>
          </div>
          {(dashboard?.attention || []).length === 0 && pendingExpenses.length === 0 && reports.filter(r => r.status === 'PENDING').length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '1.1rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  All accounts & requests are up to date
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  No items require immediate administrative attention at this time.
                </span>
              </div>
            </div>
          ) : (
            <div className="attention-list">
              {pendingExpenses.length > 0 && (
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.08)', cursor: 'pointer' }}
                  onClick={() => setTab('expenses')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    <span style={{ color: '#d97706' }}>●</span> {pendingExpenses.length} expense request(s) awaiting approval
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 600 }}>Review in Expenses →</span>
                </button>
              )}
              {reports.filter(r => r.status === 'PENDING').length > 0 && (
                <button
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', cursor: 'pointer' }}
                  onClick={() => setTab('requests')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    <span style={{ color: '#2563eb' }}>●</span> {reports.filter(r => r.status === 'PENDING').length} financial report request(s) awaiting review
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>Review in Requests →</span>
                </button>
              )}
              {(dashboard?.attention || []).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.06)', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  <span style={{ color: '#dc2626' }}>⚠️</span> {a.message}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Expense Approvals Section */}
        <section className="hubtoll-card finance-panel">
          <div className="finance-panel-head">
            <h3>Pending Expense Approvals</h3>
            {pendingExpenses.length > 0 && (
              <button type="button" onClick={() => setTab('expenses')}>View all ({pendingExpenses.length})</button>
            )}
          </div>
          {pendingExpenses.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '1.1rem 1.25rem',
              borderRadius: '10px',
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              color: 'var(--text-secondary)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  No pending expense approvals
                </strong>
                <span style={{ fontSize: '0.82rem' }}>
                  All submitted department expense requests have been reviewed and processed.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingExpenses.slice(0, 5).map(e => (
                <div className="compact-row" key={e.id}>
                  <div>
                    <strong>{e.reference}</strong>
                    <small>{e.description} ({e.requested_by_username || 'Staff'})</small>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{money(e.amount)}</span>
                  <button
                    type="button"
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', background: '#ff6b2c', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => {
                      setSelected(e);
                      setBudgetId(e.budget || '');
                      setReason('');
                      setIsRejecting(false);
                      setProcessingAction('');
                      setModal('expenseDecision');
                    }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Budget Utilization / Overview Section (Turned into actionable section) */}
      <section className="hubtoll-card finance-panel" style={{ marginTop: '1.25rem' }}>
        <div className="finance-panel-head">
          <div>
            <h3>Budget Utilization & Overview</h3>
            <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
              Real-time expenditure tracking across active departmental budget lines.
            </p>
          </div>
          <button type="button" onClick={() => setTab('budgets')}>View all budgets →</button>
        </div>

        {budgets.length === 0 ? (
          <p className="muted">No departmental budgets recorded. Create a budget line to begin tracking.</p>
        ) : (
          <div className="finance-mini-grid">
            {budgets.map(b => {
              const util = Math.min(100, Math.max(0, Number(b.utilization_percent) || 0));
              const isWarning = util >= 75;
              const isCritical = util >= 90;
              const spent = Number(b.total_amount || 0) - Number(b.current_balance || 0);
              const progressColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

              return (
                <div className="budget-card" key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{b.department}</strong>
                    {isWarning && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isCritical ? '#dc2626' : '#d97706',
                        background: isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px'
                      }}>
                        {util}% utilized
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>Used: {money(spent)}</span>
                    <span style={{ fontWeight: 600 }}>Total: {money(b.total_amount)}</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '7px', width: '100%', background: 'var(--border-color, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${util}%`, background: progressColor, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      Available: <strong style={{ color: '#16a34a' }}>{money(b.current_balance)}</strong>
                    </small>
                    <button
                      type="button"
                      style={{ fontSize: '0.8rem', color: '#ff6b2c', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => { setSelected(b); setBudgetAmount(''); setReason(''); setModal('topup'); }}
                    >
                      + Add Funds
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>}

    {tab==='overview'&&!privileged&&<><div className="finance-kpis"><div><span>My Pending</span><strong>{expenses.filter(e=>e.status==='PENDING').length}</strong></div><div><span>My Approved</span><strong>{expenses.filter(e=>e.status==='APPROVED').length}</strong></div><div><span>My Rejected</span><strong>{expenses.filter(e=>e.status==='REJECTED').length}</strong></div><div><span>Unread Notifications</span><strong>{unread}</strong></div></div><section className="hubtoll-card finance-panel"><div className="finance-panel-head"><h3>Recent Requests</h3><button onClick={()=>setTab('expenses')}>View history</button></div>{expenses.slice(0,5).map(e=><div className="compact-row" key={e.id}><div><strong>{e.reference}</strong><small>{e.description}</small></div><span>{money(e.amount)}</span><Badge value={e.status}/></div>)}</section></>}

    {tab==='expenses'&&<section className="hubtoll-card finance-panel"><div className="finance-panel-head"><h3>{privileged?'Expense Management':'My Expense Requests'}</h3><button className="hubtoll-btn-primary" onClick={()=>setModal('expense')}>+ Request Expense</button></div><div className="finance-filters"><input placeholder="Search reference, description or requester" value={search} onChange={e=>setSearch(e.target.value)}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></div><div className="table-wrap"><table className="finance-table"><thead><tr><th>Reference</th>{privileged&&<th>Requester</th>}<th>Description</th><th>Budget</th><th>Amount</th><th>Date</th><th>Status</th><th>Feedback</th>{privileged&&<th>Action</th>}</tr></thead><tbody>{filteredExpenses.map(e=><tr key={e.id}><td>{e.reference}</td>{privileged&&<td>{e.requested_by_username}</td>}<td>{e.description}</td><td>{e.budget_department||'Unassigned'}</td><td>{money(e.amount)}</td><td>{day(e.date_requested)}</td><td><Badge value={e.status}/></td><td>{e.rejection_reason||'—'}</td>{privileged&&<td>{e.status==='PENDING'?<button onClick={()=>{setSelected(e);setBudgetId(e.budget||'');setReason('');setIsRejecting(false);setProcessingAction('');setModal('expenseDecision');}}>Review</button>:'—'}</td>}</tr>)}</tbody></table></div></section>}

    {tab==='budgets'&&privileged&&(
      <>
        {/* Compact Budgets Summary Section */}
        <div className="hubtoll-kpi-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="hubtoll-kpi-card accent-blue">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">ACTIVE BUDGETS</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#1e3a8a', fontSize: '1.45rem', fontWeight: 700 }}>
              {budgetSummary.activeCount}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {budgetSummary.totalCount} total departmental {budgetSummary.totalCount === 1 ? 'allocation' : 'allocations'}
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-blue">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">TOTAL ALLOCATED</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(30, 58, 138, 0.1)', color: '#1e3a8a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#1e3a8a', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(budgetSummary.totalAllocated)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Cumulative departmental funding
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-orange">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">TOTAL SPENT</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#ea580c', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(budgetSummary.totalSpent)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Approved expenditure across budgets
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-green">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">TOTAL AVAILABLE</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#16a34a', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(budgetSummary.totalAvailable)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Remaining operational balance
            </div>
          </div>
        </div>

        {/* Budgets Management Section */}
        <section className="hubtoll-card finance-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Departmental Budgets</h3>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
                Active cost centers, spending allocations, and expenditure utilization.
              </p>
            </div>
            <button className="hubtoll-btn-primary" onClick={() => setModal('budget')}>
              + Create Budget
            </button>
          </div>

          {budgets.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '10px',
              border: '1px dashed var(--border-color, #cbd5e1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Departmental Budgets Configured
              </h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                Create a budget category to allocate funds and begin tracking departmental expenditures.
              </p>
              <button className="hubtoll-btn-primary" onClick={() => setModal('budget')}>
                + Create First Budget
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem',
              marginTop: '0.5rem'
            }}>
              {budgets.map((b) => {
                const allocated = Number(b.total_amount || 0);
                const available = Number(b.current_balance || 0);
                const spent = Math.max(0, allocated - available);
                const util = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
                const isHigh = util >= 75;
                const isCritical = util >= 90;

                return (
                  <div
                    key={b.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Budget Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                          {b.department}
                        </h4>
                        <BudgetStatusBadge budget={b} />
                      </div>

                      {/* Date Range Subtitle */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{b.start_date || b.end_date ? `${day(b.start_date)} – ${day(b.end_date)}` : 'Fiscal Year Ongoing'}</span>
                      </div>

                      {/* Separated 3-Metric Block */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        background: 'var(--bg-subtle, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '8px',
                        padding: '0.8rem 0.65rem',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                            ALLOCATED
                          </span>
                          <strong style={{ fontSize: '0.88rem', color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                            {money(b.total_amount)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                            SPENT
                          </span>
                          <strong style={{ fontSize: '0.88rem', color: '#ea580c', whiteSpace: 'nowrap' }}>
                            {money(spent)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                            AVAILABLE
                          </span>
                          <strong style={{ fontSize: '0.88rem', color: '#16a34a', whiteSpace: 'nowrap' }}>
                            {money(b.current_balance)}
                          </strong>
                        </div>
                      </div>

                      {/* Budget Utilization Progress Bar */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Budget Utilization</span>
                          <strong style={{
                            color: isCritical ? '#dc2626' : isHigh ? '#d97706' : '#2563eb',
                            fontWeight: 700
                          }}>
                            {util}%
                          </strong>
                        </div>
                        <div style={{
                          height: '7px',
                          width: '100%',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '9999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, util))}%`,
                            backgroundColor: isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#3b82f6',
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer: Secondary Add Funds Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '0.45rem 0.95rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        onClick={() => {
                          setSelected(b);
                          setBudgetAmount('');
                          setReason('');
                          setModal('topup');
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Funds
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
    )}

    {tab==='ledger'&&privileged&&(
      <>
        {/* Compact Ledger Financial Summary */}
        <div className="hubtoll-kpi-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="hubtoll-kpi-card accent-blue">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">OPENING BALANCE</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#1e3a8a', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(ledgerSummary.opening)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Base position before movements
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-green">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">TOTAL CREDITS</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#16a34a', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(ledgerSummary.credits)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Top-ups & cash inflows
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-orange">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">TOTAL DEBITS</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#ea580c', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(ledgerSummary.debits)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Approved expenditures
            </div>
          </div>

          <div className="hubtoll-kpi-card accent-green">
            <div className="kpi-row-header">
              <span className="hubtoll-kpi-label">CURRENT BALANCE</span>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div className="hubtoll-kpi-value" style={{ color: '#15803d', fontSize: '1.45rem', fontWeight: 700 }}>
              {money(ledgerSummary.current)}
            </div>
            <div className="hubtoll-kpi-sub" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Closing operational liquidity
            </div>
          </div>
        </div>

        {/* Ledger Table Section with Toolbar */}
        <section className="hubtoll-card finance-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Financial Ledger</h3>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
                Audited transactional ledger documenting all cash inflows, approvals, and balance movements.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{filteredTransactions.length}</strong> of <strong>{transactions.length}</strong> transactions
            </div>
          </div>

          {/* Search and Filtering Toolbar */}
          <div style={{
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search reference, notes or budget..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ flex: '0 1 170px', minWidth: '150px' }}>
              <select
                className="form-select"
                value={ledgerBudget}
                onChange={(e) => setLedgerBudget(e.target.value)}
                style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
              >
                <option value="">All Budgets</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '0 1 150px', minWidth: '130px' }}>
              <select
                className="form-select"
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value)}
                style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
              >
                <option value="">All Types</option>
                <option value="TOP_UP">Top Up</option>
                <option value="DEDUCTION">Deduction</option>
                <option value="REFUND">Reversal</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="REJECTION">Rejection</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                value={ledgerStart}
                onChange={(e) => setLedgerStart(e.target.value)}
                style={{ height: '36px', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                value={ledgerEnd}
                onChange={(e) => setLedgerEnd(e.target.value)}
                style={{ height: '36px', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              />
            </div>

            {hasLedgerFilters && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetLedgerFilters}
                style={{
                  height: '36px',
                  padding: '0 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Ledger Table */}
          <div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="finance-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '115px' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '135px' }}>Reference</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '170px' }}>Budget</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '220px' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '105px', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px', textAlign: 'right' }}>Debit</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px', textAlign: 'right' }}>Credit</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '125px', textAlign: 'right' }}>Before</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', width: '125px', textAlign: 'right' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                      No ledger transactions match the selected filters.
                      {hasLedgerFilters && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={resetLedgerFilters}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                          >
                            Clear All Filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t, idx) => {
                    const isDebit = t.action_type === 'DEDUCTION';
                    const isCredit = ['TOP_UP', 'REFUND'].includes(t.action_type);
                    const debit = isDebit ? t.amount : '';
                    const credit = isCredit ? t.amount : '';
                    const dt = formatDateTime(t.timestamp);
                    const isEven = idx % 2 === 1;

                    return (
                      <tr
                        key={t.id}
                        style={{
                          background: isEven ? 'rgba(248, 250, 252, 0.7)' : '#ffffff',
                          borderBottom: '1px solid #e2e8f0',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                            {dt.date}
                          </div>
                          {dt.time && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                              {dt.time}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            color: '#1e3a8a',
                            background: 'rgba(30, 58, 138, 0.08)',
                            padding: '0.18rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            {t.reference}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.83rem' }}>
                          {t.budget_department || '–'}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: '1.35', wordBreak: 'break-word' }}>
                          {t.notes || t.expense_description || '–'}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <TxTypeBadge type={t.action_type} />
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', color: debit ? '#ea580c' : 'var(--text-secondary)', fontWeight: debit ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                          {debit ? money(debit) : '–'}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', color: credit ? '#16a34a' : 'var(--text-secondary)', fontWeight: credit ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                          {credit ? money(credit) : '–'}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem' }}>
                          {money(t.balance_before)}
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.84rem' }}>
                          {money(t.balance_after)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )}

    {tab==='reports'&&privileged&&(
      <>
        <section className="hubtoll-card finance-panel">
          <div className="finance-panel-head">
            <div>
              <h3>Generate Financial Statement</h3>
              <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.84rem' }}>
                Generate and export official departmental financial statements in PDF or Excel (.xlsx) format based on verified ledger movements and point-in-time opening/closing balances.
              </p>
            </div>
          </div>

          <div style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">From Date (Reporting Start)</label>
                <input
                  type="date"
                  className="form-input"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">To Date (Reporting End)</label>
                <input
                  type="date"
                  className="form-input"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Report Format</label>
                <select
                  className="form-select"
                  style={{ width: '100%' }}
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                >
                  <option value="PDF">PDF Financial Statement (.pdf)</option>
                  <option value="EXCEL">Excel Spreadsheet (.xlsx)</option>
                  <option value="CSV">CSV Data Export (.csv)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="hubtoll-btn-primary"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={generateReport}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Generate & Download
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Report History / Recent Statements Section */}
        <section className="hubtoll-card finance-panel" style={{ marginTop: '1.25rem' }}>
          <div className="finance-panel-head">
            <div>
              <h3>Recent Statements & Completed Reports</h3>
              <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
                Archived departmental financial statements and approved summaries available for download.
              </p>
            </div>
            <button type="button" onClick={() => setTab('requests')}>
              View All Requests →
            </button>
          </div>

          {reports.filter(r => r.status === 'COMPLETED').length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '1.1rem 1.25rem',
              borderRadius: '10px',
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              color: 'var(--text-secondary)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  No archived financial reports yet
                </strong>
                <span style={{ fontSize: '0.82rem' }}>
                  Use the generator above to produce on-demand statements, or approve report requests in the Requests tab.
                </span>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Report Reference</th>
                    <th>Reporting Period</th>
                    <th>Generated Date</th>
                    <th>Format</th>
                    <th>Requester</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.filter(r => r.status === 'COMPLETED').slice(0, 10).map(r => (
                    <tr key={r.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#ea580c' }}>{r.reference}</strong>
                      </td>
                      <td>{day(r.report_start)} → {day(r.report_end)}</td>
                      <td>{day(r.processed_at || r.requested_at)}</td>
                      <td>
                        <span className={`badge ${r.report_format === 'EXCEL' ? 'badge-approved' : 'badge-info'}`}>
                          {r.report_format === 'EXCEL' ? 'Excel (.xlsx)' : 'PDF'}
                        </span>
                      </td>
                      <td>{r.requested_by_username || 'Admin'}</td>
                      <td>
                        <button
                          type="button"
                          style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: '#ff6b2c',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          onClick={() => download(
                            `financial-summary-requests/${r.id}/download/`,
                            `${r.reference}.${r.report_format === 'EXCEL' ? 'xlsx' : r.report_format.toLowerCase()}`
                          )}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )}

    {tab==='requests'&&<section className="hubtoll-card finance-panel"><div className="finance-panel-head"><h3>{privileged?'Financial Report Requests':'My Financial Report Requests'}</h3>{!privileged&&<button className="hubtoll-btn-primary" onClick={()=>setModal('reportRequest')}>+ New Request</button>}</div><div className="table-wrap"><table className="finance-table"><thead><tr><th>Reference</th>{privileged&&<th>Requester</th>}<th>Period</th><th>Format</th><th>Reason</th><th>Status</th><th>Decision</th><th>Report</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td>{r.reference}</td>{privileged&&<td>{r.requested_by_username}</td>}<td>{day(r.report_start)} – {day(r.report_end)}</td><td>{r.report_format}</td><td>{r.reason}</td><td><Badge value={r.status}/></td><td>{r.rejection_reason||r.response_notes||'—'}</td><td>{r.status==='COMPLETED'?<button onClick={()=>download(`financial-summary-requests/${r.id}/download/`,`${r.reference}.${r.report_format === 'EXCEL' ? 'xlsx' : r.report_format.toLowerCase()}`)}>Download</button>:privileged&&r.status==='PENDING'?<button onClick={()=>{setSelected(r);setIsRejecting(false);setReason('');setModal('reportDecision')}}>Review</button>:'—'}</td></tr>)}</tbody></table></div></section>}

    {tab==='notifications'&&!privileged&&<section className="hubtoll-card finance-panel"><div className="finance-panel-head"><h3>Notifications</h3>{unread>0&&<button onClick={()=>run(()=>api.post('finance-notifications/mark-all-read/',{}))}>Mark all read</button>}</div>{notifications.map(n=><div className={`notification-row ${n.is_read?'':'unread'}`} key={n.id}><div><strong>{n.title}</strong><p>{n.message}</p><small>{day(n.created_at)}</small></div>{!n.is_read&&<button onClick={()=>run(()=>api.post(`finance-notifications/${n.id}/mark-read/`,{}))}>Mark read</button>}</div>)}</section>}

    <Modal
        isOpen={modal === 'expense'}
        onClose={reset}
        title="Request Expense"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reset}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hubtoll-btn-primary"
              style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              disabled={saving || !description.trim() || !amount}
              onClick={createExpense}
            >
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        }
      >
        <div className="hubtoll-modal-form">
          <div className="form-group">
            <label className="form-label">Description & Purpose <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              className="form-input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the expense and justification..."
              required
            />
          </div>

          <div className="modal-form-grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount (ZMW) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Budget Category {privileged ? '' : '(Optional)'}</label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department} ({money(b.current_balance)} available)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'expenseDecision'}
        onClose={reset}
        title={isRejecting ? 'Reject Expense Request' : 'Review Expense Request'}
        footer={
          !isRejecting ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={reset}
                disabled={saving}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="hubtoll-btn-danger"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                  onClick={() => { setIsRejecting(true); setReason(''); }}
                  disabled={saving}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="hubtoll-btn-primary"
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                  onClick={() => decideExpense('approve')}
                  disabled={saving || !(selected?.budget || budgetId)}
                >
                  {saving && processingAction === 'approve' ? 'Approving...' : 'Approve Expense'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                onClick={() => { setIsRejecting(false); setReason(''); }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hubtoll-btn-danger"
                style={{ padding: '0.6rem 1.35rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                onClick={() => decideExpense('reject')}
                disabled={saving || !reason.trim()}
              >
                {saving && processingAction === 'reject' ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          )
        }
      >
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Expense Reference:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#ea580c', background: 'rgba(234, 88, 12, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            {selected?.reference || '-'}
          </span>
        </div>

        {!isRejecting ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Description
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {selected?.description || '-'}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Amount
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: '#ea580c' }}>
                    {money(selected?.amount)}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Requested By
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selected?.requested_by_username || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Status
                  </span>
                  <Badge value={selected?.status || 'PENDING'} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Assigned Budget Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={budgetId || selected?.budget || ''}
                onChange={(e) => setBudgetId(e.target.value)}
                disabled={!!selected?.budget}
              >
                <option value="">Select budget category...</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department} ({money(b.current_balance)} available)
                  </option>
                ))}
              </select>
              {selected?.budget && (
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                  Budget already assigned: {selected?.budget_department || 'Assigned'}
                </small>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: '110px', padding: '0.75rem', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem', lineHeight: 1.4 }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejecting this expense request..."
                autoFocus
                required
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                The requester will be notified of this reason.
              </small>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modal === 'budget'}
        onClose={reset}
        title="Create Budget Category"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reset}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hubtoll-btn-primary"
              style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              disabled={saving || !budgetName.trim() || !budgetAmount}
              onClick={createBudget}
            >
              {saving ? 'Creating...' : 'Create Budget'}
            </button>
          </div>
        }
      >
        <div className="hubtoll-modal-form">
          <div className="form-group">
            <label className="form-label">Budget / Category Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              className="form-input"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              placeholder="e.g. IT Department, Logistics, Marketing..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Allocation (ZMW) <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="modal-form-grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'topup'}
        onClose={reset}
        title={`Add Budget Funds — ${selected?.department || ''}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reset}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hubtoll-btn-primary"
              style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              disabled={saving || !budgetAmount || Number(budgetAmount) <= 0}
              onClick={topUp}
            >
              {saving ? 'Adding Funds...' : 'Add Funds'}
            </button>
          </div>
        }
      >
        <div className="hubtoll-modal-form">
          <div style={{
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Target Department</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selected?.department || '-'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Current Balance</span>
              <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{money(selected?.current_balance)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Amount (ZMW) <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="form-input"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Allocation Notes / Justification</label>
            <textarea
              className="form-input"
              rows={2}
              style={{ width: '100%', resize: 'vertical' }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplementary allocation, departmental top-up..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'reportRequest'}
        onClose={reset}
        title="Request Financial Report"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reset}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hubtoll-btn-primary"
              style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              disabled={saving || !reportStart || !reportEnd || !reportReason.trim()}
              onClick={requestReport}
            >
              {saving ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </div>
        }
      >
        <div className="hubtoll-modal-form">
          <div className="modal-form-grid-3">
            <div className="form-group">
              <label className="form-label">From Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-input"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Date <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="date"
                className="form-input"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Format <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
              >
                <option value="PDF">PDF Financial Statement</option>
                <option value="EXCEL">Excel (.xlsx)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Purpose <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: '95px', padding: '0.75rem', borderRadius: '8px', resize: 'vertical' }}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="State the reason or purpose for requesting this financial report..."
              required
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
              The purpose will be reviewed by the finance administration.
            </small>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'reportDecision'}
      onClose={reset}
      title={isRejecting ? 'Reject Financial Report Request' : 'Review Financial Report Request'}
      footer={
        !isRejecting ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={reset}
              disabled={saving}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="hubtoll-btn-danger"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                onClick={() => { setIsRejecting(true); setReason(''); }}
                disabled={saving}
              >
                Reject
              </button>
              <button
                type="button"
                className="hubtoll-btn-primary"
                style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
                onClick={() => decideReport('approve')}
                disabled={saving}
              >
                {saving && processingAction === 'approve' ? 'Generating Report...' : 'Approve & Generate Report'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              onClick={() => { setIsRejecting(false); setReason(''); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hubtoll-btn-danger"
              style={{ padding: '0.6rem 1.35rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem' }}
              onClick={() => decideReport('reject')}
              disabled={saving || !reason.trim()}
            >
              {saving && processingAction === 'reject' ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        )
      }
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Request Reference:</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#ea580c', background: 'rgba(234, 88, 12, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          {selected?.reference || '—'}
        </span>
      </div>

      {!isRejecting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Requested By
                </span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {selected?.requested_by_username || '—'}
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Status
                </span>
                <Badge value={selected?.status || 'PENDING'} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Reporting Period
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {day(selected?.report_start)} &rarr; {day(selected?.report_end)}
                </span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Report Format
                </span>
                <span className="badge badge-info" style={{ fontWeight: 700 }}>
                  {selected?.report_format || 'PDF'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Purpose
              </span>
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                background: 'var(--card-bg, #ffffff)',
                padding: '0.75rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #e2e8f0)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {selected?.reason || 'No purpose specified.'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            lineHeight: 1.4
          }}>
            Rejecting request for <strong>{selected?.requested_by_username}</strong> ({day(selected?.report_start)} &rarr; {day(selected?.report_end)})
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: '110px', padding: '0.75rem', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem', lineHeight: 1.4 }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejecting request..."
              autoFocus
              required
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              The requester will be notified of this reason.
            </small>
          </div>
        </div>
      )}
    </Modal>
  </div>;
}
