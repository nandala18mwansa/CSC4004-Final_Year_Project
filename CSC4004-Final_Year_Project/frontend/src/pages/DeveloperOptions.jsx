import { useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContextValue';

const pretty = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DeveloperOptions() {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState(null);
  const [tables, setTables] = useState([]);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [selectedTable, setSelectedTable] = useState('');
  const [records, setRecords] = useState(null);
  const [recordPage, setRecordPage] = useState(1);
  const [recordSearch, setRecordSearch] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [tableSearch, setTableSearch] = useState('');
  const [appFilter, setAppFilter] = useState('all');
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertValues, setInsertValues] = useState({});
  const [insertRelations, setInsertRelations] = useState({});
  const [backups, setBackups] = useState([]);
  const [history, setHistory] = useState({ results: [], total: 0, page: 1, pages: 1, actions: [], scopes: [] });
  const [historySearch, setHistorySearch] = useState('');
  const [historyAction, setHistoryAction] = useState('');
  const [historyScope, setHistoryScope] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const allowed = Boolean(user?.is_superuser || (user?.role === 'ADMIN' && user?.has_developer_options));
  const canDestroy = Boolean(user?.is_superuser || (user?.role === 'ADMIN' && user?.has_destructive_maintenance));

  const loadBackups = useCallback(async () => {
    const response = await api.get('developer-options/backups/');
    setBackups(response.data.backups || []);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search: historySearch,
        action: historyAction,
        scope: historyScope,
        page: String(historyPage),
      });
      const response = await api.get(`developer-options/maintenance-history/?${params.toString()}`);
      setHistory(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load maintenance history.');
    }
  }, [historyAction, historyPage, historyScope, historySearch]);

  const load = useCallback(async () => {
    try {
      const [health] = await Promise.all([
        api.get('developer-options/status/'),
        loadBackups(),
      ]);
      setStatus(health.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load developer options.');
    }
  }, [loadBackups]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);
  useEffect(() => {
    if (!allowed || activeSection !== 'overview') return undefined;
    const timer = window.setTimeout(loadHistory, historySearch ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [allowed, activeSection, historySearch, loadHistory]);

  const loadMetadata = async ({ showCatalog = true } = {}) => {
    setError('');
    try {
      const response = await api.get('developer-options/database-metadata/');
      setTables(response.data.tables || []);
      if (showCatalog) setCatalogOpen(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to inspect database tables.');
    }
  };

  const openInsertForm = () => {
    if (!records) return;
    setInsertValues(Object.fromEntries((records.insert_fields || []).map((field) => [field.name, field.has_default ? (field.default ?? '') : (field.type === 'checkbox' ? false : field.type === 'json' ? '{}' : '')])));
    setInsertRelations(Object.fromEntries((records.many_fields || []).map((field) => [field.name, []])));
    setInsertOpen(true);
    setError('');
  };

  const loadRecords = useCallback(async (table, page = 1, search = '') => {
    if (!table) return;
    try {
      const params = new URLSearchParams({ table, page: String(page), search });
      const response = await api.get(`developer-options/database-records/?${params.toString()}`);
      setRecords(response.data);
    } catch (err) {
      setRecords(null);
      setError(err.response?.data?.detail || 'Unable to load records for this table.');
    }
  }, []);

  useEffect(() => {
    if (!selectedTable) return undefined;
    const timer = window.setTimeout(() => loadRecords(selectedTable, recordPage, recordSearch), 250);
    return () => window.clearTimeout(timer);
  }, [selectedTable, recordPage, recordSearch, loadRecords]);

  const setMaintenance = async (active) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await api.post('developer-options/maintenance-mode/', { active });
      await load();
      setNotice(`Maintenance mode ${active ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update maintenance mode.');
    } finally { setSaving(false); }
  };

  const createBackup = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await api.post('developer-options/backups/create/', {});
      setNotice(`Database backup created. Backup ID: ${response.data.backup_id}.`);
      await loadBackups();
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create a database backup.');
    } finally { setSaving(false); }
  };

  const restoreBackup = async (backup) => {
    if (!window.confirm(`Restore backup ${backup.backup_id}? This replaces current business records.`)) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await api.post('developer-options/backups/restore/', { backup_id: backup.backup_id });
      setNotice(response.data.detail);
      setPreview(null);
      await load();
      if (selectedTable) await loadRecords(selectedTable, recordPage, recordSearch);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to restore the selected backup.');
    } finally { setSaving(false); }
  };

  const showPreview = async (kind, table = '', recordId = '') => {
    setError(''); setNotice(''); setPreview(null);
    try {
      const response = kind === 'all'
        ? await api.get('developer-options/database-all-preview/')
        : await api.get(`developer-options/database-table-preview/?table=${encodeURIComponent(table)}${recordId ? `&record_id=${encodeURIComponent(recordId)}` : ''}`);
      setPreview({ kind, table, recordId, ...response.data });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to preview the selected deletion.');
    }
  };

  const performDelete = async () => {
    if (!preview) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = preview.kind === 'all'
        ? await api.post('developer-options/database-clear-all/', {})
        : preview.kind === 'table'
          ? await api.post('developer-options/database-clear-table/', { table: preview.table })
          : await api.post('developer-options/database-delete-record/', { table: preview.table, record_id: preview.recordId });
      setNotice(`Deleted ${Number(response.data.deleted_total || 0).toLocaleString()} records, including directly dependent records.`);
      setPreview(null);
      await Promise.all([load(), loadMetadata({ showCatalog: false })]);
      if (selectedTable) await loadRecords(selectedTable, recordPage, recordSearch);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete the selected records.');
    } finally { setSaving(false); }
  };

  const insertRecord = async (event) => {
    event.preventDefault();
    if (!selectedTable) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await api.post('developer-options/database-insert-record/', {
        table: selectedTable,
        values: insertValues,
        relations: insertRelations,
      });
      setNotice(`${response.data.detail} Record ID: ${response.data.id}.`);
      setInsertOpen(false);
      await Promise.all([loadMetadata({ showCatalog: false }), loadRecords(selectedTable, 1, recordSearch)]);
      setRecordPage(1);
    } catch (err) {
      const fieldErrors = err.response?.data?.fields;
      if (fieldErrors) setError(Object.entries(fieldErrors).map(([name, message]) => `${pretty(name)}: ${Array.isArray(message) ? message.join(', ') : message}`).join(' · '));
      else setError(err.response?.data?.detail || 'Unable to insert this database entry.');
    } finally { setSaving(false); }
  };

  const selectedTableInfo = tables.find((table) => table.name === selectedTable);
  const pageCount = records ? Math.max(1, Math.ceil(records.total / records.page_size)) : 1;
  const canDeleteSelectedRecords = Boolean(canDestroy && selectedTableInfo?.record_deletable);
  const modules = [...new Set(tables.filter((table) => table.model).map((table) => table.model.split('.')[0]))].sort();
  const visibleTables = tables.filter((table) => {
    const search = tableSearch.trim().toLowerCase();
    const matchesModule = appFilter === 'all' || table.model?.split('.')[0] === appFilter;
    const matchesSearch = !search || `${table.name} ${table.model || ''} ${table.columns.join(' ')}`.toLowerCase().includes(search);
    return matchesModule && matchesSearch;
  });
  const sections = [
    ['overview', 'Overview'], ['database', 'Database'], ['maintenance', 'Maintenance'], ['backups', 'Backups'],
  ];
  const renderInsertField = (field, many = false) => {
    const value = many ? (insertRelations[field.name] || []) : insertValues[field.name];
    const setValue = (next) => many
      ? setInsertRelations((current) => ({ ...current, [field.name]: next }))
      : setInsertValues((current) => ({ ...current, [field.name]: next }));
    const options = field.type === 'choice' ? field.choices : field.options;
    let control;
    if (many) {
      control = <select className="form-input" multiple value={value} onChange={(event) => setValue([...event.target.selectedOptions].map((option) => option.value))}><option disabled value="">Choose related records</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    } else if (field.type === 'relation' || field.type === 'choice') {
      control = <select className="form-input" required={field.required} value={value ?? ''} onChange={(event) => setValue(event.target.value)}><option value="">{field.required ? 'Select an entry' : 'None'}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    } else if (field.type === 'checkbox') {
      control = <input type="checkbox" checked={Boolean(value)} onChange={(event) => setValue(event.target.checked)} />;
    } else if (field.type === 'textarea' || field.type === 'json') {
      control = <textarea className="form-input" rows={field.type === 'json' ? 4 : 3} required={field.required} maxLength={field.max_length || undefined} value={value ?? ''} placeholder={field.type === 'json' ? 'Enter valid JSON' : ''} onChange={(event) => setValue(event.target.value)} />;
    } else {
      control = <input className="form-input" type={field.type} required={field.required} maxLength={field.max_length || undefined} value={value ?? ''} step={field.type === 'number' ? (field.decimal_places ? `0.${'0'.repeat(Math.max(0, field.decimal_places - 1))}1` : '1') : undefined} onChange={(event) => setValue(event.target.value)} />;
    }
    return <label className={`dev-db-field ${field.type === 'checkbox' ? 'is-checkbox' : ''}`} key={`${many ? 'many' : 'field'}-${field.name}`}><span>{field.label}{field.required && !many ? ' *' : ''}</span>{control}{field.help_text && <small>{field.help_text}</small>}{many && <small>Hold Ctrl or Command to select multiple entries.</small>}</label>;
  };

  useEffect(() => {
    if (recordPage > pageCount) setRecordPage(pageCount);
  }, [recordPage, pageCount]);

  if (!allowed) return <div className="page-container"><div className="hubtoll-card dev-options-card"><h1>Access denied</h1><p>Developer Options privilege is required.</p></div></div>;

  return <div className="page-container dev-options-page">
    <div className="hubtoll-page-header dev-options-header">
      <div><div className="hubtoll-module-eyebrow"><span className="hubtoll-module-badge-text">RESTRICTED SYSTEM OPERATIONS</span></div><h1 className="page-title">Developer Options</h1><p className="page-subtitle">Inspect the database, manage development records, and control maintenance.</p></div>
      <button className="btn btn-secondary" onClick={load}>Refresh</button>
    </div>
    {error && <div className="hubtoll-alert-banner hubtoll-alert-error" role="alert">{error}</div>}
    {notice && <div className="hubtoll-alert-banner" role="status">{notice}</div>}
    <nav className="dev-options-tabs" aria-label="Developer Options sections">{sections.map(([key, label]) => <button type="button" key={key} className={activeSection === key ? 'is-active' : ''} aria-current={activeSection === key ? 'page' : undefined} onClick={() => { setActiveSection(key); if (key === 'database' && !tables.length) loadMetadata(); }}>{label}</button>)}</nav>
    {status && <>
      {activeSection === 'overview' && <>
      <div className="dev-options-stats">{[
        ['Connection', status.database_status], ['Engine', status.database_engine], ['Health', status.application_status],
        ['Tables', status.table_count], ['Applied migrations', status.applied_migration_count], ['Pending migrations', status.pending_migration_count],
      ].map(([label, value]) => <div className="hubtoll-card dev-options-stat" key={label}><span>{label}</span><strong>{String(value)}</strong></div>)}</div>
      {status.pending_migration_count > 0 && <section className="hubtoll-card dev-options-card"><h2>Pending migrations</h2><ul>{status.pending_migrations.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      <section className="hubtoll-card dev-options-card dev-options-history">
        <div className="dev-options-section-heading"><div><h2>Maintenance history</h2><p>Search and filter database and system changes.</p></div><span className="dev-options-history-count">{history.total.toLocaleString()} entries</span></div>
        <div className="dev-options-history-filters">
          <label>Search history<input className="form-input" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(1); }} placeholder="Action, area, or person" /></label>
          <label>Action<select className="form-input" value={historyAction} onChange={(event) => { setHistoryAction(event.target.value); setHistoryPage(1); }}><option value="">All actions</option>{history.actions.map((action) => <option key={action} value={action}>{pretty(action)}</option>)}</select></label>
          <label>Area<select className="form-input" value={historyScope} onChange={(event) => { setHistoryScope(event.target.value); setHistoryPage(1); }}><option value="">All areas</option>{history.scopes.map((scope) => <option key={scope || 'system'} value={scope || '__system__'}>{pretty(scope || 'System')}</option>)}</select></label>
          {(historySearch || historyAction || historyScope) && <button type="button" className="btn btn-secondary dev-options-history-clear" onClick={() => { setHistorySearch(''); setHistoryAction(''); setHistoryScope(''); setHistoryPage(1); }}>Clear filters</button>}
        </div>
        {history.results.length ? <ol className="dev-options-audit-list">{history.results.map((entry, index) => {
          const createdAt = new Date(entry.created_at);
          return <li className="dev-options-audit-entry" key={`${entry.action}-${entry.created_at}-${index}`}>
            <div className="dev-options-audit-heading"><strong>{pretty(entry.action)}</strong><time dateTime={createdAt.toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(createdAt)}</time></div>
            <div className="dev-options-audit-meta"><span><small>Area</small>{pretty(entry.scope || 'System')}</span><span><small>Changed by</small>{entry.actor__username || 'System'}</span></div>
          </li>;
        })}</ol> : <p className="dev-options-history-empty">{historySearch || historyAction || historyScope ? 'No history entries match these filters.' : 'No maintenance activity has been recorded yet.'}</p>}
        {history.pages > 1 && <div className="dev-options-pagination"><button type="button" className="btn btn-secondary" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {history.page} of {history.pages}</span><button type="button" className="btn btn-secondary" disabled={historyPage >= history.pages} onClick={() => setHistoryPage((page) => Math.min(history.pages, page + 1))}>Next</button></div>}
      </section>
      </>}

      {activeSection === 'maintenance' && <section className="hubtoll-card dev-options-card">
        <div className="dev-options-section-heading"><div><h2>Maintenance mode</h2><p>{status.maintenance_mode ? 'Ordinary system access is paused.' : 'Normal system access is enabled.'}</p></div><span className={`dev-options-state ${status.maintenance_mode ? 'is-active' : ''}`}>{status.maintenance_mode ? 'Enabled' : 'Disabled'}</span></div>
        <button className={status.maintenance_mode ? 'btn btn-secondary' : 'hubtoll-btn-primary'} disabled={saving} onClick={() => setMaintenance(!status.maintenance_mode)}>{status.maintenance_mode ? 'Disable maintenance mode' : 'Enable maintenance mode'}</button>
      </section>}

      {activeSection === 'backups' && <section className="hubtoll-card dev-options-card">
        <div className="dev-options-section-heading"><div><h2>Database backups</h2><p>Backups contain DMS business records. Uploaded documents and media files are not included.</p></div><button className="btn btn-secondary" disabled={saving} onClick={createBackup}>Create backup</button></div>
        <div className="dev-options-table-wrap"><table className="finance-table"><thead><tr><th>Created</th><th>Records</th><th>Size</th><th>Backup ID</th><th>Action</th></tr></thead><tbody>
          {backups.length ? backups.map((backup) => <tr key={backup.backup_id}>
            <td>{new Date(backup.created_at).toLocaleString()}</td><td>{Number(backup.record_count || 0).toLocaleString()}</td><td>{Number(backup.size_bytes || 0).toLocaleString()} bytes</td><td><code>{backup.backup_id}</code></td>
            <td>{canDestroy ? <button className="btn btn-secondary" disabled={saving} onClick={() => restoreBackup(backup)}>Restore</button> : 'Restricted'}</td>
          </tr>) : <tr><td colSpan="5">No database backups found.</td></tr>}
        </tbody></table></div>
      </section>}

      {activeSection === 'database' && <>
      <section className="hubtoll-card dev-options-card">
        <div className="dev-options-section-heading"><div><h2>Database tables</h2><p>Filter tables, inspect their columns, and open records. Table structures are protected; database actions only affect rows.</p></div><button className="btn btn-secondary" onClick={loadMetadata}>Refresh tables</button></div>
        {tables.length > 0 && <>
          <details className="dev-db-catalog" open={catalogOpen} onToggle={(event) => setCatalogOpen(event.currentTarget.open)}>
          <summary>Find and choose a table <span>{visibleTables.length} of {tables.length}</span></summary>
          <div className="dev-db-filters"><label>Find table or column<input className="form-input" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Search table name, module, or column" /></label><label>Module<select className="form-input" value={appFilter} onChange={(event) => setAppFilter(event.target.value)}><option value="all">All modules</option>{modules.map((module) => <option key={module} value={module}>{pretty(module)}</option>)}</select></label></div>
          <div className="dev-options-table-wrap"><table className="finance-table dev-db-table-catalog"><thead><tr><th>Table</th><th>Module</th><th>Records</th><th>Columns</th><th>Action</th></tr></thead><tbody>
            {visibleTables.map((table) => <tr key={table.name}>
              <td><code>{table.name}</code></td><td>{table.model?.split('.')[0] || 'System'}</td><td>{table.record_count == null ? '—' : Number(table.record_count).toLocaleString()}</td><td>{table.columns.join(', ')}</td>
              <td>{table.viewable ? <button type="button" className="dev-options-link" onClick={() => { setSelectedTable(table.name); setRecords(null); setRecordPage(1); setRecordSearch(''); setPreview(null); setCatalogOpen(false); setInsertOpen(false); }}>View records</button> : <span className="dev-options-readonly">Not available</span>}</td>
            </tr>)}
            {!visibleTables.length && <tr><td colSpan="5">No tables match those filters.</td></tr>}
          </tbody></table></div>
          </details>
        </>}
        {canDestroy && <div className="dev-options-danger-zone"><div><strong>Clear all application records</strong><p>Removes rows from application tables, including module data, categories, groups, other user accounts, and audit records. Your signed-in admin account, maintenance switch, database schema, and migration history are kept. The deletion itself is recorded in maintenance history.</p></div><button className="btn btn-danger" disabled={saving} onClick={() => showPreview('all')}>Preview clear all</button></div>}
      </section>

      {selectedTable && <section className="hubtoll-card dev-options-card" aria-label="Selected database table">
        <div className="dev-options-section-heading"><div><span className="dev-options-kicker">VIEW RECORDS</span><h2><code>{selectedTable}</code></h2><p>{records?.model || selectedTableInfo?.model} · {records?.total?.toLocaleString() || '0'} records</p></div><div className="dev-record-header-actions"><button className="btn btn-secondary" onClick={() => setCatalogOpen(true)}>Change table</button>
          {canDestroy && selectedTableInfo?.clearable && <button className="btn btn-danger" disabled={saving} onClick={() => showPreview('table', selectedTable)}>Preview clear table{records?.model === 'users.User' ? ' (keep my account)' : ''}</button>}
        </div></div>
        <div className="dev-record-toolbar"><label className="dev-options-search">Search by record text or ID<input className="form-input" value={recordSearch} onChange={(event) => { setRecordSearch(event.target.value); setRecordPage(1); }} placeholder="Enter a name, reference, or record ID" /></label>{allowed && selectedTableInfo?.insertable && <button className="hubtoll-btn-primary" onClick={openInsertForm}>Add database entry</button>}</div>
        {records?.model === 'users.User' && <p className="dev-options-inline-note">Create or change accounts through Control so passwords and access settings are handled securely.</p>}
        {insertOpen && <form className="dev-db-insert-form" onSubmit={insertRecord}>
          <div className="dev-options-section-heading"><div><h3>Add entry to <code>{selectedTable}</code></h3><p>This saves the new entry to the live application database.</p></div><button type="button" className="btn btn-secondary" onClick={() => setInsertOpen(false)}>Close</button></div>
          <div className="dev-db-insert-fields">{(records?.insert_fields || []).map((field) => renderInsertField(field))}{(records?.many_fields || []).map((field) => renderInsertField(field, true))}</div>
          <div className="dev-db-insert-actions"><button type="submit" className="hubtoll-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Insert entry'}</button></div>
        </form>}
        {records && <div className="dev-options-table-wrap"><table className="finance-table dev-options-record-table"><thead><tr>{records.fields.map((field) => <th key={field.name}>{field.label}<small>{field.name}</small></th>)}{canDeleteSelectedRecords && <th>Action</th>}</tr></thead><tbody>
          {records.records.map((record) => <tr key={record.id}>{records.fields.map((field) => <td key={field.name}>{String(record.values[field.name] ?? '—')}</td>)}{canDeleteSelectedRecords && <td><button className="dev-options-link dev-options-delete-link" disabled={records.model === 'users.User' && String(user?.id) === record.id} onClick={() => showPreview('record', selectedTable, record.id)}>{records.model === 'users.User' && String(user?.id) === record.id ? 'Current account' : 'Delete record'}</button></td>}</tr>)}
          {!records.records.length && <tr><td colSpan={records.fields.length + (canDeleteSelectedRecords ? 1 : 0)}>No records found.</td></tr>}
        </tbody></table></div>}
        {records && pageCount > 1 && <div className="dev-options-pagination"><button className="btn btn-secondary" disabled={recordPage <= 1} onClick={() => setRecordPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {recordPage} of {pageCount}</span><button className="btn btn-secondary" disabled={recordPage >= pageCount} onClick={() => setRecordPage((page) => Math.min(pageCount, page + 1))}>Next</button></div>}
      </section>}

      {preview && <section className="dev-options-delete-preview" role="alertdialog" aria-label="Deletion preview">
        <div><span className="dev-options-kicker">DELETION PREVIEW</span><h2>{preview.total_records.toLocaleString()} record{preview.total_records === 1 ? '' : 's'} will be deleted</h2><p>{preview.kind === 'record' ? `Selected record ${preview.recordId} from ${preview.table}, plus dependent records.` : preview.kind === 'table' ? `All records in ${preview.table}, plus dependent records.` : 'All application records, plus directly dependent records. Database tables and the current admin account are kept.'}</p>
          <ul>{Object.entries(preview.counts).map(([model, count]) => <li key={model}><span>{model}</span><strong>{Number(count).toLocaleString()}</strong></li>)}</ul>
        </div><div className="dev-options-preview-actions"><button className="btn btn-secondary" disabled={saving} onClick={() => setPreview(null)}>Cancel</button><button className="btn btn-danger" disabled={saving} onClick={performDelete}>{saving ? 'Deleting…' : 'Confirm deletion'}</button></div>
      </section>}
      </>}
    </>}
  </div>;
}
