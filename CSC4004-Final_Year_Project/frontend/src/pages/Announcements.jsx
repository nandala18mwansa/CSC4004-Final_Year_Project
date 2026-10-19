import { useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContextValue';

const list = (response) => Array.isArray(response?.data) ? response.data : (response?.data?.results || []);

export default function Announcements() {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [announcementCategories, setAnnouncementCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: '', message: '', category: 'GENERAL', priority: 'NORMAL', expires_at: '', include_all_staff: false, shared_modules: [], audience_users: [], audience_groups: [], audience_categories: [] });
  const canCreate = Boolean(user?.is_superuser || user?.has_announcement_create);
  const canPublish = Boolean(user?.is_superuser || user?.has_announcement_publish);
  const canArchive = Boolean(user?.is_superuser || user?.has_announcement_archive);
  const canManage = Boolean(user?.is_superuser || user?.has_announcement_manage_all);
  const pageSize = 6;

  const visibleItems = [...items]
    .filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
    .filter((item) => `${item.title} ${item.message} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.publish_at || b.updated_at || b.created_at || 0) - new Date(a.publish_at || a.updated_at || a.created_at || 0));
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const pageItems = visibleItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage((current) => Math.min(current, pageCount)); }, [pageCount]);

  const load = useCallback(async () => {
    try {
      const announcements = await api.get('announcements/');
      setItems(list(announcements));
      if (canCreate) {
        const [userGroups, userCategories, staff, announcementCategoryResponse] = await Promise.all([
          api.get('recipient-groups/?all=true'), api.get('user-categories/'), api.get('users/'), api.get('announcement-categories/'),
        ]);
        setGroups(list(userGroups)); setCategories(list(userCategories)); setUsers(list(staff)); setAnnouncementCategories(list(announcementCategoryResponse));
      } else {
        setGroups([]); setCategories([]); setUsers([]); setAnnouncementCategories([]);
      }
    } catch (err) { setError(err.response?.data?.detail || 'Unable to load announcements.'); }
  }, [canCreate]);
  useEffect(() => { load(); }, [load]);

  const change = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const openDraft = (item = null) => {
    setError('');
    setEditingId(item?.id || null);
    setExistingAttachments(item?.attachments || []);
    setPendingFiles([]);
    setShowCategoryForm(false);
    setNewCategoryName('');
    setDraft(item ? {
      title: item.title, message: item.message, category: item.category, priority: item.priority,
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : '', include_all_staff: item.include_all_staff,
      audience_users: item.audience_users || [], audience_groups: item.audience_groups || [], audience_categories: item.audience_categories || [],
    } : { title: '', message: '', category: announcementCategories.find((item) => item.name === 'GENERAL')?.name || announcementCategories[0]?.name || 'GENERAL', priority: 'NORMAL', expires_at: '', include_all_staff: false, audience_users: [], audience_groups: [], audience_categories: [] });
    setModalOpen(true);
  };
  const save = async (publish = false) => {
    setSaving(true); setError('');
    try {
      const payload = { ...draft, shared_modules: [], expires_at: draft.expires_at || null };
      const saved = editingId ? await api.put(`announcements/${editingId}/`, payload) : await api.post('announcements/', payload);
      setEditingId(saved.data.id);
      if (pendingFiles.length) {
        const formData = new FormData();
        pendingFiles.forEach((file) => formData.append('files', file));
        const uploaded = await api.post(`announcements/${saved.data.id}/attachments/`, formData);
        setExistingAttachments((current) => [...current, ...list(uploaded)]);
        setPendingFiles([]);
      }
      if (publish) await api.post(`announcements/${saved.data.id}/publish/`, {});
      setEditingId(null);
      setModalOpen(false); setExistingAttachments([]); setPendingFiles([]); setDraft({ title: '', message: '', category: 'GENERAL', priority: 'NORMAL', expires_at: '', include_all_staff: false, audience_users: [], audience_groups: [], audience_categories: [] });
      await load();
    } catch (err) { setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Unable to save announcement.'); }
    finally { setSaving(false); }
  };
  const action = async (id, name) => {
    setError('');
    try { await api.post(`announcements/${id}/${name}/`, {}); await load(); }
    catch (err) { setError(err.response?.data?.detail || 'Announcement action failed.'); }
  };

  const createCategory = async () => {
    setError('');
    try {
      const response = await api.post('announcement-categories/', { name: newCategoryName });
      setAnnouncementCategories((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      change('category', response.data.name);
      setNewCategoryName(''); setShowCategoryForm(false);
    } catch (err) { setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Unable to create announcement category.'); }
  };

  const selectAttachments = (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    const accepted = new Set(['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'mp3', 'mp4']);
    const invalid = files.find((file) => !accepted.has(file.name.split('.').pop().toLowerCase()) || file.size > 50 * 1024 * 1024);
    if (invalid) { setError(`${invalid.name}: choose a supported document, image, audio, or video file up to 50 MB.`); return; }
    if (existingAttachments.length + pendingFiles.length + files.length > 5) { setError('An announcement can have at most five attachments.'); return; }
    setError(''); setPendingFiles((current) => [...current, ...files]);
  };

  const removeExistingAttachment = async (attachment) => {
    if (!editingId) return;
    setError('');
    try {
      await api.delete(`announcements/${editingId}/attachments/${attachment.id}/`);
      setExistingAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (err) { setError(err.response?.data?.detail || 'Unable to remove attachment.'); }
  };

  const downloadAttachment = async (attachment) => {
    setError('');
    try {
      const result = await api.download(attachment.download_url);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url; link.download = result.filename || attachment.original_filename;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.response?.data?.detail || 'Unable to download this attachment.'); }
  };

  return <div className="page-container">
    <div className="hubtoll-page-header"><div><div className="hubtoll-module-eyebrow"><span className="hubtoll-module-badge-text">DEPARTMENT COMMUNICATIONS</span></div><h1 className="page-title">Announcements</h1><p className="page-subtitle">{canCreate ? 'Share important updates with selected staff groups and departments.' : 'Updates shared with you by your department.'}</p></div>{canCreate && <button className="hubtoll-btn-primary" onClick={() => openDraft()}>New Announcement</button>}</div>
    {error && <div className="hubtoll-alert-banner hubtoll-alert-error">{error}</div>}
    {items.length > 0 && <section className="announcement-inbox">
      <div className="announcement-inbox-toolbar">
        <label className="announcement-search">Search updates<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search title or message" /></label>
        {(canCreate || canManage) && <label className="announcement-status-filter">Status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="ALL">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Drafts</option><option value="ARCHIVED">Archived</option></select></label>}
        <span className="announcement-result-count">{visibleItems.length} update{visibleItems.length === 1 ? '' : 's'}</span>
      </div>
      <div className="announcement-list">{pageItems.map((item) => <article className="announcement-list-item" key={item.id}>
        <div className="announcement-list-heading"><div className="announcement-badges"><span className={`badge badge-${String(item.status).toLowerCase()}`}>{item.status}</span><span className="badge badge-info">{item.priority}</span><span className="announcement-category">{item.category}</span></div><time>{item.publish_at ? new Date(item.publish_at).toLocaleString() : 'Draft'}</time></div>
        <h2>{item.title}</h2>
        {expandedId === item.id ? <>
          <p className="announcement-full-message">{item.message}</p>
          {!!item.attachments?.length && <div className="announcement-attachments"><strong>Attachments</strong>{item.attachments.map((attachment) => <button className="announcement-attachment-link" type="button" key={attachment.id} onClick={() => downloadAttachment(attachment)}>{attachment.original_filename}<span>{Math.max(1, Math.ceil(attachment.size / 1024))} KB · Download</span></button>)}</div>}
          <button className="announcement-read-more" type="button" aria-expanded="true" onClick={() => setExpandedId(null)}>Show less</button>
        </> : <>
          <p className="announcement-message-preview">{item.message}</p>
          <button className="announcement-read-more" type="button" aria-expanded="false" onClick={() => setExpandedId(item.id)}>Read full announcement</button>
        </>}
        <div className="announcement-item-footer"><small>By {item.created_by_username}{canManage ? ` · Email sent ${item.delivery_summary?.sent || 0}, failed ${item.delivery_summary?.failed || 0}` : ''}</small>
          <div className="finance-actions">{item.status === 'DRAFT' && canCreate && (canManage || item.created_by === user?.id) && <button className="btn btn-secondary" onClick={() => openDraft(item)}>Edit draft</button>}{item.status === 'DRAFT' && canPublish && <button className="hubtoll-btn-primary" onClick={() => action(item.id, 'publish')}>Publish</button>}{item.status === 'PUBLISHED' && (canArchive || canManage) && <button className="btn btn-secondary" onClick={() => action(item.id, 'archive')}>Archive</button>}{canManage && item.delivery_summary?.failed > 0 && <button className="btn btn-secondary" onClick={() => action(item.id, 'retry-delivery')}>Retry failed email</button>}</div>
        </div>
      </article>)}</div>
      {visibleItems.length === 0 && <div className="announcement-empty">No updates match your search or status filter.</div>}
      {pageCount > 1 && <div className="hubtoll-pagination"><button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div>}
    </section>}
    {items.length === 0 && <div className="hubtoll-card announcement-empty">No announcements are available to your account.</div>}
    <Modal className="announcement-modal" maxWidth="760px" isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? 'Edit Announcement Draft' : 'Create Announcement'} footer={<div className="announcement-modal-actions"><button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); setEditingId(null); }}>Cancel</button><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => save(false)}>Save Draft</button>{canPublish && <button type="button" className="hubtoll-btn-primary" disabled={saving} onClick={() => save(true)}>Publish</button>}</div>}>
      <div className="announcement-form">
        <section className="announcement-section">
          <div className="announcement-section-heading"><h3>Announcement details</h3><p>Write the update that staff will receive.</p></div>
          <label className="announcement-field">Title<input className="form-input" value={draft.title} onChange={(e) => change('title', e.target.value)} maxLength={200} placeholder="A clear, short heading" /></label>
          <label className="announcement-field">Message<textarea className="form-input" rows={5} value={draft.message} onChange={(e) => change('message', e.target.value)} placeholder="Share the information staff need to know" /></label>
          <div className="announcement-field-grid">
            <div className="announcement-category-field"><label className="announcement-field">Category<select className="form-select" value={draft.category} onChange={(e) => change('category', e.target.value)}><option value={draft.category}>{draft.category}</option>{announcementCategories.filter((item) => item.name !== draft.category).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><button type="button" className="announcement-add-category" onClick={() => setShowCategoryForm((value) => !value)}>{showCategoryForm ? 'Cancel' : '+ Add category'}</button></div>
            <label className="announcement-field">Priority<select className="form-select" value={draft.priority} onChange={(e) => change('priority', e.target.value)}><option>NORMAL</option><option>IMPORTANT</option><option>URGENT</option></select></label>
          </div>
          {showCategoryForm && <div className="announcement-new-category"><label className="announcement-field">New category<input className="form-input" maxLength={40} value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="e.g. Staff meeting" /></label><button type="button" className="btn btn-secondary" disabled={!newCategoryName.trim()} onClick={createCategory}>Create category</button></div>}
          <label className="announcement-field">Expiry <span className="announcement-optional">Optional</span><input className="form-input" type="datetime-local" value={draft.expires_at} onChange={(e) => change('expires_at', e.target.value)} /></label>
          <div className="announcement-attachment-field"><div><strong>Attachments</strong><p>PDF, images, Word, PowerPoint, Excel, CSV, MP3, or MP4; up to five files, 50 MB each.</p></div><label className="announcement-attach-button">Choose files<input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.mp3,.mp4,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,audio/mpeg,video/mp4" multiple onChange={selectAttachments} /></label></div>
          {(existingAttachments.length > 0 || pendingFiles.length > 0) && <ul className="announcement-selected-files">
            {existingAttachments.map((attachment) => <li key={`existing-${attachment.id}`}><span>{attachment.original_filename}</span><button type="button" onClick={() => removeExistingAttachment(attachment)}>Remove</button></li>)}
            {pendingFiles.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}><span>{file.name} <small>({Math.max(1, Math.ceil(file.size / 1024))} KB)</small></span><button type="button" onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>Remove</button></li>)}
          </ul>}
        </section>

        <section className="announcement-section">
          <div className="announcement-section-heading"><h3>Audience</h3><p>Choose all staff, or select one or more groups, departments, and people.</p></div>
          <label className="announcement-all-staff"><input type="checkbox" checked={draft.include_all_staff} onChange={(e) => change('include_all_staff', e.target.checked)} /><span><strong>Send to all active staff</strong><small>Includes every active staff account.</small></span></label>
          <div className="announcement-audience-list">
            {[
              { key: 'audience_groups', title: 'Staff groups', entries: groups.map((item) => ({ id: item.id, label: item.name })) },
              { key: 'audience_categories', title: 'Departments / categories', entries: categories.map((item) => ({ id: item.id, label: item.name })) },
              { key: 'audience_users', title: 'Individual staff', entries: users.map((person) => ({ id: person.id, label: person.username, detail: person.department })) },
            ].map(({ key, title, entries }) => <details className="announcement-audience" key={key}>
              <summary><span>{title}</span><span className="announcement-selection-count">{draft[key].length} selected</span></summary>
              <div className="announcement-audience-options">
                {entries.length ? entries.map((entry) => <label className="announcement-audience-option" key={entry.id}><input type="checkbox" checked={draft[key].includes(entry.id)} onChange={(event) => change(key, event.target.checked ? [...draft[key], entry.id] : draft[key].filter((id) => id !== entry.id))} /><span>{entry.label}{entry.detail && <small>{entry.detail}</small>}</span></label>) : <p className="announcement-empty-options">No {title.toLowerCase()} available.</p>}
              </div>
            </details>)}
          </div>
          <p className="announcement-help">Published emails include the announcement text and any attachments. Recipients can open the announcement in the DMS.</p>
        </section>
      </div>
    </Modal>
  </div>;
}
