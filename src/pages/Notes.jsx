import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Edit3, Clock, X, Lightbulb, ListTodo, Loader2, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import toast from 'react-hot-toast';
import SuggestionsModal from "../components/notes/SuggestionsModal";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import { getMyRecords } from "@/lib/resolveMyWedding";
const Task = base44.entities.Task;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

const PRIORITY_STYLES = {
  urgent: { background: "#E03553", color: "#FFFFFF" },
  high:   { background: "#803D81", color: "#FFFFFF" },
  medium: { background: "transparent", color: "#6B2CAE", border: "1px solid #6B2CAE" },
  low:    { background: "transparent", color: "#444444", border: "1px solid rgba(10,10,10,0.2)" },
};

function PriorityBadge({ priority }) {
  return (
    <span style={{
      ...(PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium),
      display: "inline-block",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 999,
    }}>
      {priority}
    </span>
  );
}

const TIMELINE_LABELS = {
  "12_months": "12 months before", "9_months": "9 months before",
  "6_months": "6 months before",   "3_months": "3 months before",
  "1_month": "1 month before",     "2_weeks": "2 weeks before",
  "1_week": "1 week before",       "day_of": "Day of wedding",
};

const CATEGORIES = ["all", "attire", "catering", "decorations", "flowers", "general", "guests", "legal", "music", "photography", "transportation", "venue"];
const PRIORITIES = ["all", "high", "low", "medium", "urgent"];

export default function ToDoListPage() {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  const [taskFormData, setTaskFormData] = useState({
    title: "", description: "", category: "general",
    priority: "medium", due_date: "", wedding_timeline: ""
  });

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const data = await getMyRecords('Task', '-created_date');
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    }
    setLoading(false);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(editingTask?.id ? 'Updating task…' : 'Adding task…');
    try {
      if (editingTask?.id) {
        await Task.update(editingTask.id, taskFormData);
        toast.success('Task updated!', { id: toastId });
      } else {
        await Task.create({ ...taskFormData, is_suggested: !!editingTask?.is_suggested, completed: false });
        toast.success('Task added!', { id: toastId });
      }
      resetTaskForm();
      loadTasks();
    } catch (error) {
      toast.error('Failed to save task', { id: toastId });
    }
  };

  const handleAddSuggestion = (suggestion) => {
    setEditingTask({ ...suggestion, is_suggested: true });
    setTaskFormData({ ...suggestion, is_suggested: true });
    setShowSuggestionsModal(false);
    setShowTaskForm(true);
  };

  const resetTaskForm = () => {
    setTaskFormData({ title: "", description: "", category: "general", priority: "medium", due_date: "", wedding_timeline: "" });
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormData({ ...task, due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : "" });
    setShowTaskForm(true);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    const toastId = toast.loading('Deleting…');
    try {
      await Task.delete(taskId);
      toast.success('Deleted', { id: toastId });
      loadTasks();
    } catch (error) {
      toast.error('Failed to delete', { id: toastId });
    }
  };

  const toggleCompleted = async (task) => {
    try {
      await Task.update(task.id, { ...task, completed: !task.completed });
      loadTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === "all" || task.category === activeCategory;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" ||
                          (statusFilter === "completed" && task.completed) ||
                          (statusFilter === "pending" && !task.completed);
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const urgent = tasks.filter(t => t.priority === 'urgent' && !t.completed).length;
    return { total, completed, pending, urgent };
  }, [tasks]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="To do list" subtitle="Stay organised with personal notes and to-do items" />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total tasks', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Pending', value: stats.pending },
          { label: 'Urgent', value: stats.urgent },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setShowSuggestionsModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0A1930', color: '#FFFFFF', border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
          <Lightbulb size={12} style={{ color: '#DDF762' }} />AI suggestions
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setEditingTask(null); setTaskFormData({ title: "", description: "", category: "general", priority: "medium", due_date: "", wedding_timeline: "" }); setShowTaskForm(true); }}
          className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} />Add task
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Search + filters row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)' }} />
            <input
              style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '8px 0 8px 22px', boxSizing: 'border-box' }}
              placeholder="Search tasks…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger style={{ width: 160 }}><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => <SelectItem key={p} value={p} style={{ textTransform: 'capitalize' }}>{p === 'all' ? 'All priorities' : p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ width: 160 }}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: '5px 14px', borderRadius: 999, border: `1.5px solid ${activeCategory === cat ? '#0A0A0A' : 'rgba(10,10,10,0.12)'}`, background: activeCategory === cat ? '#0A0A0A' : 'transparent', color: activeCategory === cat ? '#FFFFFF' : '#444444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Task Form */}
        {showTaskForm && (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {editingTask?.id ? 'Edit task' : 'Add new task'}
              </span>
              <button onClick={resetTaskForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={14} /></button>
            </div>
            <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <input
                  placeholder="Task title"
                  value={taskFormData.title}
                  onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  required
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0' }}
                />
                <Select value={taskFormData.category} onValueChange={v => setTaskFormData({ ...taskFormData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.slice(1).sort().map(c => <SelectItem key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Description…"
                value={taskFormData.description}
                onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })}
                style={{ minHeight: 72 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Select value={taskFormData.priority} onValueChange={v => setTaskFormData({ ...taskFormData, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="date"
                  value={taskFormData.due_date}
                  onChange={e => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0' }}
                />
                <Select value={taskFormData.wedding_timeline} onValueChange={v => setTaskFormData({ ...taskFormData, wedding_timeline: v })}>
                  <SelectTrigger><SelectValue placeholder="Timeline" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12_months">12 months before</SelectItem>
                    <SelectItem value="9_months">9 months before</SelectItem>
                    <SelectItem value="6_months">6 months before</SelectItem>
                    <SelectItem value="3_months">3 months before</SelectItem>
                    <SelectItem value="1_month">1 month before</SelectItem>
                    <SelectItem value="2_weeks">2 weeks before</SelectItem>
                    <SelectItem value="1_week">1 week before</SelectItem>
                    <SelectItem value="day_of">Day of wedding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                <button type="button" onClick={resetTaskForm} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={!taskFormData.title} className="btn-primary"
                  style={{ fontSize: 13, opacity: !taskFormData.title ? 0.5 : 1 }}>
                  {editingTask?.id ? 'Update' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List */}
        <div>
          {filteredTasks.map(task => (
            <div key={task.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 8px', borderBottom: '1px solid rgba(10,10,10,0.06)', opacity: task.completed ? 0.6 : 1 }}>
              <button onClick={() => toggleCompleted(task)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, flexShrink: 0 }}>
                {task.completed
                  ? <CheckCircle2 size={16} style={{ color: '#E03553' }} />
                  : <Circle size={16} style={{ color: 'rgba(10,10,10,0.2)' }} />
                }
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: task.completed ? 'line-through' : 'none' }}>
                    {task.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {task.is_suggested && <span style={{ ...labelStyle, marginRight: 6 }}>AI</span>}
                    <button onClick={() => handleEditTask(task)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {task.description && (
                  <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 4px' }}>{task.description}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={labelStyle}>{task.category}</span>
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />Due {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.wedding_timeline && (
                    <span style={labelStyle}>{TIMELINE_LABELS[task.wedding_timeline] || task.wedding_timeline}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '48px 32px', textAlign: 'center' }}>
            <ListTodo size={32} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {searchTerm ? "No tasks match your search." : "No tasks yet — add your first."}
            </p>
          </div>
        )}
      </div>

      <SuggestionsModal
        isOpen={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        onAddSuggestion={handleAddSuggestion}
      />
    </div>
  );
}
