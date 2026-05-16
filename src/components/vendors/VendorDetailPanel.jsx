import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, MessageSquare, FileText, CheckSquare, Plus, Trash2,
  Phone, Mail, Globe, MapPin, Upload, ExternalLink,
  CheckCircle2, Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const VendorLog = base44.entities.VendorLog;
const VendorTask = base44.entities.VendorTask;

const labelStyle = {
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif",
  display: 'block', marginBottom: 6,
};

const PRIORITY_COLORS = {
  low: '#444444', medium: '#E03553', high: '#E03553',
};

const LOG_TYPE_LABELS = {
  email: '✉', call: '✆', meeting: '⊙', note: '✎', document: '⊘',
};

export default function VendorDetailPanel({ vendor, onClose }) {
  const [tab, setTab] = useState('comms');
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'note', subject: '', body: '', document_type: 'contract', document_url: '', document_name: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'medium', notes: '' });

  useEffect(() => { loadLogs(); loadTasks(); }, [vendor.id]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const data = await VendorLog.filter({ vendor_id: vendor.id }, '-created_date');
    setLogs(data);
    setLoadingLogs(false);
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    const data = await VendorTask.filter({ vendor_id: vendor.id }, 'due_date');
    setTasks(data);
    setLoadingTasks(false);
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogForm(f => ({ ...f, document_url: file_url, document_name: file.name, type: 'document' }));
    setShowLogForm(true);
    setUploadingDoc(false);
    toast.success('File uploaded');
  };

  const submitLog = async () => {
    if (!logForm.subject.trim()) return toast.error('Subject is required');
    await VendorLog.create({ ...logForm, vendor_id: vendor.id, logged_at: new Date().toISOString() });
    setLogForm({ type: 'note', subject: '', body: '', document_type: 'contract', document_url: '', document_name: '' });
    setShowLogForm(false);
    loadLogs();
    toast.success('Entry saved');
  };

  const deleteLog = async (id) => { await VendorLog.delete(id); loadLogs(); };

  const submitTask = async () => {
    if (!taskForm.title.trim()) return toast.error('Title is required');
    await VendorTask.create({ ...taskForm, vendor_id: vendor.id });
    setTaskForm({ title: '', due_date: '', priority: 'medium', notes: '' });
    setShowTaskForm(false);
    loadTasks();
    toast.success('Task added');
  };

  const toggleTask = async (task) => { await VendorTask.update(task.id, { completed: !task.completed }); loadTasks(); };
  const deleteTask = async (id) => { await VendorTask.delete(id); loadTasks(); };

  const completedTasks = tasks.filter(t => t.completed).length;

  const inputStyle = {
    width: '100%', fontSize: 12, background: 'transparent', outline: 'none',
    border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '5px 0',
    fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A',
  };

  const TABS = [
    { key: 'comms', label: 'Communications', icon: MessageSquare },
    { key: 'docs', label: 'Documents', icon: FileText },
    { key: 'tasks', label: `Tasks (${completedTasks}/${tasks.length})`, icon: CheckSquare },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendor.name}</span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '2px 8px', borderRadius: 999,
                border: '1px solid rgba(10,10,10,0.2)', color: '#444444',
              }}>{vendor.category}</span>
              {vendor.status === 'booked' && (
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '2px 8px', borderRadius: 999,
                  background: '#DDF762', color: '#0A1930', border: 'none',
                }}>Booked</span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
              {vendor.contact_person && (
                <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendor.contact_person}</span>
              )}
              {vendor.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Phone size={10} style={{ color: 'rgba(10,10,10,0.4)' }} />{vendor.phone}
                </span>
              )}
              {vendor.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Mail size={10} style={{ color: 'rgba(10,10,10,0.4)' }} />{vendor.email}
                </span>
              )}
              {vendor.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <MapPin size={10} style={{ color: 'rgba(10,10,10,0.4)' }} />{vendor.address}
                </span>
              )}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: 'none', fontWeight: 600 }}>
                  <Globe size={10} />Website<ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4, marginLeft: 8, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', paddingLeft: 20 }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none',
                borderBottom: tab === key ? '2px solid #E03553' : '2px solid transparent',
                color: tab === key ? '#0A0A0A' : '#444444', cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── Communications ── */}
          {tab === 'comms' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setShowLogForm(v => !v)} className="btn-editorial-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={12} />Log entry
                </button>
              </div>

              {showLogForm && (
                <div style={{ background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.08)', padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select style={{ ...inputStyle }} value={logForm.type} onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}>
                        {['email','call','meeting','note'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Subject</label>
                      <input style={inputStyle} placeholder="e.g. Pricing call" value={logForm.subject} onChange={e => setLogForm(f => ({ ...f, subject: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea style={{ ...inputStyle, height: 72, resize: 'none', borderBottom: 'none', border: '1px solid rgba(10,10,10,0.18)', padding: '6px 8px', fontSize: 12 }} placeholder="Details…" value={logForm.body} onChange={e => setLogForm(f => ({ ...f, body: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ fontSize: 11 }} onClick={submitLog}>Save</button>
                    <button className="btn-editorial-secondary" style={{ fontSize: 11 }} onClick={() => setShowLogForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {loadingLogs
                ? <p style={{ fontSize: 12, color: '#444444', textAlign: 'center', padding: '32px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</p>
                : logs.filter(l => l.type !== 'document').length === 0
                  ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <MessageSquare size={24} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No communication logged yet</p>
                    </div>
                  ) : (
                    <div>
                      {logs.filter(l => l.type !== 'document').map((log, i) => (
                        <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{LOG_TYPE_LABELS[log.type] || '•'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{log.subject}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {new Date(log.logged_at || log.created_date).toLocaleDateString()}
                                </span>
                                <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', display: 'flex', padding: 2 }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                            {log.body && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '3px 0 0', lineHeight: 1.5 }}>{log.body}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              }
            </>
          )}

          {/* ── Documents ── */}
          {tab === 'docs' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '7px 16px', borderRadius: 999,
                  background: 'rgba(10,10,10,0.08)', color: '#0A0A0A', cursor: 'pointer',
                  opacity: uploadingDoc ? 0.5 : 1, pointerEvents: uploadingDoc ? 'none' : 'auto',
                }}>
                  <Upload size={12} />
                  {uploadingDoc ? 'Uploading…' : 'Upload document'}
                  <input type="file" style={{ display: 'none' }} onChange={handleUploadDoc} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </label>
              </div>

              {showLogForm && logForm.document_url && (
                <div style={{ background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.08)', padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 12px' }}>
                    📄 {logForm.document_name}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Document type</label>
                      <select style={inputStyle} value={logForm.document_type} onChange={e => setLogForm(f => ({ ...f, document_type: e.target.value }))}>
                        {['contract','invoice','quote','receipt','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Label</label>
                      <input style={inputStyle} placeholder="e.g. Signed contract" value={logForm.subject} onChange={e => setLogForm(f => ({ ...f, subject: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ fontSize: 11 }} onClick={submitLog}>Save</button>
                    <button className="btn-editorial-secondary" style={{ fontSize: 11 }} onClick={() => { setShowLogForm(false); setLogForm(f => ({ ...f, document_url: '', document_name: '' })); }}>Cancel</button>
                  </div>
                </div>
              )}

              {loadingLogs
                ? <p style={{ fontSize: 12, color: '#444444', textAlign: 'center', padding: '32px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</p>
                : logs.filter(l => l.type === 'document').length === 0
                  ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <FileText size={24} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div>
                      {logs.filter(l => l.type === 'document').map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{log.subject}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                              {log.document_type && (
                                <span style={{
                                  fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '1px 7px', borderRadius: 999,
                                  border: '1px solid rgba(10,10,10,0.15)', color: '#444444',
                                }}>{log.document_type}</span>
                              )}
                              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {new Date(log.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {log.document_url && (
                              <a href={log.document_url} target="_blank" rel="noreferrer" style={{ color: '#E03553', display: 'flex' }}>
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', display: 'flex', padding: 2 }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              }
            </>
          )}

          {/* ── Tasks ── */}
          {tab === 'tasks' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setShowTaskForm(v => !v)} className="btn-editorial-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={12} />Add task
                </button>
              </div>

              {showTaskForm && (
                <div style={{ background: '#FAFAFA', border: '1px solid rgba(10,10,10,0.08)', padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Task title</label>
                      <input style={inputStyle} placeholder="e.g. Send signed contract" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Due date</label>
                      <input type="date" style={inputStyle} value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Priority</label>
                      <select style={inputStyle} value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ fontSize: 11 }} onClick={submitTask}>Save</button>
                    <button className="btn-editorial-secondary" style={{ fontSize: 11 }} onClick={() => setShowTaskForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {loadingTasks
                ? <p style={{ fontSize: 12, color: '#444444', textAlign: 'center', padding: '32px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</p>
                : tasks.length === 0
                  ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <CheckSquare size={24} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No tasks yet — add one to track follow-ups</p>
                    </div>
                  ) : (
                    <div>
                      {tasks.map(task => (
                        <div key={task.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
                          borderBottom: '1px solid rgba(10,10,10,0.06)',
                          opacity: task.completed ? 0.5 : 1,
                        }}>
                          <button onClick={() => toggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 1, padding: 0, flexShrink: 0, display: 'flex' }}>
                            {task.completed
                              ? <CheckCircle2 size={16} style={{ color: '#6b7700' }} />
                              : <Circle size={16} style={{ color: 'rgba(10,10,10,0.25)' }} />
                            }
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
                              color: task.completed ? '#444444' : '#0A0A0A',
                              textDecoration: task.completed ? 'line-through' : 'none',
                            }}>{task.title}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                              {task.priority && (
                                  {task.priority}
                                </span>
                              )}
                              {task.due_date && (
                                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  Due {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {task.notes && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '3px 0 0' }}>{task.notes}</p>}
                          </div>
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', display: 'flex', padding: 2, flexShrink: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}
