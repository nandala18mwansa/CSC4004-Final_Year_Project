import { useState, useEffect, useContext, useMemo } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

// ── Helpers ─────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateLocal = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUS_BADGES = {
  PENDING_APPROVAL: {
    label: 'PENDING APPROVAL',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    bar: '#f59e0b',
  },
  SCHEDULED: {
    label: 'SCHEDULED',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    bar: '#10b981',
  },
  RESCHEDULED: {
    label: 'RESCHEDULED',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    bar: '#f59e0b',
  },
  COMPLETED: {
    label: 'COMPLETED',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    bar: '#3b82f6',
  },
  CANCELLED: {
    label: 'CANCELLED',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    bar: '#ef4444',
  },
  REJECTED: {
    label: 'REJECTED',
    color: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    bar: '#ef4444',
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_BADGES[status] || STATUS_BADGES.SCHEDULED;
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        padding: '3px 10px',
        borderRadius: '16px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {cfg.label}
    </span>
  );
};

// ── Searchable Group Multi-Select ────────────────────────────────────

const GroupPicker = ({ groups, selected, onChange, onManageGroups, canManage }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return groups.filter((g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [groups, search]);

  const selectedSet = useMemo(() => new Set(selected.map(Number)), [selected]);

  const toggle = (id) => {
    const numId = Number(id);
    if (selectedSet.has(numId)) {
      onChange(selected.filter((s) => Number(s) !== numId));
    } else {
      onChange([...selected, numId]);
    }
  };

  const selectAll = () => onChange(filtered.map((g) => g.id));
  const clearAll = () => onChange([]);

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
          Participant Groups
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Select all
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>|</span>
          <button
            type="button"
            onClick={clearAll}
            style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear
          </button>
          {canManage && (
            <>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>|</span>
              <button
                type="button"
                onClick={onManageGroups}
                style={{ fontSize: '11px', color: 'var(--hub-orange, #ea580c)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                + Manage Groups
              </button>
            </>
          )}
        </div>
      </div>

      <input
        className="form-input"
        style={{ marginBottom: '6px', fontSize: '12px', padding: '6px 10px' }}
        placeholder="Search participant groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div
        style={{
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          maxHeight: '130px',
          overflowY: 'auto',
          background: 'var(--input-bg, #ffffff)',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>
            No groups found
          </div>
        ) : (
          filtered.map((g) => {
            const isChecked = selectedSet.has(g.id);
            return (
              <label
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: '1px solid var(--border-color, #f1f5f9)',
                  background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(g.id)}
                />
                <span style={{ fontWeight: isChecked ? 600 : 400, color: 'var(--text-primary)' }}>
                  {g.name}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '12px' }}>
                  {g.member_count || (g.members || []).length} members
                </span>
              </label>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#3b82f6', fontWeight: 500 }}>
          {selected.length} group{selected.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

// ── Searchable Individual Users Multi-Select ─────────────────────────

const IndividualUserPicker = ({ users, selected, onChange }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const uname = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const role = (u.role || '').toLowerCase();
      return uname.includes(q) || email.includes(q) || fullName.includes(q) || role.includes(q);
    });
  }, [users, search]);

  const selectedSet = useMemo(() => new Set(selected.map(Number)), [selected]);

  const toggle = (id) => {
    const numId = Number(id);
    if (selectedSet.has(numId)) {
      onChange(selected.filter((s) => Number(s) !== numId));
    } else {
      onChange([...selected, numId]);
    }
  };

  const selectAll = () => onChange(filtered.map((u) => u.id));
  const clearAll = () => onChange([]);

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
          Individual Participants
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Select all
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>|</span>
          <button
            type="button"
            onClick={clearAll}
            style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear
          </button>
        </div>
      </div>

      <input
        className="form-input"
        style={{ marginBottom: '6px', fontSize: '12px', padding: '6px 10px' }}
        placeholder="Search users by name, username, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div
        style={{
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          maxHeight: '140px',
          overflowY: 'auto',
          background: 'var(--input-bg, #ffffff)',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>
            No users found
          </div>
        ) : (
          filtered.map((u) => {
            const isChecked = selectedSet.has(u.id);
            const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
            return (
              <label
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: '1px solid var(--border-color, #f1f5f9)',
                  background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(u.id)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: isChecked ? 600 : 400, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {displayName}
                    {displayName !== u.username && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '6px' }}>
                        (@{u.username})
                      </span>
                    )}
                  </span>
                  {u.email && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </span>
                  )}
                </div>
                {u.role && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {u.role}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#3b82f6', fontWeight: 500 }}>
          {selected.length} user{selected.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

// ── Main Activities Component ────────────────────────────────────────

const Activities = () => {
  const { user } = useContext(AuthContext);

  const [activities, setActivities] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [recipientGroups, setRecipientGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'reschedule' | 'cancel' | 'delete' | 'roster' | 'addType' | 'manageTypes' | 'addGroup' | 'manageGroups'
  const [activeActivity, setActiveActivity] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [recipientGroupIds, setRecipientGroupIds] = useState([]);
  const [includeAllStaff, setIncludeAllStaff] = useState(false);
  const [externalParticipants, setExternalParticipants] = useState('');
  const [sendEmailReminders, setSendEmailReminders] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(60);
  const [notes, setNotes] = useState('');

  // Type Quick-Add state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [typeSaving, setTypeSaving] = useState(false);
  const [typeError, setTypeError] = useState('');

  // Group Quick-Add state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState('');

  // Reschedule Form
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel Form
  const [cancelReason, setCancelReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = Boolean(user?.is_superuser || user?.has_activity_privilege);

  // ── Data Fetching ──────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [actRes, typesRes, userRes, groupRes] = await Promise.all([
        api.get('activities/'),
        api.get('activity-types/?all=true'),
        api.get('users/'),
        api.get('recipient-groups/?all=true').catch(() => ({ data: [] })),
      ]);
      setActivities(actRes.data);
      setActivityTypes(typesRes.data);
      setUsers(userRes.data);
      setRecipientGroups(groupRes.data);
    } catch (err) {
      setError('Unable to fetch activities data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, []);

  // Set default activity type once loaded
  useEffect(() => {
    if (!activityTypeId && activityTypes.length > 0) {
      const defaultType = activityTypes.find((t) => t.is_active);
      if (defaultType) setActivityTypeId(defaultType.id);
    }
  }, [activityTypes, activityTypeId]);

  // ── Unique Recipient Live Calculation ──────────────────────────────

  const uniqueRecipientSummary = useMemo(() => {
    const dmsUserSet = new Set();

    if (includeAllStaff) {
      users.filter((u) => u.is_active).forEach((u) => dmsUserSet.add(u.id));
    } else {
      // Add from selected groups
      const selectedGroupObjects = recipientGroups.filter((g) => recipientGroupIds.includes(g.id));
      selectedGroupObjects.forEach((g) => {
        (g.members || []).forEach((memId) => dmsUserSet.add(Number(memId)));
      });

      // Add individual users
      participantIds.forEach((uid) => dmsUserSet.add(Number(uid)));
    }

    // External emails count
    let extCount = 0;
    if (externalParticipants.trim()) {
      const parts = externalParticipants.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
      const extSet = new Set(parts.filter((p) => /^[^@]+@[^@]+\.[^@]+$/.test(p)));
      extCount = extSet.size;
    }

    return {
      dmsCount: dmsUserSet.size,
      groupCount: recipientGroupIds.length,
      individualCount: participantIds.length,
      externalCount: extCount,
    };
  }, [includeAllStaff, recipientGroupIds, recipientGroups, participantIds, users, externalParticipants]);

  // ── Form Reset & Open Modals ───────────────────────────────────────

  const resetForm = () => {
    setTitle('');
    setDescription('');
    const firstActive = activityTypes.find((t) => t.is_active);
    setActivityTypeId(firstActive ? firstActive.id : '');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setParticipantIds([]);
    setRecipientGroupIds([]);
    setIncludeAllStaff(false);
    setExternalParticipants('');
    setSendEmailReminders(true);
    setReminderMinutesBefore(60);
    setNotes('');
    setError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalType('create');
  };

  const openEditModal = (act) => {
    setActiveActivity(act);
    setTitle(act.title);
    setDescription(act.description || '');
    setActivityTypeId(act.activity_type || '');
    setLocation(act.location || '');
    setStartDate(formatDateLocal(act.start_date));
    setEndDate(formatDateLocal(act.end_date));
    setParticipantIds(act.participants || []);
    setRecipientGroupIds(act.recipient_groups || []);
    setIncludeAllStaff(Boolean(act.include_all_staff));
    setExternalParticipants(act.external_participants || '');
    setSendEmailReminders(Boolean(act.send_email_reminders));
    setReminderMinutesBefore(act.reminder_minutes_before || 60);
    setNotes(act.notes || '');
    setError('');
    setModalType('edit');
  };

  const openRescheduleModal = (act) => {
    setActiveActivity(act);
    setRescheduleStart(formatDateLocal(act.start_date));
    setRescheduleEnd(formatDateLocal(act.end_date));
    setRescheduleReason('');
    setError('');
    setModalType('reschedule');
  };

  const openCancelModal = (act) => {
    setActiveActivity(act);
    setCancelReason('');
    setError('');
    setModalType('cancel');
  };

  const openDeleteModal = (act) => {
    setActiveActivity(act);
    setError('');
    setModalType('delete');
  };

  const openRosterModal = async (act) => {
    setActiveActivity(act);
    setRosterLoading(true);
    setModalType('roster');
    try {
      const res = await api.get(`activities/${act.id}/participants/`);
      setRosterData(res.data);
    } catch {
      setRosterData(null);
    } finally {
      setRosterLoading(false);
    }
  };

  // ── Submissions ────────────────────────────────────────────────────

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    activity_type: activityTypeId || null,
    location: location.trim(),
    start_date: startDate,
    end_date: endDate,
    participants: participantIds,
    recipient_groups: recipientGroupIds,
    include_all_staff: includeAllStaff,
    external_participants: externalParticipants.trim(),
    send_email_reminders: sendEmailReminders,
    reminder_minutes_before: Number(reminderMinutesBefore),
    notes: notes.trim(),
  });

  const validateForm = () => {
    if (!title.trim()) return 'Activity title is required.';
    if (!startDate) return 'Start date and time is required.';
    if (!endDate) return 'End date and time is required.';
    if (new Date(endDate) <= new Date(startDate)) return 'End date and time must be after start date.';
    return null;
  };

  const handleCreate = async () => {
    const valErr = validateForm();
    if (valErr) {
      setError(valErr);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('activities/', buildPayload());
      await loadData();
      setModalType(null);
    } catch (err) {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to schedule activity.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    const valErr = validateForm();
    if (valErr) {
      setError(valErr);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(`activities/${activeActivity.id}/`, buildPayload());
      await loadData();
      setModalType(null);
    } catch (err) {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to update activity.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleStart || !rescheduleEnd) {
      setError('Both new start and end dates are required.');
      return;
    }
    if (new Date(rescheduleEnd) <= new Date(rescheduleStart)) {
      setError('End date and time must be after start date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`activities/${activeActivity.id}/reschedule/`, {
        start_date: rescheduleStart,
        end_date: rescheduleEnd,
        reason: rescheduleReason.trim(),
      });
      await loadData();
      setModalType(null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to reschedule activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`activities/${activeActivity.id}/cancel/`, { reason: cancelReason.trim() });
      await loadData();
      setModalType(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel activity.');
    } finally {
      setSaving(false);
    }
  };

  const decideActivity = async (activity, decision) => {
    let payload = {};
    if (decision === 'reject') {
      const reason = window.prompt('Reason for rejecting this activity submission:');
      if (!reason || !reason.trim()) return;
      payload = { reason: reason.trim() };
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`activities/${activity.id}/${decision}/`, payload);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.reason || JSON.stringify(err.response?.data) || `Failed to ${decision} activity.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeActivity) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`activities/${activeActivity.id}/`);
      await loadData();
      setSuccessMsg(`Activity "${activeActivity.title}" was deleted.`);
      setModalType(null);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete activity.');
    } finally {
      setSaving(false);
    }
  };

  // ── Quick Add Activity Type ────────────────────────────────────────

  const handleCreateActivityType = async () => {
    if (!newTypeName.trim()) {
      setTypeError('Activity type name is required.');
      return;
    }
    setTypeSaving(true);
    setTypeError('');
    try {
      const res = await api.post('activity-types/', {
        name: newTypeName.trim(),
        description: newTypeDesc.trim(),
      });
      await loadData();
      setActivityTypeId(res.data.id);
      setNewTypeName('');
      setNewTypeDesc('');
      setModalType('create'); // return to schedule form
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create activity type.';
      setTypeError(msg);
    } finally {
      setTypeSaving(false);
    }
  };

  const handleToggleActivityType = async (typeId) => {
    try {
      await api.post(`activity-types/${typeId}/toggle-active/`);
      await loadData();
    } catch (err) {
      alert('Failed to update activity type status.');
    }
  };

  const handleDeleteActivityType = async (typeId) => {
    try {
      await api.delete(`activity-types/${typeId}/`);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot delete this activity type.');
    }
  };

  // ── Quick Add Participant Group ───────────────────────────────────

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setGroupError('Group name is required.');
      return;
    }
    setGroupSaving(true);
    setGroupError('');
    try {
      const res = await api.post('recipient-groups/', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        members: newGroupMembers,
      });
      await loadData();
      setRecipientGroupIds((prev) => [...prev, res.data.id]);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupMembers([]);
      setModalType('create'); // return to schedule form
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create participant group.';
      setGroupError(msg);
    } finally {
      setGroupSaving(false);
    }
  };

  // ── Filter Activities ──────────────────────────────────────────────

  const isOrganizer = (act) => act.organizer === user?.id || act.organizer_username === user?.username;
  const canActOn = (act) => canManage || (isOrganizer(act) && act.approval_status === 'PENDING');

  const filteredActivities = activities.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q) ||
      (a.activity_type_name || '').toLowerCase().includes(q) ||
      (a.organizer_username || '').toLowerCase().includes(q)
    );
  });

  const activeTypesList = activityTypes.filter((t) => t.is_active);

  // ── Form Modal Body ────────────────────────────────────────────────

  const formBody = (
    <>
      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Activity Title *</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Departmental Planning Session / Curriculum Review"
            required
          />
        </div>

        {/* Activity Type Selector with + Add Type button */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Activity Type *</label>
            {canManage && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setTypeError(''); setModalType('addType'); }}
                  style={{ fontSize: '11px', color: 'var(--hub-orange, #ea580c)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  + Add Type
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>|</span>
                <button
                  type="button"
                  onClick={() => setModalType('manageTypes')}
                  style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Manage
                </button>
              </div>
            )}
          </div>
          <select
            className="form-select"
            value={activityTypeId}
            onChange={(e) => setActivityTypeId(e.target.value ? Number(e.target.value) : '')}
          >
            {activeTypesList.length === 0 && <option value="">Loading types...</option>}
            {activeTypesList.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Location / Room */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Location / Room</label>
          <input
            className="form-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Board Room, Lab 3, Auditorium"
          />
        </div>

        {/* Start Date & Time */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Start Date & Time *</label>
          <input
            className="form-input"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* End Date & Time */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>End Date & Time *</label>
          <input
            className="form-input"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Description / Agenda */}
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Description / Agenda</label>
          <textarea
            className="form-textarea"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide meeting agenda, objectives, and preparation instructions..."
          />
        </div>
      </div>

      {/* Participants & Groups Section */}
      <hr style={{ borderColor: 'var(--border-color, #e2e8f0)', margin: '12px 0 16px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          Participants & Affected Groups
        </div>
        {/* Real-time deduplication badge */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            color: '#2563eb',
            borderRadius: '16px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {uniqueRecipientSummary.dmsCount} unique recipient{uniqueRecipientSummary.dmsCount !== 1 ? 's' : ''}
          {uniqueRecipientSummary.externalCount > 0 && ` + ${uniqueRecipientSummary.externalCount} external`}
        </div>
      </div>

      {/* Include All Staff Toggle */}
      <div
        style={{
          background: includeAllStaff ? 'rgba(16, 185, 129, 0.08)' : 'var(--input-bg, #f8fafc)',
          border: `1px solid ${includeAllStaff ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color, #e2e8f0)'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          transition: 'var(--transition-fast)',
        }}
      >
        <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
          <input
            type="checkbox"
            checked={includeAllStaff}
            onChange={(e) => setIncludeAllStaff(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Include All Active Department Staff
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Automatically invites all registered active department users without selecting individual groups.
            </div>
          </div>
        </label>
      </div>

      {!includeAllStaff && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
          {/* Participant Groups */}
          <GroupPicker
            groups={recipientGroups.filter((g) => g.is_active)}
            selected={recipientGroupIds}
            onChange={setRecipientGroupIds}
            onManageGroups={() => { setGroupError(''); setModalType('manageGroups'); }}
            canManage={canManage}
          />

          {/* Individual Participants */}
          <IndividualUserPicker
            users={users.filter((u) => u.is_active)}
            selected={participantIds}
            onChange={setParticipantIds}
          />
        </div>
      )}

      {/* External Participants */}
      <div className="form-group" style={{ marginTop: '10px' }}>
        <label className="form-label" style={{ fontWeight: 600 }}>
          External Participants (emails)
        </label>
        <textarea
          className="form-textarea"
          rows="2"
          value={externalParticipants}
          onChange={(e) => setExternalParticipants(e.target.value)}
          placeholder="e.g. guest.speaker@university.ac.zm, external.partner@organisation.org"
        />
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Separate addresses with commas, semicolons, or newlines. External participants receive email & calendar (.ics) invitations only.
        </div>
      </div>

      {/* Reminders & Notes */}
      <hr style={{ borderColor: 'var(--border-color, #e2e8f0)', margin: '12px 0 16px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem', alignItems: 'center' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={sendEmailReminders}
              onChange={(e) => setSendEmailReminders(e.target.checked)}
            />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Send email & calendar reminders</span>
          </label>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Reminder Timing</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              className="form-input"
              type="number"
              min="5"
              step="5"
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(e.target.value)}
              disabled={!sendEmailReminders}
              style={{ maxWidth: '100px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>minutes before</span>
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label" style={{ fontWeight: 600 }}>Internal Notes</label>
        <textarea
          className="form-textarea"
          rows="2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes, administrative reminders (not sent to participants)..."
        />
      </div>
    </>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          paddingBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--hub-navy, #151d54)', letterSpacing: '-0.02em' }}>
              Activities & Events
            </h1>
            <span
              style={{
                background: 'rgba(234, 88, 12, 0.1)',
                color: 'var(--hub-orange, #ea580c)',
                padding: '3px 10px',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {filteredActivities.length} total
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
            Departmental meetings, workshops, seminars, and academic events with unified notifications & calendar sync
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ width: '240px', fontSize: '13px', padding: '7px 12px' }}
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {canManage && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '7px 14px' }}
                onClick={() => setModalType('manageTypes')}
              >
                Activity Types
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '7px 14px' }}
                onClick={() => { setGroupError(''); setModalType('manageGroups'); }}
              >
                Groups
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '7px 16px', fontWeight: 600 }}
            onClick={openCreateModal}
          >
            + Schedule Activity
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '36px', height: '36px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading departmental activities...</p>
        </div>
      )}

      {!loading && error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {!loading && successMsg && <div className="hubtoll-alert-banner hubtoll-alert-success">{successMsg}</div>}

      {/* ── Full-Width Scheduled Activity Cards ──────────────────────── */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredActivities.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                border: '1px dashed var(--border-color, #cbd5e1)',
                borderRadius: '12px',
                textAlign: 'center',
                padding: '4rem 2rem',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.35 }}>📅</div>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--hub-navy, #151d54)', fontWeight: 700 }}>
                No scheduled activities found
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                {searchQuery
                  ? 'No activities match your current search query. Try clearing the search filter.'
                  : 'Get started by scheduling your first department meeting, training workshop, or seminar.'}
              </p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Schedule Activity
              </button>
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const isCancelled = activity.status === 'CANCELLED';
              const badgeCfg = STATUS_BADGES[activity.status] || STATUS_BADGES.SCHEDULED;

              return (
                <div
                  key={activity.id}
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderLeft: `5px solid ${badgeCfg.bar}`,
                    borderRadius: '12px',
                    padding: '1.35rem 1.6rem',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    transition: 'var(--transition-fast)',
                    opacity: isCancelled ? 0.72 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* ── Top Header Row: Title + Type + Status + Action Buttons ── */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--hub-navy, #151d54)',
                            lineHeight: 1.3,
                          }}
                        >
                          {activity.title}
                        </h2>
                        <StatusBadge status={activity.status || 'SCHEDULED'} />
                      </div>

                      {/* Activity Type Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#4f46e5',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '2px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {activity.activity_type_name || 'Departmental Activity'}
                        </span>

                        {activity.location && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {activity.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Labeled Management Actions */}
                    {canActOn(activity) && (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!isCancelled && canManage && activity.approval_status === 'PENDING' && !isOrganizer(activity) && (
                          <>
                            <button
                              type="button"
                              className="btn-sm hubtoll-btn-success"
                              onClick={() => decideActivity(activity, 'approve')}
                              disabled={saving}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-sm hubtoll-btn-danger"
                              onClick={() => decideActivity(activity, 'reject')}
                              disabled={saving}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {!isCancelled && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '12px', fontWeight: 500 }}
                            onClick={() => openEditModal(activity)}
                            title="Edit activity details"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {!isCancelled && canManage && activity.approval_status === 'APPROVED' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '12px', fontWeight: 500 }}
                              onClick={() => openRescheduleModal(activity)}
                              title="Reschedule date/time and notify attendees"
                            >
                              📅 Reschedule
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '12px', fontWeight: 500 }}
                              onClick={() => openCancelModal(activity)}
                              title="Cancel activity and notify attendees"
                            >
                              🚫 Cancel
                            </button>
                          </>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '12px', color: '#dc2626' }}
                            onClick={() => openDeleteModal(activity)}
                            title="Delete record permanently"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Date & Time Row ── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      background: 'rgba(0,0,0,0.02)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--hub-orange, #ea580c)' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <strong>{formatDate(activity.start_date)}</strong>
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>to</span>
                    <span><strong>{formatDate(activity.end_date)}</strong></span>
                  </div>

                  {/* ── Description / Agenda ── */}
                  {activity.description && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {activity.description}
                    </div>
                  )}

                  {/* ── Participant Breakdown Bar ── */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        Participants:
                      </span>

                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {activity.participant_summary || 'No participants assigned'}
                      </span>

                      {activity.external_participants && (
                        <span
                          style={{
                            background: 'rgba(139, 92, 246, 0.12)',
                            color: '#7c3aed',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            padding: '1px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          External invited
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openRosterModal(activity)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      View Participants Roster →
                    </button>
                  </div>

                  {/* ── Footer: Organizer + Google Calendar ── */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.6rem',
                      borderTop: '1px solid var(--border-color, #f1f5f9)',
                      paddingTop: '0.65rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Organizer: <strong style={{ color: 'var(--text-primary)' }}>{activity.organizer_username || 'Department'}</strong>
                      {isOrganizer(activity) && (
                        <span style={{ color: 'var(--hub-orange, #ea580c)', marginLeft: '4px', fontWeight: 600 }}>
                          (You)
                        </span>
                      )}
                    </span>

                    {activity.google_calendar_link && !isCancelled && (
                      <a
                        href={activity.google_calendar_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(234, 88, 12, 0.08)',
                          color: 'var(--hub-orange, #ea580c)',
                          border: '1px solid rgba(234, 88, 12, 0.25)',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        + Google Calendar
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CREATE MODAL ────────────────────────────────────────────── */}
      {modalType === 'create' && (
        <Modal
          title="Schedule an Activity / Event"
          onClose={() => setModalType(null)}
          onSubmit={handleCreate}
          maxWidth="720px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Submit for Approval'}
              </button>
            </>
          }
        >
          {formBody}
        </Modal>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────────────── */}
      {modalType === 'edit' && (
        <Modal
          title={`Edit Activity: ${activeActivity?.title}`}
          onClose={() => setModalType(null)}
          onSubmit={handleEdit}
          maxWidth="720px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </>
          }
        >
          {formBody}
        </Modal>
      )}

      {/* ── RESCHEDULE MODAL ────────────────────────────────────────── */}
      {modalType === 'reschedule' && (
        <Modal
          title={`Reschedule: ${activeActivity?.title}`}
          onClose={() => setModalType(null)}
          onSubmit={handleReschedule}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Reschedule & Notify'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '1rem' }}>
            Updating the schedule will increment the revision counter and send updated calendar (.ics) and in-app notifications to all participants.
          </p>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>New Start Date & Time *</label>
            <input
              className="form-input"
              type="datetime-local"
              value={rescheduleStart}
              onChange={(e) => setRescheduleStart(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>New End Date & Time *</label>
            <input
              className="form-input"
              type="datetime-local"
              value={rescheduleEnd}
              onChange={(e) => setRescheduleEnd(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Reason for Rescheduling</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Lecturer unavailable, Room change requested by Dean..."
            />
          </div>
        </Modal>
      )}

      {/* ── CANCEL MODAL ────────────────────────────────────────────── */}
      {modalType === 'cancel' && (
        <Modal
          title={`Cancel Activity: ${activeActivity?.title}`}
          onClose={() => setModalType(null)}
          onSubmit={handleCancel}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Keep Activity
              </button>
              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Confirm Cancellation'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '1rem' }}>
            Are you sure you want to cancel this activity? All participants will receive a cancellation notice and calendar removal (.ics METHOD:CANCEL).
          </p>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Cancellation Reason</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide reason for cancellation..."
            />
          </div>
        </Modal>
      )}

      {/* ── DELETE MODAL ────────────────────────────────────────────── */}
      {modalType === 'delete' && activeActivity && (
        <Modal
          title="Delete Activity?"
          onClose={() => setModalType(null)}
          onSubmit={handleDelete}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Delete Activity'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '0.75rem' }}>
            You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{activeActivity.title}</strong>. This action cannot be undone.
          </p>
          {activeActivity.approval_status === 'APPROVED' && activeActivity.status !== 'CANCELLED' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Because this activity has already been approved, affected participants will receive the existing cancellation notification and calendar update before the record is removed.
            </p>
          )}
        </Modal>
      )}

      {/* ── PARTICIPANTS ROSTER MODAL ───────────────────────────────── */}
      {modalType === 'roster' && (
        <Modal
          title={`Participants Roster: ${activeActivity?.title}`}
          onClose={() => setModalType(null)}
          maxWidth="640px"
          footer={
            <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
              Close
            </button>
          }
        >
          {rosterLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 0.5rem', width: '28px', height: '28px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading roster...</div>
            </div>
          ) : rosterData ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '1rem',
                  background: 'rgba(59, 130, 246, 0.08)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong>{rosterData.total_unique_dms}</strong> DMS User{rosterData.total_unique_dms !== 1 ? 's' : ''}
                </div>
                {rosterData.total_external > 0 && (
                  <>
                    <span style={{ color: 'var(--text-secondary)' }}>•</span>
                    <div>
                      <strong>{rosterData.total_external}</strong> External Email{rosterData.total_external !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
                {rosterData.dms_participants?.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.email || `@${p.username}`}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'rgba(0,0,0,0.05)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {p.source}
                    </span>
                  </div>
                ))}

                {rosterData.external_participants?.map((ext, idx) => (
                  <div
                    key={`ext-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      fontSize: '13px',
                      background: 'rgba(139, 92, 246, 0.04)',
                    }}
                  >
                    <div style={{ color: '#7c3aed', fontWeight: 500 }}>{ext.email}</div>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#7c3aed',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      External Email
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '1rem' }}>
              Could not load roster.
            </div>
          )}
        </Modal>
      )}

      {/* ── QUICK ADD ACTIVITY TYPE MODAL ───────────────────────────── */}
      {modalType === 'addType' && (
        <Modal
          title="Create New Activity Type"
          onClose={() => setModalType('create')}
          onSubmit={handleCreateActivityType}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType('create')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={typeSaving}>
                {typeSaving ? <span className="spinner" /> : 'Create Type'}
              </button>
            </>
          }
        >
          {typeError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{typeError}</div>}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Type Name *</label>
            <input
              className="form-input"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Staff Briefing, Student Orientation, Project Defense"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Description (optional)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={newTypeDesc}
              onChange={(e) => setNewTypeDesc(e.target.value)}
              placeholder="Optional description of this activity category..."
            />
          </div>
        </Modal>
      )}

      {/* ── MANAGE ACTIVITY TYPES MODAL ─────────────────────────────── */}
      {modalType === 'manageTypes' && (
        <Modal
          title="Manage Activity Types"
          onClose={() => setModalType(null)}
          maxWidth="600px"
          footer={
            <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
              Done
            </button>
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Configure active departmental event types. Inactive types remain on historical records.
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { setTypeError(''); setNewTypeName(''); setNewTypeDesc(''); setModalType('addType'); }}
            >
              + Add Type
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {activityTypes.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-color, #f1f5f9)',
                  background: t.is_active ? 'transparent' : 'rgba(0,0,0,0.03)',
                  opacity: t.is_active ? 1 : 0.65,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t.name}</strong>
                    {!t.is_active && (
                      <span style={{ fontSize: '10px', background: '#e2e8f0', color: '#64748b', padding: '1px 6px', borderRadius: '8px' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    Used by {t.activity_count || 0} activities
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => handleToggleActivityType(t.id)}
                  >
                    {t.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  {(t.activity_count === 0 || !t.activity_count) && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => handleDeleteActivityType(t.id)}
                      title="Delete unused type"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── QUICK ADD GROUP MODAL ───────────────────────────────────── */}
      {modalType === 'addGroup' && (
        <Modal
          title="Create Participant Group"
          onClose={() => setModalType('create')}
          onSubmit={handleCreateGroup}
          maxWidth="560px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType('create')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={groupSaving}>
                {groupSaving ? <span className="spinner" /> : 'Create Group'}
              </button>
            </>
          }
        >
          {groupError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{groupError}</div>}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Group Name *</label>
            <input
              className="form-input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Finance Committee, Curriculum Reviewers"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Description (optional)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Purpose of this participant group..."
            />
          </div>

          <IndividualUserPicker
            users={users.filter((u) => u.is_active)}
            selected={newGroupMembers}
            onChange={setNewGroupMembers}
          />
        </Modal>
      )}

      {/* ── MANAGE PARTICIPANT GROUPS MODAL ─────────────────────────── */}
      {modalType === 'manageGroups' && (
        <Modal
          title="Manage Participant Groups"
          onClose={() => setModalType(null)}
          maxWidth="640px"
          footer={
            <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
              Done
            </button>
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Reusable groups for scheduling departmental activities.
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { setGroupError(''); setNewGroupName(''); setNewGroupDesc(''); setNewGroupMembers([]); setModalType('addGroup'); }}
            >
              + Create Group
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {recipientGroups.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-color, #f1f5f9)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{g.name}</strong>
                    <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '1px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {g.member_count || (g.members || []).length} members
                    </span>
                  </div>
                  {g.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {g.description}
                    </div>
                  )}
                  {g.member_usernames?.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      Members: {g.member_usernames.slice(0, 5).join(', ')}{g.member_usernames.length > 5 ? ` +${g.member_usernames.length - 5} more` : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={async () => {
                      if (!window.confirm(`Delete group "${g.name}"?`)) return;
                      try {
                        await api.delete(`recipient-groups/${g.id}/`);
                        await loadData();
                      } catch (err) {
                        alert(err.response?.data?.detail || 'Failed to delete group.');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Activities;
