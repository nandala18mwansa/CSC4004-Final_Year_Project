import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContext';

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Activities</h1>
          <p className="page-subtitle">Manage team events, meetings, and project planning sessions.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreateModal}>
          + Schedule Activity
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 'var(--radius-md)' }}>{error}</p>}

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
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={modalType === 'create' ? handleCreateActivity : handleEditActivity} disabled={saving}>
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
