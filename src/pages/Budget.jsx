import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import toast from 'react-hot-toast';

import BudgetForm from "../components/budget/BudgetForm";
import PageConsiderations from '../components/shared/PageConsiderations';
import BudgetList from "../components/budget/BudgetList";
import BudgetChart from "../components/budget/BudgetChart";
import BudgetForecasting from "../components/budget/BudgetForecasting";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getMyRecords, getMyWeddingDetails } from "@/lib/resolveMyWedding";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
const Budget = base44.entities.Budget;
const WeddingDetails = base44.entities.WeddingDetails;

function CountUp({ to, duration = 1200, format }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const lastToRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); lastToRef.current = 0; return; }
    // The surrounding page (Budget.jsx's two duplicate desktop/mobile
    // trees, each with its own load effect) can re-render this component
    // several times in quick succession even when `to` hasn't actually
    // changed — confirmed live via instrumentation: the same 4 stat values
    // re-fired this effect repeatedly within ~1s of each other. Restarting
    // the animation from scratch on every one of those re-fires (the old
    // behaviour) meant it kept getting reset before a full `duration`
    // window could ever elapse, so it never reached its target — that,
    // not the target value itself, is why "Total budget" sometimes settled
    // on a wrong, stable-looking number that never changed again. Skipping
    // the restart when `to` is unchanged from what's already in flight (or
    // already reached) lets one animation run to completion.
    if (lastToRef.current === to) return;
    lastToRef.current = to;
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Extra safety net: requestAnimationFrame is tied to the paint cycle,
    // so a backgrounded/throttled tab can still stall the loop indefinitely
    // partway through even with the guard above. setTimeout keeps firing
    // in that case, so this guarantees the value snaps to the true target
    // once the animation's nominal duration has passed either way.
    const settle = setTimeout(() => setValue(to), duration + 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [to, duration]);
  return <>{format ? format(value) : value}</>;
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`filter-pill${active ? ' active' : ''}`}
    >
      {label}
    </button>
  );
}

const statLabelStyle = {
  color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0,
};

const CATEGORIES = [
  "all", "venue", "catering", "photography", "flowers", "music",
  "attire", "transportation", "decorations", "rings", "stationery",
  "beauty", "honeymoon", "miscellaneous",
];

const BUDGET_CATEGORIES = [
  { key: 'venue', label: 'Venue' },
  { key: 'catering', label: 'Catering' },
  { key: 'photography', label: 'Photography' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'music', label: 'Music' },
  { key: 'attire', label: 'Attire' },
  { key: 'transportation', label: 'Transport' },
  { key: 'honeymoon', label: 'Honeymoon' },
];

const PJS = "'Plus Jakarta Sans', sans-serif";

