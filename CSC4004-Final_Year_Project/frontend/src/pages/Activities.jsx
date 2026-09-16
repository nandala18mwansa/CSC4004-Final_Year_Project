import { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

const formatDate = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const Activities = () => {
  const { user } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal and Form States
  const [modalType, setModalType] = useState(null); // 'create', 'edit'
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadActivities = async () => {
    try {
      const response = await api.get('activities/');
      setActivities(response.data);
    } catch (err) {
      console.error('Failed to load activities', err);
      setError('Unable to fetch activities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setError('');
    setModalType('create');
  };

  const openEditModal = (activity) => {
    // Format datetime-local string (YYYY-MM-DDTHH:MM)
    const formatToLocalDatetime = (isoStr) => {
      if (!isoStr) return '';
      const date = new Date(isoStr);
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setActiveActivityId(activity.id);
    setTitle(activity.title);
    setDescription(activity.description);
    setStartDate(formatToLocalDatetime(activity.start_date));
    setEndDate(formatToLocalDatetime(activity.end_date));
    setError('');
    setModalType('edit');
  };

  const handleCreateActivity = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('activities/', {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
      });
      await loadActivities();
      setModalType(null);
    } catch (err) {
      console.error('Activity creation failed', err);
      setError(err.response?.data?.detail || 'Unable to schedule the activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditActivity = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`activities/${activeActivityId}/`, {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
      });
      await loadActivities();
      setModalType(null);
    } catch (err) {
      console.error('Activity edit failed', err);
      setError(err.response?.data?.detail || 'Unable to update the activity details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled activity?')) return;
    setError('');
    try {
      await api.delete(`activities/${activityId}/`);
      setActivities((current) => current.filter((act) => act.id !== activityId));
    } catch (err) {
      console.error('Activity deletion failed', err);
      setError('Unable to cancel activity.');
    }
  };

  const upcomingActivities = activities
    .slice()
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const now = new Date();
  const futureCount = activities.filter((a) => new Date(a.end_date) >= now).length;
  const completedCount = activities.filter((a) => new Date(a.end_date) < now).length;
  const myActivitiesCount = activities.filter((a) => a.organizer === user?.id).length;

  return (
    <div className="page-container">
      <div className="hubtoll-page-header">
        <div>
          <div className="hubtoll-module-eyebrow">
            <span className="hubtoll-module-badge-icon" style={{ background: '#10b981' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="hubtoll-module-badge-text">DEPARTMENT ACTIVITIES & SCHEDULING</span>
          </div>
          <h1 className="page-title">Activities & Event Scheduling</h1>
          <p className="page-subtitle">Coordinate departmental sessions, team meetings, milestones, and shared event bookings.</p>
        </div>
        <div>
          <button className="hubtoll-btn-primary" type="button" onClick={openCreateModal}>
            + Schedule Activity
          </button>
        </div>
      </div>

      {error && (
        <div className="hubtoll-alert-banner hubtoll-alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Hubtoll KPI Cards Row */}
      <div className="hubtoll-kpi-grid">
        <div className="hubtoll-kpi-card accent-green">
          <div className="hubtoll-kpi-label">UPCOMING SESSIONS</div>
          <div className="hubtoll-kpi-value" style={{ color: 'var(--color-success)' }}>{futureCount}</div>
          <div className="hubtoll-kpi-sub">Scheduled on active department calendar</div>
        </div>

        <div className="hubtoll-kpi-card accent-blue">
          <div className="hubtoll-kpi-label">TOTAL SESSIONS</div>
          <div className="hubtoll-kpi-value">{activities.length}</div>
          <div className="hubtoll-kpi-sub">Total recorded calendar operations</div>
        </div>

        <div className="hubtoll-kpi-card accent-purple">
          <div className="hubtoll-kpi-label">ORGANIZED BY YOU</div>
          <div className="hubtoll-kpi-value">{myActivitiesCount}</div>
          <div className="hubtoll-kpi-sub">Activities you are currently leading</div>
        </div>

        <div className="hubtoll-kpi-card accent-orange">
          <div className="hubtoll-kpi-label">COMPLETED MILESTONES</div>
          <div className="hubtoll-kpi-value">{completedCount}</div>
          <div className="hubtoll-kpi-sub">Archived departmental activities</div>
        </div>
      </div>

      <div className="content-grid content-grid-2">
        {loading ? (
          <div className="empty-state" style={{ gridColumn: 'span 2' }}>
            <div className="spinner spinner-lg" />
            <p>Loading activities...</p>
          </div>
        ) : upcomingActivities.length ? (
          upcomingActivities.map((activity) => {
            const isOrganizer = activity.organizer === user?.id;
            const canManage = isOrganizer || user?.role === 'ADMIN' || user?.role === 'MANAGER';

            return (
              <div key={activity.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>{activity.title}</h3>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', minHeight: 'unset' }}
                          onClick={() => openEditModal(activity)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.25rem 0.5rem', minHeight: 'unset' }}
                          onClick={() => handleDeleteActivity(activity.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '0.75rem' }}>
                    📅 {formatDate(activity.start_date)} — {formatDate(activity.end_date)}
                  </p>
                  <p style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{activity.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                    Organizer: {activity.organizer_username || activity.organizer} {isOrganizer && '(You)'}
                  </span>
                  <span className="badge badge-warning">Planned Event</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel empty-state" style={{ gridColumn: 'span 2' }}>
            <h3>No scheduled activities yet</h3>
            <p>Use the scheduler to add your first department event.</p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT ACTIVITY MODAL */}
      {(modalType === 'create' || modalType === 'edit') && (
        <Modal
          title={modalType === 'create' ? 'Schedule an activity' : 'Edit scheduled activity'}
          onClose={() => setModalType(null)}
          onSubmit={modalType === 'create' ? handleCreateActivity : handleEditActivity}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : (modalType === 'create' ? 'Schedule' : 'Save Changes')}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Planning Session / Team Meeting"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide agenda or details..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date & Time</label>
            <input
              className="form-input"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Date & Time</label>
            <input
              className="form-input"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Activities;
