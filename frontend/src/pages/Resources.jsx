import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContext';

const statusClass = {
  AVAILABLE: 'badge badge-approved',
  IN_USE: 'badge badge-in-use',
  MAINTENANCE: 'badge badge-maintenance',
};

const categoryLabels = {
  ROOMS: '🏢 Rooms & Venues',
  HARDWARE: '💻 IT & Hardware',
  VEHICLES: '🚗 Vehicles',
  AV: '🎥 Audio / Visual',
  LAB: '🔬 Laboratory & Equipment',
  GENERAL: '📦 General Assets',
};

const Resources = () => {
  const { user } = useContext(AuthContext);
  const [resources, setResources] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'add_resource', 'edit_resource', 'book_resource'
  const [saving, setSaving] = useState(false);

  // Resource Form state
  const [activeResourceId, setActiveResourceId] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('AVAILABLE');

  // Book Resource state
  const [bookResourceId, setBookResourceId] = useState('');
  const [bookActivityId, setBookActivityId] = useState('');
  const [bookStartTime, setBookStartTime] = useState('');
  const [bookEndTime, setBookEndTime] = useState('');

  const loadResourcesAndAllocations = async () => {
    try {
      const [resourceRes, allocationRes, activityRes] = await Promise.all([
        api.get('resources/'),
        api.get('allocations/'),
        api.get('activities/'),
      ]);
      setResources(resourceRes.data);
      setAllocations(allocationRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      console.error('Failed to load resources', err);
      setError('Unable to fetch resources or allocations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResourcesAndAllocations();
    const interval = setInterval(loadResourcesAndAllocations, 5000);
    return () => clearInterval(interval);
  }, []);

  const openAddResource = () => {
    setName('');
    setCategory('GENERAL');
    setDescription('');
    setStatus('AVAILABLE');
    setError('');
    setModalType('add_resource');
  };

  const openEditResource = (resource) => {
    setActiveResourceId(resource.id);
    setName(resource.name);
    setCategory(resource.category || 'GENERAL');
    setDescription(resource.description);
    setStatus(resource.status);
    setError('');
    setModalType('edit_resource');
  };

  const openBookResource = (resourceId = '') => {
    setBookResourceId(resourceId);
    setBookActivityId('');
    setBookStartTime('');
    setBookEndTime('');
    setError('');
    setModalType('book_resource');
  };

  const handleCreateResource = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('resources/', {
        name,
        category,
        description,
        status,
      });
      await loadResourcesAndAllocations();
      setModalType(null);
    } catch (err) {
      console.error('Resource creation failed', err);
      setError(err.response?.data?.detail || 'Unable to add resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditResource = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`resources/${activeResourceId}/`, {
        name,
        category,
        description,
        status,
      });
      await loadResourcesAndAllocations();
      setModalType(null);
    } catch (err) {
      console.error('Resource edit failed', err);
      setError(err.response?.data?.detail || 'Unable to edit resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource asset?')) return;
    setError('');
    try {
      await api.delete(`resources/${resourceId}/`);
      setResources((current) => current.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error('Resource deletion failed', err);
      setError('Unable to delete resource.');
    }
  };

  const handleBookResource = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('allocations/', {
        resource: parseInt(bookResourceId),
        activity: bookActivityId ? parseInt(bookActivityId) : null,
        start_time: bookStartTime,
        end_time: bookEndTime,
      });
      await loadResourcesAndAllocations();
      setModalType(null);
    } catch (err) {
      console.error('Resource booking failed', err);
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Unable to book resource. Ensure times are correct.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAllocation = async (allocationId) => {
    if (!window.confirm('Are you sure you want to cancel this booking/allocation?')) return;
    setError('');
    try {
      await api.delete(`allocations/${allocationId}/`);
      setAllocations((current) => current.filter((alloc) => alloc.id !== allocationId));
    } catch (err) {
      console.error('Allocation deletion failed', err);
      setError('Unable to cancel booking.');
    }
  };

  const handleUpdateResourceStatus = async (resourceId, newStatus) => {
    setError('');
    try {
      await api.patch(`resources/${resourceId}/`, { status: newStatus });
      setResources((current) =>
        current.map((res) => (res.id === resourceId ? { ...res, status: newStatus } : res))
      );
    } catch (err) {
      console.error('Failed to update resource status', err);
      setError('Unable to change resource status.');
    }
  };

  const isStaff = user?.role === 'STAFF';

  // Filtering resources categorically
  const filteredResources = resources.filter((res) => {
    const matchesCategory = selectedCategory === 'ALL' || res.category === selectedCategory;
    const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const upcomingAllocations = allocations
    .slice()
    .filter((allocation) => new Date(allocation.end_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const myActivities = activities.filter((act) => act.organizer === user?.id);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Resources & Assets</h1>
          <p className="page-subtitle">Categorized asset inventory, live availability, and booking management.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" type="button" onClick={() => openBookResource('')}>
            + Book Resource
          </button>
          {!isStaff && (
            <button className="btn btn-primary" type="button" onClick={openAddResource}>
              + Add Resource
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </p>
      )}

      {/* SEARCH AND CATEGORY CONTROLS */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search resources by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All Categories ({resources.length})
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const count = resources.filter((r) => r.category === key).length;
            return (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${selectedCategory === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(key)}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* RESOURCE CARDS GRID */}
      <div className="content-grid content-grid-2">
        {loading ? (
          <div className="empty-state" style={{ gridColumn: 'span 2' }}>
            <div className="spinner spinner-lg" />
            <p>Loading asset inventory...</p>
          </div>
        ) : filteredResources.length ? (
          filteredResources.map((resource) => (
            <div key={resource.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="badge badge-info" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                      {categoryLabels[resource.category] || resource.category || 'General Asset'}
                    </span>
                    <h3>{resource.name}</h3>
                  </div>
                  <span className={statusClass[resource.status] || 'badge badge-info'}>
                    {resource.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>{resource.description}</p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                {resource.status === 'AVAILABLE' ? (
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => openBookResource(resource.id)}>
                    Book asset
                  </button>
                ) : (
                  <span className="badge badge-info" style={{ background: 'transparent', border: 'none' }}>Unavailable for booking</span>
                )}

                {!isStaff && (
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      style={{ padding: '0.25rem 1.5rem 0.25rem 0.5rem', fontSize: 'var(--font-xs)', width: 'auto', minHeight: 'unset', height: '30px' }}
                      value={resource.status}
                      onChange={(e) => handleUpdateResourceStatus(resource.id, e.target.value)}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_USE">In Use</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.25rem 0.5rem', minHeight: 'unset' }}
                      onClick={() => openEditResource(resource)}
                      title="Edit Resource"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.25rem 0.5rem', minHeight: 'unset' }}
                      onClick={() => handleDeleteResource(resource.id)}
                      title="Delete Resource"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel empty-state" style={{ gridColumn: 'span 2' }}>
            <h3>No resources found</h3>
            <p>Try adjusting your search criteria or category filters.</p>
          </div>
        )}
      </div>

      {/* UPCOMING ALLOCATIONS TABLE */}
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title" style={{ fontSize: 'var(--font-lg)' }}>Upcoming allocations & bookings</h2>
            <p className="page-subtitle">View booked resources and active usage schedules.</p>
          </div>
        </div>

        {upcomingAllocations.length ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Allocated to</th>
                  <th>Linked Event</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAllocations.map((allocation) => {
                  const isBookingOwner = allocation.allocated_to === user?.id;
                  const canCancel = isBookingOwner || user?.role === 'ADMIN' || user?.role === 'MANAGER';

                  return (
                    <tr key={allocation.id}>
                      <td><strong>{allocation.resource_name || allocation.resource}</strong></td>
                      <td>{allocation.allocated_to_username || `ID: ${allocation.allocated_to}`} {isBookingOwner && '(You)'}</td>
                      <td>{allocation.activity_title || '—'}</td>
                      <td>{new Date(allocation.start_time).toLocaleString()}</td>
                      <td>{new Date(allocation.end_time).toLocaleString()}</td>
                      <td>
                        {canCancel ? (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => handleCancelAllocation(allocation.id)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="badge badge-info" style={{ background: 'transparent', border: 'none' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No upcoming allocations scheduled.</p>
          </div>
        )}
      </div>

      {/* ADD / EDIT RESOURCE MODAL */}
      {(modalType === 'add_resource' || modalType === 'edit_resource') && (
        <Modal
          title={modalType === 'add_resource' ? 'Add a new resource' : 'Edit resource details'}
          onClose={() => setModalType(null)}
          onSubmit={modalType === 'add_resource' ? handleCreateResource : handleEditResource}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : (modalType === 'add_resource' ? 'Add Resource' : 'Save Changes')}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Resource name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Conference Room A / Test Laptop"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ROOMS">🏢 Rooms & Venues</option>
              <option value="HARDWARE">💻 IT & Hardware</option>
              <option value="VEHICLES">🚗 Vehicles</option>
              <option value="AV">🎥 Audio / Visual</option>
              <option value="LAB">🔬 Laboratory & Equipment</option>
              <option value="GENERAL">📦 General Office Assets</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Projector equipped, fits 10 people..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In use</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </Modal>
      )}

      {/* BOOK RESOURCE MODAL */}
      {modalType === 'book_resource' && (
        <Modal
          title="Book department resource"
          onClose={() => setModalType(null)}
          onSubmit={handleBookResource}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Confirm Booking'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Resource</label>
            <select
              className="form-select"
              value={bookResourceId}
              onChange={(e) => setBookResourceId(e.target.value)}
              required
            >
              <option value="">Select resource to book...</option>
              {resources.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.name} ({categoryLabels[res.category] || res.category} - {res.status.toLowerCase().replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Associate with My Event (Optional)</label>
            <select
              className="form-select"
              value={bookActivityId}
              onChange={(e) => setBookActivityId(e.target.value)}
            >
              <option value="">No linked event</option>
              {myActivities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={bookStartTime}
              onChange={(e) => setBookStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={bookEndTime}
              onChange={(e) => setBookEndTime(e.target.value)}
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Resources;