// Previously read/wrote localStorage('oi_budget_plan') — per-device only,
// never touched the backend, so it was always blank on a fresh session
// regardless of what real budget data existed for the wedding (dashboard
// round: "Budget page incoherence" repeat #3). Now backed by
// WeddingDetails.budget: an explicitly-saved plan takes precedence: falling
// that (never saved), defaults from the real itemized Budget records
// (`defaultTotal`/`defaultCategories`, computed by the parent from the same
// `budgetItems` the stat cards use) so the form shows real numbers instead
// of empty inputs on first view.
function BudgetPlanner({ symbol = '$', savedBudget, defaultTotal, defaultCategories, weddingDetailsId, onSaved }) {
  const initialPlan = () => savedBudget
    ? { total: savedBudget.total ?? '', categories: { ...savedBudget.categories } }
    : { total: defaultTotal || '', categories: { ...defaultCategories } };
  const [plan, setPlan] = useState(initialPlan);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // savedBudget/defaultTotal/defaultCategories arrive async (after the
  // parent's own WeddingDetails/Budget fetch resolves) — this component can
  // mount before that data exists, so re-sync once it lands rather than
  // being stuck on the empty initial render.
  useEffect(() => {
    setPlan(initialPlan());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedBudget, defaultTotal, defaultCategories]);

  const save = async () => {
    setSaving(true);
    const payload = {
      total: plan.total === '' ? null : parseFloat(plan.total) || 0,
      categories: BUDGET_CATEGORIES.reduce((acc, c) => {
        const v = plan.categories[c.key];
        acc[c.key] = v === '' || v == null ? null : (parseFloat(v) || 0);
        return acc;
      }, {}),
    };
    try {
      if (weddingDetailsId) {
        await WeddingDetails.update(weddingDetailsId, { budget: payload });
      } else {
        const created = await WeddingDetails.create({ budget: payload });
        onSaved?.(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      toast.error('Failed to save budget plan');
    }
    setSaving(false);
  };

  const setTotal = (v) => setPlan(p => ({ ...p, total: v }));
  const setCat = (key, v) => setPlan(p => ({ ...p, categories: { ...p.categories, [key]: v } }));

  const total = parseFloat(plan.total) || 0;
  const allocated = BUDGET_CATEGORIES.reduce((s, c) => s + (parseFloat(plan.categories[c.key]) || 0), 0);
  const remaining = total - allocated;

  const inputStyle = {
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(10,10,10,0.18)', borderRadius: 0,
    padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A',
    outline: 'none', width: '100%', fontFamily: PJS,
  };

  return (
    <div style={{ marginBottom: 32, border: '1px solid rgba(10,10,10,0.08)', padding: '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ padding: '7px 20px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>

      {/* Total budget input */}
      <div style={{ marginBottom: 24, maxWidth: 320 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', display: 'block', marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Total wedding budget ({symbol})
        </label>
        <input
          type="number"
          placeholder="e.g. 50000"
          value={plan.total}
          onChange={e => setTotal(e.target.value)}
          style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
        />
      </div>

      {/* Category allocations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 32px' }}>
        {BUDGET_CATEGORIES.map(cat => (
          <div key={cat.key}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', display: 'block', marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {cat.label}
            </label>
            <input
              type="number"
              placeholder={`${symbol}0`}
              value={plan.categories[cat.key] || ''}
              onChange={e => setCat(cat.key, e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
              onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
            />
          </div>
        ))}
      </div>

      {/* Allocation summary */}
      {total > 0 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 24, borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: 16 }}>
          <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>
            Allocated: <strong style={{ color: '#0A0A0A' }}>{symbol}{allocated.toLocaleString()}</strong>
          </span>
          <span style={{ fontSize: 13, color: remaining < 0 ? '#E03553' : '#444444', fontFamily: PJS }}>
            Remaining: <strong>{symbol}{remaining.toLocaleString()}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const { formatCurrency, symbol, currencyCode } = useCurrency();
  const [budgetItems, setBudgetItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [avaOpen, setAvaOpen] = useState(false);
  const [weddingDetailsId, setWeddingDetailsId] = useState(null);
  const [savedBudget, setSavedBudget] = useState(null);
  const [scrollToItemId, setScrollToItemId] = useState(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Arriving from Recent activity (or top-bar search) with a specific line
  // item to land on — same pattern as Vendors.jsx/Guests.jsx.
  useEffect(() => {
    const id = location.state?.highlightId;
    if (!id) return;
    if (location.state?.activityTab) setActiveTab(location.state.activityTab);
    setScrollToItemId(id);
    setHighlightedItemId(id);
    navigate(location.pathname, { replace: true, state: {} });
    const t = setTimeout(() => setHighlightedItemId(null), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.highlightId]);

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // collaborator-budget.js is read-only by design — there is no write path
  // for a collaborator's Budget access at all yet, regardless of what
  // permission was granted, so this is unconditional (not gated on
  // hasPagePermission(..., 'edit')), unlike Guests' readOnly flag.
  const readOnly = isCollaborating;

  useEffect(() => { loadBudgetItems(); }, [isCollaborating]);

  const loadBudgetItems = async () => {
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-budget?ownerUserId=${encodeURIComponent(collab.ownerUserId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error('Failed to load budget');
        const data = await res.json();
        setBudgetItems(data.budget || []);
      } else {
        const [data, wd] = await Promise.all([
          getMyRecords('Budget', '-created_date'),
          getMyWeddingDetails().catch(() => null),
        ]);
        setBudgetItems(data);
        if (wd) {
          setWeddingDetailsId(wd.id);
          setSavedBudget(wd.budget || null);
        }
      }
    } catch {
      toast.error("Failed to load budget");
    }
    setLoading(false);
  };

  const handleSubmit = async (itemData) => {
    const tid = toast.loading(editingItem ? 'Updating…' : 'Adding expense…');
    try {
      if (editingItem) {
        await Budget.update(editingItem.id, itemData);
        toast.success('Expense updated', { id: tid });
      } else {
        await Budget.create(itemData);
        toast.success('Expense added', { id: tid });
      }
      setShowForm(false);
      setEditingItem(null);
      loadBudgetItems();
    } catch {
      toast.error('Failed to save expense', { id: tid });
    }
  };

  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this expense?")) return;
    const tid = toast.loading('Deleting…');
    try {
      await Budget.delete(itemId);
      toast.success('Expense deleted', { id: tid });
      loadBudgetItems();
    } catch {
      toast.error('Failed to delete', { id: tid });
    }
  };

  const stats = React.useMemo(() => {
    const totalBudgeted = budgetItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
    const totalSpent = budgetItems.reduce((s, i) => s + (i.actual_amount || 0), 0);
    const remaining = totalBudgeted - totalSpent;
    const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const totalPaid = budgetItems.filter(i => i.paid).reduce((s, i) => s + (i.actual_amount || 0), 0);
    const unpaidAmount = budgetItems.filter(i => !i.paid).reduce((s, i) => s + (i.actual_amount || 0), 0);
    return { totalBudgeted, totalSpent, remaining, percentageUsed, totalPaid, unpaidAmount };
  }, [budgetItems]);

  // Defaults for the "Save plan" section when no plan has been explicitly
  // saved yet — the same itemized Budget records the stat cards above sum,
  // grouped by the plan's (smaller) category set, so the form shows real
  // numbers instead of blank inputs on first view.
  const defaultCategories = React.useMemo(() => {
    const sums = {};
    for (const c of BUDGET_CATEGORIES) sums[c.key] = 0;
    for (const item of budgetItems) {
      if (item.category in sums) sums[item.category] += item.budgeted_amount || 0;
    }
    return sums;
  }, [budgetItems]);

  const filteredItems = budgetItems.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === "all") return matchesSearch;
    return matchesSearch && item.category === activeCategory;
  });

  const exportBudget = () => {
    const csvContent = [
      ['Category', 'Item Name', 'Vendor', 'Budgeted Amount', 'Actual Amount', 'Paid', 'Payment Date', 'Notes'].join(','),
      ...budgetItems.map(item => [
        item.category, item.item_name, item.vendor || '',
        item.budgeted_amount || 0, item.actual_amount || 0,
        item.paid ? 'Yes' : 'No', item.payment_date || '', item.notes || ''
      ].map(f => `"${f}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'wedding-budget.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Budget exported');
  };

  const STAT_CARDS = [
    { label: 'Total budget',  value: stats.totalBudgeted,           format: formatCurrency },
    { label: 'Total spent',   value: stats.totalSpent,               format: formatCurrency },
    { label: 'Remaining',     value: Math.abs(stats.remaining),      format: formatCurrency },
    { label: 'Budget used',   value: Math.round(stats.percentageUsed), format: v => `${v}%` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Budget" subtitle="Plan, track and forecast your wedding spending" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none', borderRadius: 0, boxShadow: 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 80, height: 32, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}><CountUp to={s.value} format={s.format} /></p>
            }
          </div>
        ))}
      </div>

      {/* Toolbar row: Ava button left, actions right */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava for budget advice" onClick={() => setAvaOpen(true)} />
        <div className="flex flex-wrap gap-[10px]">
          <button
            onClick={exportBudget}
            disabled={budgetItems.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: budgetItems.length === 0 ? 0.4 : 1 }}
          >
            Export CSV
          </button>
          {!readOnly && (
            <button
              onClick={() => { setEditingItem(null); setShowForm(true); }}
              className="btn-primary"
            >
              + Add expense
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="considerations">Considerations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            {!readOnly && (
              <BudgetPlanner
                symbol={symbol}
                savedBudget={savedBudget}
                defaultTotal={stats.totalBudgeted || ''}
                defaultCategories={defaultCategories}
                weddingDetailsId={weddingDetailsId}
                onSaved={setWeddingDetailsId}
              />
            )}
            <BudgetChart budgetItems={budgetItems} />
          </TabsContent>

          <TabsContent value="forecasting" className="mt-6">
            <BudgetForecasting budgetItems={budgetItems} stats={stats} />
          </TabsContent>

          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="budget" />
          </TabsContent>

          <TabsContent value="expenses" className="mt-8 space-y-6">
            {/* Search + filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <Input
                  placeholder="Search by name or vendor…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 20 }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => (
                  <FilterPill
                    key={cat}
                    label={cat === 'all' ? 'All' : cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  />
                ))}
              </div>
            </div>

            <BudgetList items={filteredItems} onEdit={readOnly ? undefined : handleEdit} onDelete={readOnly ? undefined : handleDelete} readOnly={readOnly} loading={loading} scrollToItemId={scrollToItemId} highlightedItemId={highlightedItemId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Expense modal */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingItem(null); } }}>
        <DialogContent hideClose title={editingItem ? 'Edit expense' : 'Add expense'} className="max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          <BudgetForm
            item={editingItem}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
          />
        </DialogContent>
      </Dialog>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Budget advisor"
        systemPrompt={`You are Ava, a wedding budget advisor. The couple is tracking their budget in ${currencyCode} (${symbol}). Help couples allocate budget, find savings, and track spending across all wedding categories. When giving budget estimates or comparisons, use ${currencyCode}. If the couple has selected cultures and traditions, factor in typical costs for culturally-specific elements (e.g. Mehndi night, tea ceremony, sofreh aghd) where relevant.`}
        quickActions={["What's a typical wedding budget breakdown?", "Where can I save money?", "Am I spending too much on vendors?", "Help me negotiate with vendors"]}
      />
    </div>
  );
}
