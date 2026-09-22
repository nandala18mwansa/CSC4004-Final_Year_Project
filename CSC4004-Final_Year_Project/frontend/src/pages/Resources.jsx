import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

const STATUS_BADGE = {
  AVAILABLE:   { cls: 'badge badge-approved',     label: 'Available' },
  BOOKED:      { cls: 'badge badge-info',         label: 'Booked / Reserved' },
  IN_USE:      { cls: 'badge badge-in-use',        label: 'In Use' },
  UNAVAILABLE: { cls: 'badge badge-rejected',      label: 'Unavailable' },
  MAINTENANCE: { cls: 'badge badge-maintenance',   label: 'Maintenance' },
  UNDER_REPAIR:{ cls: 'badge badge-maintenance',   label: 'Under Repair' },
  RETIRED:     { cls: 'badge badge-staff',         label: 'Retired' },
};

const CONDITION_BADGE = {
  NEW:         { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', label: 'New' },
  GOOD:        { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Good' },
  FAIR:        { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: 'Fair' },
  POOR:        { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', label: 'Poor' },
  DAMAGED:     { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Damaged' },
  UNDER_REPAIR:{ bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Under Repair' },
};

const CONDITION_OPTIONS = ['NEW','GOOD','FAIR','POOR','DAMAGED','UNDER_REPAIR'];
const STATUS_OPTIONS = ['AVAILABLE','BOOKED','IN_USE','UNAVAILABLE','MAINTENANCE','UNDER_REPAIR','RETIRED'];
const PAGE_SIZE = 20;

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const ConditionBadge = ({ condition }) => {
  const cfg = CONDITION_BADGE[condition] || CONDITION_BADGE.GOOD;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      padding: '2px 9px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  );
};

const Resources = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role;

  const [resources, setResources] = useState([]);
  const [resourceCategories, setResourceCategories] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resourcesError, setResourcesError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');
  const [allocationsError, setAllocationsError] = useState('');
  const [activitiesError, setActivitiesError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [resourcePage, setResourcePage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Selection (for bulk ops)
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [modalType, setModalType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Single resource form
  const [activeResourceId, setActiveResourceId] = useState(null);
  const [resourceCode, setResourceCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [assignedRoom, setAssignedRoom] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [condition, setCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [isPortable, setIsPortable] = useState(false);

  // Category form
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryManager, setCategoryManager] = useState('');

  // Bulk add form
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkStart, setBulkStart] = useState(1);
  const [bulkQty, setBulkQty] = useState(10);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkCondition, setBulkCondition] = useState('GOOD');
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkPortable, setBulkPortable] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Import form
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Bulk assign location
  const [assignLocation, setAssignLocation] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Booking form
  const [bookResourceId, setBookResourceId] = useState('');
  const [bookActivityId, setBookActivityId] = useState('');
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime] = useState('');
  const [bookPurpose, setBookPurpose] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookingDecisionReason, setBookingDecisionReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Detail drawer
  const [drawerResource, setDrawerResource] = useState(null);
  const [drawerTab, setDrawerTab] = useState('location'); // 'location' | 'inspection'
  const [drawerHistory, setDrawerHistory] = useState([]);
  const [drawerInspections, setDrawerInspections] = useState([]);
  const [drawerStatusHistory, setDrawerStatusHistory] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Inspection form
  const [inspectCondition, setInspectCondition] = useState('GOOD');
  const [inspectRemarks, setInspectRemarks] = useState('');

  // Export
  const [exportFormat, setExportFormat] = useState('PDF');
  const [exportCategory, setExportCategory] = useState('');

  const canManage = Boolean(user?.is_superuser || user?.has_resource_privilege);
  const availableResources = resources.filter((r) => r.status === 'AVAILABLE' && !['UNDER_REPAIR', 'DAMAGED'].includes(r.condition));

  const loadAll = useCallback(async () => {
    const [rRes, catRes, allocRes, actRes, usersRes] = await Promise.allSettled([
      api.get('resources/'),
      api.get('resource-categories/'),
      api.get('allocations/'),
      api.get('activities/'),
      canManage ? api.get('users-admin/') : Promise.resolve({ data: [] }),
    ]);

    if (rRes.status === 'fulfilled') {
      setResources(toArray(rRes.value.data));
      setResourcesError('');
    } else {
      setResourcesError('Unable to load resources.');
    }
    if (catRes.status === 'fulfilled') {
      setResourceCategories(toArray(catRes.value.data));
      setCategoriesError('');
    } else {
      setCategoriesError('Unable to load resource categories.');
    }
    if (allocRes.status === 'fulfilled') {
      setAllocations(toArray(allocRes.value.data));
      setAllocationsError('');
    } else {
      setAllocationsError('Unable to load allocations and booking requests.');
    }
    if (actRes.status === 'fulfilled') {
      setActivities(toArray(actRes.value.data));
      setActivitiesError('');
    } else {
      setActivitiesError('Unable to load activities for booking links.');
    }
    if (usersRes.status === 'fulfilled') {
      setUsers(toArray(usersRes.value.data));
      setUsersError('');
    } else if (canManage) {
      setUsersError('Unable to load users for category manager selection.');
    }
    setError('');
    setLoading(false);
  }, [canManage]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 8000);
    return () => clearInterval(id);
  }, [loadAll]);

  // ── Filtering ──────────────────────────────────────────
  const filtered = resources.filter((r) => {
    if (selectedCategory !== 'ALL' && String(r.category) !== String(selectedCategory)) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (conditionFilter !== 'ALL' && r.condition !== conditionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !(r.resource_id || '').toLowerCase().includes(q) && !(r.location || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const resourcePageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedResources = filtered.slice((resourcePage - 1) * PAGE_SIZE, resourcePage * PAGE_SIZE);

  useEffect(() => {
    setResourcePage(1);
  }, [selectedCategory, statusFilter, conditionFilter, searchQuery]);

  // ── Selection ──────────────────────────────────────────
  const toggleSelect = (id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelectedIds(new Set(filtered.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ── Open modals ────────────────────────────────────────
  const openAdd = () => {
    setActiveResourceId(null); setResourceCode(''); setName('');
    setCategory(resourceCategories[0]?.id || ''); setAssignedRoom('');
    setDescription(''); setStatus('AVAILABLE'); setCondition('GOOD');
    setLocation(''); setIsPortable(false); setModalError('');
    setModalType('add_resource');
  };

  const openEdit = (r) => {
    setActiveResourceId(r.id); setResourceCode(r.resource_id || ''); setName(r.name);
    setCategory(r.category || ''); setAssignedRoom(r.assigned_room || '');
    setDescription(r.description || ''); setStatus(r.status); setCondition(r.condition || 'GOOD');
    setLocation(r.location || ''); setIsPortable(Boolean(r.is_portable));
    setModalError(''); setModalType('edit_resource');
  };

  const openBulkAdd = () => {
    setBulkPrefix(''); setBulkStart(1); setBulkQty(10);
    setBulkCategory(resourceCategories[0]?.id || ''); setBulkCondition('GOOD');
    setBulkLocation(''); setBulkPortable(false); setBulkResult(null); setModalError('');
    setModalType('bulk_add');
  };

  const openImport = () => { setImportFile(null); setImportResult(null); setModalError(''); setModalType('import'); };
  const openAddCategory = () => { setCategoryName(''); setCategoryDescription(''); setCategoryManager(''); setModalError(''); setModalType('add_category'); };

  const openBulkAssign = () => {
    if (selectedIds.size === 0) { alert('Select at least one resource first.'); return; }
    setAssignLocation(''); setAssignNotes(''); setModalError('');
    setModalType('bulk_assign');
  };

  const openDrawer = async (r) => {
    setDrawerResource(r); setDrawerTab('location');
    setDrawerHistory([]); setDrawerInspections([]); setDrawerStatusHistory([]);
    setInspectCondition(r.condition || 'GOOD'); setInspectRemarks('');
    setStatusNotes('');
    setDrawerLoading(true); setModalType('drawer');
    try {
      const [histRes, inspRes, statusRes] = await Promise.all([
        api.get(`resources/${r.id}/location-history/`),
        api.get(`resources/${r.id}/inspection-history/`),
        api.get(`resources/${r.id}/status-history/`),
      ]);
      setDrawerHistory(histRes.data);
      setDrawerInspections(inspRes.data);
      setDrawerStatusHistory(statusRes.data);
    } catch { /* silent */ } finally { setDrawerLoading(false); }
  };

  const openBook = (r = null) => {
    setBookResourceId(r?.id || availableResources[0]?.id || ''); setBookActivityId(''); setBookStartTime(''); setBookEndTime('');
    setBookPurpose(''); setBookNotes('');
    setModalError(''); setModalType('book_resource');
  };

  // ── CRUD handlers ──────────────────────────────────────
  const handleSaveResource = async () => {
    if (!resourceCode.trim() || !name.trim()) { setModalError('Resource ID and name are required.'); return; }
    setSaving(true); setModalError('');
    const payload = { resource_id: resourceCode, name, category: category || null, assigned_room: assignedRoom || null, description, status, condition, location, is_portable: isPortable };
    try {
      if (activeResourceId) await api.put(`resources/${activeResourceId}/`, payload);
      else await api.post('resources/', payload);
      await loadAll(); setModalType(null);
    } catch (err) {
      setModalError(err.response?.data?.resource_id?.[0] || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save resource.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource permanently?')) return;
    try { await api.delete(`resources/${id}/`); await loadAll(); } catch { setError('Failed to delete resource.'); }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) { setModalError('Category name is required.'); return; }
    setSaving(true); setModalError('');
    try {
      await api.post('resource-categories/', { name: categoryName, description: categoryDescription, manager: categoryManager || null });
      await loadAll(); setModalType(null);
    } catch (err) {
      setModalError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create category.');
    } finally { setSaving(false); }
  };

  const handleBulkCreate = async () => {
    if (!bulkPrefix.trim()) { setModalError('Prefix is required.'); return; }
    if (bulkQty < 1 || bulkQty > 500) { setModalError('Quantity must be 1–500.'); return; }
    setSaving(true); setModalError('');
    try {
      const res = await api.post('resources/bulk-create/', {
        prefix: bulkPrefix, start_number: Number(bulkStart), quantity: Number(bulkQty),
        category_id: bulkCategory || null, condition: bulkCondition,
        location: bulkLocation, is_portable: bulkPortable,
      });
      setBulkResult(res.data);
      await loadAll();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Bulk creation failed.');
    } finally { setSaving(false); }
  };

  const handleImport = async () => {
    if (!importFile) { setModalError('Please select a file.'); return; }
    setSaving(true); setModalError('');
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const res = await api.post('resources/import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      await loadAll();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Import failed.');
    } finally { setSaving(false); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.download('resources/import-template/');
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a'); a.href = url; a.download = res.filename || 'DMS_Resource_Import_Template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to download template.'); }
  };

  const handleBulkAssign = async () => {
    if (!assignLocation.trim()) { setModalError('Location is required.'); return; }
    setSaving(true); setModalError('');
    try {
      const res = await api.post('resources/bulk-assign-location/', {
        resource_ids: Array.from(selectedIds), location: assignLocation, notes: assignNotes,
      });
      clearSelection(); await loadAll(); setModalType(null);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Bulk assign failed.');
    } finally { setSaving(false); }
  };

  const handleBookResource = async () => {
    if (!bookStartTime || !bookEndTime) { setModalError('Start and end time are required.'); return; }
    setSaving(true); setModalError('');
    try {
      await api.post('allocations/', {
        resource: bookResourceId,
        activity: bookActivityId || null,
        start_time: bookStartTime,
        end_time: bookEndTime,
        purpose: bookPurpose,
        notes: bookNotes,
      });
      await loadAll(); setModalType(null);
    } catch (err) {
      setModalError(err.response?.data?.resource?.[0] || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Booking failed.');
    } finally { setSaving(false); }
  };

  const handleRecordInspection = async () => {
    if (!drawerResource) return;
    setSaving(true); setModalError('');
    try {
      await api.post(`resources/${drawerResource.id}/record-inspection/`, {
        current_condition: inspectCondition, remarks: inspectRemarks,
      });
      // Refresh history
      const [histRes, inspRes] = await Promise.all([
        api.get(`resources/${drawerResource.id}/location-history/`),
        api.get(`resources/${drawerResource.id}/inspection-history/`),
      ]);
      setDrawerHistory(histRes.data);
      setDrawerInspections(inspRes.data);
      setInspectRemarks('');
      await loadAll();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Inspection failed.');
    } finally { setSaving(false); }
  };

  const handleChangeStatus = async () => {
    if (!drawerResource) return;
    setSaving(true); setModalError('');
    try {
      await api.post(`resources/${drawerResource.id}/change-status/`, {
        status: drawerResource.status,
        notes: statusNotes,
      });
      const statusRes = await api.get(`resources/${drawerResource.id}/status-history/`);
      setDrawerStatusHistory(statusRes.data);
      setStatusNotes('');
      await loadAll();
    } catch (err) {
      setModalError(err.response?.data?.error || err.response?.data?.detail || 'Status change failed.');
    } finally { setSaving(false); }
  };

  const decideBooking = async (allocation, decision, reasonOverride = '') => {
    const rejectReason = reasonOverride || bookingDecisionReason;
    if (decision === 'reject' && !rejectReason.trim()) {
      setModalError('A rejection reason is required.');
      return;
    }
    setSaving(true); setModalError('');
    try {
      await api.post(`allocations/${allocation.id}/${decision}/`, decision === 'reject' ? { reason: rejectReason.trim() } : {});
      setBookingDecisionReason('');
      await loadAll();
    } catch (err) {
      setModalError(err.response?.data?.detail || err.response?.data?.resource || err.response?.data?.reason || 'Unable to update booking.');
    } finally { setSaving(false); }
  };

  const handleExport = async () => {
    setSaving(true);
    setModalError('');
    try {
      const params = new URLSearchParams({ export_format: exportFormat });
      if (exportCategory) params.set('category', exportCategory);
      const res = await api.download(`resources/export-report/?${params.toString()}`);
      const today = new Date().toISOString().split('T')[0];
      const ext = { PDF: 'pdf', EXCEL: 'xlsx', CSV: 'csv' }[exportFormat] || 'pdf';
      const filename = `DMS_Resource_Register_${today}.${ext}`;
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a'); a.href = url; a.download = res.filename || filename; a.click();
      URL.revokeObjectURL(url);
      setModalType(null);
    } catch (err) {
      const statusCode = err.response?.status;
      const data = err.response?.data;
      console.error('Resource register export failed', { status: statusCode, data });
      if (statusCode === 403) {
        setModalError('You do not have permission to generate this report.');
      } else if (statusCode === 404) {
        setModalError('The Resource Register export endpoint could not be found. Please refresh and try again.');
      } else if (statusCode === 400) {
        setModalError(data?.error || data?.detail || 'No resources were found for the selected category.');
      } else {
        setModalError('The Resource Register could not be generated. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Derived allocation lookup ────────────────────────
  const allocationMap = {};
  allocations.forEach((al) => { allocationMap[al.resource] = al; });

  const categoryMap = {};
  resourceCategories.forEach((c) => { categoryMap[c.id] = c.name; });
  const visibleBookings = canManage ? allocations : allocations.filter((a) => a.allocated_to === user?.id);
  const pendingBookings = visibleBookings.filter((a) => a.status === 'PENDING');
  const bookingFiltered = visibleBookings.filter((booking) => {
    if (bookingStatusFilter !== 'ALL' && booking.status !== bookingStatusFilter) return false;
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      const text = `${booking.resource_name || ''} ${booking.allocated_to_username || ''} ${booking.purpose || ''} ${booking.activity_title || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
  const bookingPageCount = Math.max(1, Math.ceil(bookingFiltered.length / PAGE_SIZE));
  const pagedBookings = bookingFiltered.slice((bookingPage - 1) * PAGE_SIZE, bookingPage * PAGE_SIZE);
  const activeAllocations = visibleBookings.filter((a) => a.status === 'APPROVED');
  const underRepairCount = resources.filter((r) => ['UNDER_REPAIR', 'MAINTENANCE'].includes(r.status) || ['UNDER_REPAIR', 'DAMAGED'].includes(r.condition)).length;

  useEffect(() => {
    setBookingPage(1);
  }, [bookingSearch, bookingStatusFilter]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, margin: 0 }}>Resources & Assets</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '2px' }}>
            Equipment inventory, room allocations, and asset management
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="hubtoll-btn-primary" onClick={() => openBook()}>+ Book Resource</button>
          {canManage && (
            <>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Resource</button>
            <button className="btn btn-secondary" onClick={openBulkAdd}>⊞ Bulk Add</button>
            <button className="btn btn-secondary" onClick={openImport}>↑ Import</button>
            <button className="btn btn-secondary" onClick={() => setModalType('export')}>↓ Export Register</button>
            <button className="btn btn-secondary" onClick={openAddCategory}>+ Category</button>
            </>
          )}
        </div>
      </div>

      <div className="hubtoll-tabs" style={{ marginBottom: '1rem' }}>
        {[
          ['overview', 'Overview'],
          ['register', 'Resources'],
          ['bookings', 'Booking Requests'],
          ['allocations', 'Allocations / Locations'],
          ['reports', 'Reports'],
        ].map(([tab, label]) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="hubtoll-kpi-grid">
            <div className="hubtoll-kpi-card accent-blue"><div className="hubtoll-kpi-label">TOTAL ASSETS</div><div className="hubtoll-kpi-value">{resources.length}</div><div className="hubtoll-kpi-sub">Tracked physical resources</div></div>
            <div className="hubtoll-kpi-card accent-green"><div className="hubtoll-kpi-label">AVAILABLE</div><div className="hubtoll-kpi-value">{availableResources.length}</div><div className="hubtoll-kpi-sub">Bookable resources</div></div>
            <div className="hubtoll-kpi-card accent-orange"><div className="hubtoll-kpi-label">ALLOCATED / BOOKED</div><div className="hubtoll-kpi-value">{activeAllocations.length}</div><div className="hubtoll-kpi-sub">Approved bookings</div></div>
            <div className="hubtoll-kpi-card accent-red"><div className="hubtoll-kpi-label">UNDER REPAIR</div><div className="hubtoll-kpi-value">{underRepairCount}</div><div className="hubtoll-kpi-sub">Maintenance or repair attention</div></div>
          </div>
          <div className="hubtoll-dashboard-grid">
            <section className="hubtoll-card hubtoll-dashboard-panel">
              <div className="finance-panel-head"><div><h3>Booking Attention</h3><p className="page-subtitle">Requests that may require review.</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('bookings')}>View Requests</button></div>
              {pendingBookings.length > 0 ? <button type="button" className="hubtoll-attention-item alert-orange" onClick={() => setActiveTab('bookings')}><div className="hubtoll-attention-left"><div className="hubtoll-attention-pill">{pendingBookings.length}</div><div><div className="hubtoll-attention-title">Pending Booking Requests</div><div className="hubtoll-attention-text">Open the booking tab to review pending resource bookings.</div></div></div><span className="hubtoll-attention-chevron">›</span></button> : <div className="empty-state compact">No pending booking requests.</div>}
            </section>
            <section className="hubtoll-card hubtoll-dashboard-panel">
              <div className="finance-panel-head"><div><h3>Resource Attention</h3><p className="page-subtitle">Availability or condition issues.</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('register')}>View Resources</button></div>
              {underRepairCount > 0 ? <button type="button" className="hubtoll-attention-item alert-red" onClick={() => setActiveTab('register')}><div className="hubtoll-attention-left"><div className="hubtoll-attention-pill">{underRepairCount}</div><div><div className="hubtoll-attention-title">Resources Under Repair or Maintenance</div><div className="hubtoll-attention-text">Check status and condition before allowing bookings.</div></div></div><span className="hubtoll-attention-chevron">›</span></button> : <div className="empty-state compact">No resources currently need repair attention.</div>}
            </section>
          </div>
        </>
      )}

      {/* ── Bulk action bar ── */}
      {activeTab === 'register' && selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 16px',
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '10px', marginBottom: '1rem', flexWrap: 'wrap',
        }}>
          <strong style={{ color: '#3b82f6', fontSize: '13px' }}>{selectedIds.size} selected</strong>
          <button className="btn btn-secondary btn-sm" onClick={openBulkAssign}>📍 Assign Location</button>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }} onClick={clearSelection}>✕ Clear</button>
        </div>
      )}

      {activeTab === 'bookings' && visibleBookings.length > 0 && (
        <section className="hubtoll-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="finance-panel-head" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{canManage ? 'Resource Booking Requests' : 'My Resource Bookings'}</h3>
              <p className="page-subtitle">Showing {bookingFiltered.length === 0 ? 0 : ((bookingPage - 1) * PAGE_SIZE) + 1}-{Math.min(bookingPage * PAGE_SIZE, bookingFiltered.length)} of {bookingFiltered.length}</p>
            </div>
            {pendingBookings.length > 0 && <span className="badge badge-pending">{pendingBookings.length} pending</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="form-input" style={{ maxWidth: '260px', fontSize: '13px' }} placeholder="Search bookings..." value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} />
            <select className="form-select" style={{ maxWidth: '170px', fontSize: '13px' }} value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>{modalError}</div>}
          {allocationsError && <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>{allocationsError}</div>}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {pagedBookings.map((booking) => (
              <div key={booking.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '1rem', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{booking.resource_name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(booking.start_time).toLocaleString()} → {new Date(booking.end_time).toLocaleString()}
                    {canManage && booking.allocated_to_username ? ` · ${booking.allocated_to_username}` : ''}
                  </div>
                  {booking.purpose && <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{booking.purpose}</div>}
                  {booking.rejection_reason && <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.2rem' }}>{booking.rejection_reason}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <span className={`badge ${booking.status === 'APPROVED' ? 'badge-approved' : booking.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}`}>{booking.status}</span>
                  {canManage && booking.status === 'PENDING' && (
                    <>
                      <button type="button" className="btn-sm hubtoll-btn-success" onClick={() => decideBooking(booking, 'approve')} disabled={saving}>Approve</button>
                      <button type="button" className="btn-sm hubtoll-btn-danger" onClick={() => {
                        const reason = window.prompt('Reason for rejecting this booking request:');
                        if (reason !== null) {
                          decideBooking(booking, 'reject', reason);
                        }
                      }} disabled={saving}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {pagedBookings.length === 0 && <div className="empty-state compact">No booking requests match the current filters.</div>}
          {bookingPageCount > 1 && (
            <div className="hubtoll-pagination">
              <button type="button" disabled={bookingPage === 1} onClick={() => setBookingPage((p) => Math.max(1, p - 1))}>Previous</button>
              <span>Page {bookingPage} of {bookingPageCount}</span>
              <button type="button" disabled={bookingPage === bookingPageCount} onClick={() => setBookingPage((p) => Math.min(bookingPageCount, p + 1))}>Next</button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'register' && (
        <>
      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: '220px', fontSize: '13px' }} placeholder="Search by name, ID, location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select className="form-select" style={{ maxWidth: '180px', fontSize: '13px' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="ALL">All Categories</option>
          {resourceCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '140px', fontSize: '13px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="BOOKED">Booked / Reserved</option>
          <option value="IN_USE">In Use</option>
          <option value="UNAVAILABLE">Unavailable</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="UNDER_REPAIR">Under Repair</option>
          <option value="RETIRED">Retired</option>
        </select>
        <select className="form-select" style={{ maxWidth: '150px', fontSize: '13px' }} value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
          <option value="ALL">All Conditions</option>
          {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{CONDITION_BADGE[c]?.label || c}</option>)}
        </select>
        {selectedIds.size === 0 && filtered.length > 0 && canManage && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectAll} style={{ fontSize: '12px' }}>Select All ({filtered.length})</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Showing {filtered.length === 0 ? 0 : ((resourcePage - 1) * PAGE_SIZE) + 1}-{Math.min(resourcePage * PAGE_SIZE, filtered.length)} of {filtered.length} resources
        </span>
      </div>

      {loading && <div className="spinner" style={{ margin: '3rem auto', display: 'block', width: '36px', height: '36px' }} />}
      {!loading && resourcesError && <div className="alert alert-danger">{resourcesError}</div>}
      {!loading && categoriesError && <div className="alert alert-danger">{categoriesError}</div>}

      {/* ── Resource Table ── */}
      {!loading && (
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'rgba(30,58,138,0.7)', color: '#fff' }}>
                {canManage && <th style={{ padding: '10px 12px', width: '36px' }}><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(e) => e.target.checked ? selectAll() : clearSelection()} /></th>}
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>RESOURCE ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>NAME</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>CATEGORY</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>CONDITION</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>LOCATION</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pagedResources.length === 0 ? (
                <tr><td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No resources match the current filters.
                </td></tr>
              ) : pagedResources.map((r, idx) => (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                >
                  {canManage && <td style={{ padding: '9px 12px' }}><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>}
                  <td style={{ padding: '9px 12px' }}>
                    <code style={{ fontSize: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>
                      {r.resource_id || '—'}
                    </code>
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: 500, fontSize: '13px' }}>
                    {r.name}
                    {r.is_portable && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>PORTABLE</span>}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>{categoryMap[r.category] || r.category_name || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span className={STATUS_BADGE[r.status]?.cls || 'badge'}>{STATUS_BADGE[r.status]?.label || r.status}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}><ConditionBadge condition={r.condition || 'GOOD'} /></td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.location || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px', minHeight: 'unset' }} onClick={() => openDrawer(r)} title="History & Inspection">View</button>
                      {r.status === 'AVAILABLE' && !['UNDER_REPAIR', 'DAMAGED'].includes(r.condition) && (
                        <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px', minHeight: 'unset' }} onClick={() => openBook(r)} title="Book Resource">Book</button>
                      )}
                      {canManage && (
                        <>
                          <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px', minHeight: 'unset' }} onClick={() => openEdit(r)} title="Edit">Edit</button>
                          <button type="button" className="btn btn-danger btn-sm" style={{ padding: '3px 8px', fontSize: '12px', minHeight: 'unset' }} onClick={() => handleDelete(r.id)} title="Delete">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resourcePageCount > 1 && (
        <div className="hubtoll-pagination">
          <button type="button" disabled={resourcePage === 1} onClick={() => setResourcePage((p) => Math.max(1, p - 1))}>Previous</button>
          <span>Page {resourcePage} of {resourcePageCount}</span>
          <button type="button" disabled={resourcePage === resourcePageCount} onClick={() => setResourcePage((p) => Math.min(resourcePageCount, p + 1))}>Next</button>
        </div>
      )}
        </>
      )}

      {activeTab === 'bookings' && visibleBookings.length === 0 && (
        <section className="hubtoll-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          {allocationsError ? <div className="alert alert-danger">{allocationsError}</div> : <div className="empty-state compact">No booking requests to show.</div>}
        </section>
      )}

      {activeTab === 'allocations' && (
        <section className="hubtoll-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="finance-panel-head" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Current Allocations</h3>
              <p className="page-subtitle">Approved resource bookings and assignments.</p>
            </div>
          </div>
          {allocationsError && <div className="alert alert-danger" style={{ marginBottom: '0.75rem' }}>{allocationsError}</div>}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Assigned To</th>
                  <th>Assignment Type</th>
                  <th>Date Assigned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeAllocations.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No active approved allocations.</td></tr>
                ) : activeAllocations.slice(0, PAGE_SIZE).map((allocation) => (
                  <tr key={allocation.id}>
                    <td><strong>{allocation.resource_name}</strong></td>
                    <td>{allocation.allocated_to_username || '-'}</td>
                    <td>{allocation.activity_title ? 'Activity' : 'Room / Resource Booking'}</td>
                    <td>{new Date(allocation.start_time).toLocaleString()}</td>
                    <td><span className="badge badge-approved">{allocation.status}</span></td>
                    <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('bookings')}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="hubtoll-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="finance-panel-head" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Resource Reports</h3>
              <p className="page-subtitle">Generate printable and spreadsheet exports from the Resource Register.</p>
            </div>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setModalType('export')}>
                Export Register
              </button>
            )}
          </div>
          {canManage ? (
            <div className="hubtoll-mini-metrics">
              <div className="hubtoll-mini-metric"><strong>{resources.length}</strong><span>Total resources available for reporting</span></div>
              <div className="hubtoll-mini-metric"><strong>{resourceCategories.length}</strong><span>Categories available as report filters</span></div>
              <div className="hubtoll-mini-metric"><strong>{underRepairCount}</strong><span>Repair or maintenance records to review</span></div>
            </div>
          ) : (
            <div className="empty-state compact">Resource reporting is available to Resources & Assets administrators.</div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}

      {/* Add / Edit Resource */}
      {(modalType === 'add_resource' || modalType === 'edit_resource') && (
        <Modal
          title={modalType === 'add_resource' ? 'Add Resource' : 'Edit Resource'}
          onClose={() => setModalType(null)}
          onSubmit={handleSaveResource}
          footer={<><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : (modalType === 'add_resource' ? 'Add Resource' : 'Save Changes')}</button></>}
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group"><label className="form-label">Resource ID *</label><input className="form-input" value={resourceCode} onChange={(e) => setResourceCode(e.target.value)} placeholder="e.g. COMP-001" required /></div>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Laptop" required /></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">— No category —</option>
                {resourceCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Condition</label>
              <select className="form-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{CONDITION_BADGE[c]?.label || c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_BADGE[s]?.label || s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Location / Room</label><input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lab 1, Office 3B" /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Description</label><textarea className="form-textarea" rows="2" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={isPortable} onChange={(e) => setIsPortable(e.target.checked)} />
                Portable (can be moved between rooms)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Add */}
      {modalType === 'bulk_add' && (
        <Modal
          title="Bulk Add Resources"
          onClose={() => setModalType(null)}
          onSubmit={bulkResult ? () => setModalType(null) : handleBulkCreate}
          footer={
            bulkResult ? (
              <button type="button" className="btn btn-primary" onClick={() => setModalType(null)}>Done</button>
            ) : (
              <><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : `Create ${bulkQty} Assets`}</button></>
            )
          }
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          {bulkResult ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{bulkResult.created_count} assets created</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{bulkResult.message}</div>
              {bulkResult.skipped_count > 0 && <div style={{ marginTop: '8px', color: '#f59e0b', fontSize: '12px' }}>⚠ {bulkResult.skipped_count} skipped (already exist)</div>}
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Generates sequential IDs like <strong>COMP-001, COMP-002 … COMP-010</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group"><label className="form-label">Prefix *</label><input className="form-input" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())} placeholder="e.g. COMP" /></div>
                <div className="form-group"><label className="form-label">Start Number</label><input className="form-input" type="number" min="1" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Quantity (max 500)</label><input className="form-input" type="number" min="1" max="500" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="form-select" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
                    <option value="">— None —</option>
                    {resourceCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Condition</label>
                  <select className="form-select" value={bulkCondition} onChange={(e) => setBulkCondition(e.target.value)}>
                    {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{CONDITION_BADGE[c]?.label || c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Location / Room</label><input className="form-input" value={bulkLocation} onChange={(e) => setBulkLocation(e.target.value)} placeholder="e.g. Computer Lab 1" /></div>
              </div>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={bulkPortable} onChange={(e) => setBulkPortable(e.target.checked)} />
                Mark as Portable
              </label>
            </>
          )}
        </Modal>
      )}

      {/* Import */}
      {modalType === 'import' && (
        <Modal
          title="Import Resources from File"
          onClose={() => setModalType(null)}
          onSubmit={importResult ? () => setModalType(null) : handleImport}
          footer={
            importResult ? (
              <button type="button" className="btn btn-primary" onClick={() => setModalType(null)}>Done</button>
            ) : (
              <><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !importFile}>{saving ? <span className="spinner" /> : 'Import'}</button></>
            )
          }
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          {importResult ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>Import Complete</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}><div style={{ fontWeight: 700, fontSize: '20px', color: '#10b981' }}>{importResult.created_count}</div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Created</div></div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}><div style={{ fontWeight: 700, fontSize: '20px', color: '#f59e0b' }}>{importResult.skipped_count}</div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Skipped</div></div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}><div style={{ fontWeight: 700, fontSize: '20px', color: '#ef4444' }}>{importResult.error_count}</div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Errors</div></div>
              </div>
              {importResult.errors?.length > 0 && <div style={{ fontSize: '11px', color: '#ef4444' }}>{importResult.errors.join('\n')}</div>}
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select File (.csv or .xlsx)</label>
                <input className="form-input" type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Required columns: <code>resource_id, name</code>. Optional: <code>category_name, condition, location, is_portable, description</code>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate}>↓ Download Template CSV</button>
            </>
          )}
        </Modal>
      )}

      {/* Bulk Assign Location */}
      {modalType === 'bulk_assign' && (
        <Modal
          title={`Assign Location — ${selectedIds.size} resource${selectedIds.size !== 1 ? 's' : ''}`}
          onClose={() => setModalType(null)}
          onSubmit={handleBulkAssign}
          footer={<><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Assign & Save'}</button></>}
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          <div className="form-group"><label className="form-label">New Location / Room *</label><input className="form-input" value={assignLocation} onChange={(e) => setAssignLocation(e.target.value)} placeholder="e.g. Computer Lab 2, Office 3B" required /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows="2" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Optional reason for transfer..." /></div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Location history will be recorded for all selected resources.</div>
        </Modal>
      )}

      {/* Export */}
      {modalType === 'export' && (
        <Modal
          title="Export Resource Register"
          onClose={() => setModalType(null)}
          onSubmit={handleExport}
          footer={<><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button><button type="submit" className="btn btn-primary">↓ Download {exportFormat}</button></>}
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          <div className="form-group"><label className="form-label">Format</label>
            <select className="form-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="PDF">PDF — Formal Register (Printable)</option>
              <option value="EXCEL">Excel (.xlsx) — Spreadsheet</option>
              <option value="CSV">CSV — Data Export</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Category Filter</label>
            <select className="form-select" value={exportCategory} onChange={(e) => setExportCategory(e.target.value)}>
              <option value="">All Categories</option>
              {resourceCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Report includes: Resource ID, Name, Category, Status, Condition, Location, Portable flag, Date Added.
          </div>
        </Modal>
      )}

      {/* Add Category */}
      {modalType === 'add_category' && (
        <Modal
          title="Add Resource Category"
          onClose={() => setModalType(null)}
          onSubmit={handleSaveCategory}
          footer={<><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Create Category'}</button></>}
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows="2" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} /></div>
          {canManage && (
            <div className="form-group"><label className="form-label">Manager</label>
              <select className="form-select" value={categoryManager} onChange={(e) => setCategoryManager(e.target.value)}>
                <option value="">— No manager —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
          )}
        </Modal>
      )}

      {/* Book Resource */}
      {modalType === 'book_resource' && (
        <Modal
          title="Book Resource"
          onClose={() => setModalType(null)}
          onSubmit={handleBookResource}
          footer={<><button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Submit Booking Request'}</button></>}
        >
          {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
          <div className="form-group"><label className="form-label">Resource *</label>
            <select className="form-select" value={bookResourceId} onChange={(e) => setBookResourceId(e.target.value)} required>
              <option value="">Select an available resource</option>
              {availableResources.map((r) => <option key={r.id} value={r.id}>{r.resource_id ? `${r.resource_id} — ` : ''}{r.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Activity (optional)</label>
            <select className="form-select" value={bookActivityId} onChange={(e) => setBookActivityId(e.target.value)}>
              <option value="">— None —</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group"><label className="form-label">Start Time *</label><input className="form-input" type="datetime-local" value={bookStartTime} onChange={(e) => setBookStartTime(e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">End Time *</label><input className="form-input" type="datetime-local" value={bookEndTime} onChange={(e) => setBookEndTime(e.target.value)} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Purpose</label><input className="form-input" value={bookPurpose} onChange={(e) => setBookPurpose(e.target.value)} placeholder="e.g. Workshop setup, lab demonstration" /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows="2" value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Optional extra details for the resource reviewer..." /></div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Requests enter approval before the booking is confirmed.</div>
        </Modal>
      )}

      {/* Detail Drawer: Location History + Inspection */}
      {modalType === 'drawer' && drawerResource && (
        <Modal
          title={`Asset Details — ${drawerResource.resource_id || drawerResource.name}`}
          onClose={() => setModalType(null)}
          footer={<button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Close</button>}
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Summary */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Condition</div><ConditionBadge condition={drawerResource.condition || 'GOOD'} /></div>
            <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status</div><span className={STATUS_BADGE[drawerResource.status]?.cls || 'badge'}>{STATUS_BADGE[drawerResource.status]?.label || drawerResource.status}</span></div>
            <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Location</div><span style={{ fontWeight: 600, fontSize: '13px' }}>{drawerResource.location || '—'}</span></div>
            <div><div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Portable</div><span style={{ fontWeight: 600, fontSize: '13px' }}>{drawerResource.is_portable ? 'Yes' : 'No'}</span></div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
            {[['location', '📍 Location History'], ['status', '⚙ Status'], ['inspection', '🔬 Inspections']].map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setDrawerTab(tab)} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: drawerTab === tab ? 700 : 400,
                background: drawerTab === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: drawerTab === tab ? '#3b82f6' : 'var(--text-secondary)',
                border: drawerTab === tab ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}>
                {label}
              </button>
            ))}
          </div>

          {drawerLoading ? (
            <div className="spinner" style={{ margin: '2rem auto', display: 'block', width: '30px', height: '30px' }} />
          ) : drawerTab === 'location' ? (
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {drawerHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '13px' }}>No location transfers recorded.</div>
              ) : drawerHistory.map((h) => (
                <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span><strong>{h.previous_location || 'Initial'}</strong> → <strong style={{ color: '#10b981' }}>{h.new_location}</strong></span>
                    <span style={{ color: 'var(--text-secondary)' }}>{new Date(h.changed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>By {h.changed_by || 'System'}{h.notes && ` — ${h.notes}`}</div>
                </div>
              ))}
            </div>
          ) : drawerTab === 'status' ? (
            <div>
              {canManage && (
                <div style={{ display: 'grid', gap: '0.75rem', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Change Status</label>
                    <select className="form-select" value={drawerResource.status} onChange={(e) => setDrawerResource({ ...drawerResource, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_BADGE[s]?.label || s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Reason / Notes</label>
                    <textarea className="form-textarea" rows="2" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="Maintenance note, repair reason, retirement note..." />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleChangeStatus} disabled={saving}>{saving ? 'Saving...' : 'Save Status Change'}</button>
                </div>
              )}
              {drawerStatusHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '13px' }}>No status changes recorded.</div>
              ) : drawerStatusHistory.map((h) => (
                <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '13px' }}><strong>{STATUS_BADGE[h.previous_status]?.label || h.previous_status || '—'}</strong> → <strong>{STATUS_BADGE[h.new_status]?.label || h.new_status}</strong></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(h.changed_at).toLocaleString()} by {h.changed_by || 'System'}</div>
                  {h.notes && <div style={{ fontSize: '12px', marginTop: '4px' }}>{h.notes}</div>}
                </div>
              ))}
            </div>
          ) : (
            <>
              {canManage && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', color: 'var(--text-secondary)' }}>Record New Inspection</div>
                  {modalError && <div className="alert alert-danger" style={{ marginBottom: '8px', fontSize: '12px' }}>{modalError}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Condition *</label>
                      <select className="form-select" value={inspectCondition} onChange={(e) => setInspectCondition(e.target.value)}>
                        {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{CONDITION_BADGE[c]?.label || c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remarks</label>
                      <input className="form-input" value={inspectRemarks} onChange={(e) => setInspectRemarks(e.target.value)} placeholder="Notes on condition..." />
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleRecordInspection}>
                    {saving ? <span className="spinner" /> : '+ Record Inspection'}
                  </button>
                </div>
              )}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {drawerInspections.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem', fontSize: '13px' }}>No inspections recorded.</div>
                ) : drawerInspections.map((insp) => (
                  <div key={insp.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {insp.previous_condition && <><ConditionBadge condition={insp.previous_condition} /><span style={{ fontSize: '12px' }}>→</span></>}
                        <ConditionBadge condition={insp.current_condition} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{insp.inspection_date}</span>
                    </div>
                    {insp.remarks && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{insp.remarks}</div>}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>By {insp.inspected_by || 'System'}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Resources;
