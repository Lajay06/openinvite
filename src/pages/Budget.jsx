import React, { useState, useEffect } from "react";
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
import { useAvaFocus } from "@/hooks/useAvaFocus";
import CountUp from "@/components/shared/CountUp";
const Budget = base44.entities.Budget;

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

// The plan's categories, widened 2026-08-19 from 8 to the ledger's full 13.
//
// WHY. The Budget entity accepts 13 categories; the plan accepted 8. The five
// it could not represent — decorations, rings, stationery, beauty,
// miscellaneous — held $27,500 of real allocations on the live fixture, money
// the planning half of the page simply could not see. Worse, the plan then
// reported that same $27,500 as "Remaining", so the page told a couple who had
// allocated every dollar that they had a spare $27,500. Closing the category
// gap is what makes that number honest; renaming it (below) is only the label.
//
// This list must stay a superset-match with CATEGORIES above (minus "all").
// Pinned by tests/persistence/budget-clarity.mjs.
const BUDGET_CATEGORIES = [
  { key: 'venue', label: 'Venue' },
  { key: 'catering', label: 'Catering' },
  { key: 'photography', label: 'Photography' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'music', label: 'Music' },
  { key: 'attire', label: 'Attire' },
  { key: 'transportation', label: 'Transport' },
  { key: 'decorations', label: 'Decorations' },
  { key: 'rings', label: 'Rings' },
  { key: 'stationery', label: 'Stationery' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'honeymoon', label: 'Honeymoon' },
  { key: 'miscellaneous', label: 'Miscellaneous' },
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
function BudgetPlanner({ symbol = '$', savedBudget, defaultTotal, defaultCategories, committedTotal = 0, weddingDetailsId, onSaved }) {
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
      // Writes all 13 keys. An older plan that decrypted with 8 is upgraded here,
      // on the couple's next save, rather than by a migration over live money.
      categories: BUDGET_CATEGORIES.reduce((acc, c) => {
        const v = plan.categories[c.key];
        acc[c.key] = v === '' || v == null ? null : (parseFloat(v) || 0);
        return acc;
      }, {}),
    };
    try {
      // fix/weddingdetails-field-encryption (Step 2a): budget is AES-256-GCM
      // ciphertext at rest — encrypting needs BASE44_ADMIN_KEY, a server-
      // only secret, so this can no longer write WeddingDetails.budget
      // directly. This endpoint handles both update (existing wedding) and
      // create (first-ever save) the same way getMyWeddingDetails() did.
      const res = await fetch('/api/my-wedding-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
        },
        body: JSON.stringify({ field: 'budget', value: payload }),
      });
      if (!res.ok) throw new Error('Failed to save budget plan');
      if (!weddingDetailsId) {
        const { id } = await res.json();
        onSaved?.(id);
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

  // EXPLICIT zero for a category the stored plan does not carry.
  //
  // budget is AES ciphertext of {total, categories}; the JSON inside is an
  // application contract Base44 never validates, so widening it from 8 keys to
  // 13 needed no schema change — but every plan saved BEFORE 2026-08-19 still
  // decrypts to the 8-key shape. Those five missing keys must read as 0, and
  // must do so where a reader can see it happening. `parseFloat(undefined) || 0`
  // would reach the same number by accident; this reaches it on purpose, so
  // nobody later "simplifies" the fallback away without meeting the reason.
  //
  // There is deliberately NO re-encryption migration: an old row stays 8-key
  // until the couple's next save, at which point the write path below emits all
  // 13. Same mixed-shape tolerance the encrypted fields use one level up.
  const planCategoryValue = (key) => {
    const stored = plan.categories?.[key];
    if (stored === undefined || stored === null || stored === '') return 0;   // absent in an older 8-key plan
    return parseFloat(stored) || 0;
  };
  const allocated = BUDGET_CATEGORIES.reduce((s, c) => s + planCategoryValue(c.key), 0);
  const unallocated = total - allocated;
  const money = (n) => `${n < 0 ? '-' : ''}${symbol}${Math.abs(n).toLocaleString()}`;

  const inputStyle = {
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(10,10,10,0.18)', borderRadius: 0,
    padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A',
    outline: 'none', width: '100%', fontFamily: PJS,
  };

  return (
    <div data-ava-focus="budget" style={{ marginBottom: 32, border: '1px solid rgba(10,10,10,0.12)', padding: '24px 32px' }}>
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

      {/* A negative belongs OUTSIDE the symbol: -$54,000, not $-54,000.
          Over-allocating is exactly when a couple is reading this line
          closely, so it is the worst moment to render money oddly. */}
      {/* Allocation summary */}
      {total > 0 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 24, borderTop: '1px solid rgba(10,10,10,0.12)', paddingTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>
            Allocated: <strong style={{ color: '#0A0A0A' }}>{money(allocated)}</strong>
          </span>
          {/* "Unallocated", not "Remaining". The stat strip 40px below uses
              "Remaining" for money not yet SPENT; this is money not yet
              ASSIGNED TO A CATEGORY. Two different quantities that shared one
              word. Shown even at zero — zero unallocated is a true statement
              about the plan, not a reason to hide the label. */}
          <span style={{ fontSize: 13, color: unallocated < 0 ? '#E03553' : '#444444', fontFamily: PJS }}>
            Unallocated: <strong>{money(unallocated)}</strong>
          </span>
          {/* Reconciliation, shown ONLY on divergence (advisor default: calm).
              The plan and the ledger are two stores that nothing syncs — see
              scratchpad/BUDGET-CLARITY-DECISIONS.md ruling 1. When they agree,
              saying so adds noise; when they disagree, silence is the bug. */}
          {committedTotal > 0 && total > 0 && Math.round(committedTotal) !== Math.round(total) && (
            <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>
              Committed in expenses: <strong style={{ color: '#0A0A0A' }}>{money(committedTotal)}</strong>
              {' '}<span style={{ color: 'rgba(10,10,10,0.6)' }}>(differs from your plan)</span>
            </span>
          )}
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

  useAvaFocus();

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
    // Seeded with an explicit 0 for every one of the 13, so a category with no
    // ledger rows is a real zero rather than an absent key.
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

  // ── Store A: the PLAN ────────────────────────────────────────────────
  // Deliberately a SEPARATE file from the expenses CSV below. #501 separated
  // these two stores in the UI ("Committed" vs "Total wedding budget"); a
  // single download called "budget" would re-merge them in the one place the
  // couple looks later. Filename and headers both say plan.
  //
  // savedBudget arrives from getMyWeddingDetails() -> /api/my-wedding-details,
  // which decrypts `budget` server-side. WeddingDetails.budget is AES
  // ciphertext at rest, so reading the raw column would export an unreadable
  // base64 string.
  const exportBudgetPlan = () => {
    if (!savedBudget) { toast.error('No saved plan to export yet'); return; }
    const total = parseFloat(savedBudget.total) || 0;
    // Same explicit-zero reader as the planner: a plan saved before the
    // 8 -> 13 category widening has no key for the newer five, and an
    // undefined would export as "NaN".
    const value = (key) => {
      const stored = savedBudget.categories?.[key];
      if (stored === undefined || stored === null || stored === '') return 0;
      return parseFloat(stored) || 0;
    };
    const allocated = BUDGET_CATEGORIES.reduce((sum, c) => sum + value(c.key), 0);
    const rows = [
      ['Plan item', 'Planned amount'].join(','),
      ['Total wedding budget', total].map(f => `"${f}"`).join(','),
      ...BUDGET_CATEGORIES.map(c => [c.label, value(c.key)].map(f => `"${f}"`).join(',')),
      ['Allocated to categories', allocated].map(f => `"${f}"`).join(','),
      ['Unallocated', total - allocated].map(f => `"${f}"`).join(','),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'wedding-budget-plan.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Plan exported');
  };

  // ── Store B: the EXPENSES ledger -> wedding-expenses.csv.
  // Renamed from wedding-budget.csv deliberately pre-launch: once the plan
  // export existed, "budget" no longer distinguished the two files, and a
  // couple with both in a downloads folder could not tell which was which.
  // Safe now, breaking later -- after real couples build sheets on the old
  // name it can never be changed.
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
    link.href = url; link.download = 'wedding-expenses.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Budget exported');
  };

  // "Budget used" keeps its percentage (advisor default) but never appears
  // unqualified again: the denominator is named beneath it. An unlabelled
  // percentage was the defect, not the arithmetic — it is spent/committed, and
  // a couple reading it had no way to know that was not their stated plan.
  const STAT_CARDS = [
    // "Committed", not "Total budget". This tile sums budgeted_amount across
    // the couple's expense lines (Store B, the ledger) — it has never shown the
    // total they typed into "Total wedding budget" one screen below (Store A,
    // the encrypted plan). Two different numbers both called "budget" was the
    // conflation #501 separated everywhere else; this was the last surface
    // still saying "budget" for the ledger. The word matches what the strip
    // already tells the user in "Budget used"'s sub-line ("$X of $Y committed")
    // and what the plan's reconciliation line calls it ("Committed in
    // expenses"), so all three now name the same quantity the same way.
    { label: 'Committed',     value: stats.totalBudgeted,           format: formatCurrency },
    { label: 'Total spent',   value: stats.totalSpent,               format: formatCurrency },
    { label: 'Remaining',     value: Math.abs(stats.remaining),      format: formatCurrency,
      // Math.abs() strips the sign, so the label has to carry it. Without
      // this a couple $10k over budget reads "Remaining $10,000 left to
      // spend" — the number is right and the sentence is the opposite of true.
      sub: stats.remaining < 0 ? 'over budget' : 'left to spend' },
    { label: 'Budget used',   value: Math.round(stats.percentageUsed), format: v => `${v}%`,
      // Naming a zero denominator is worse than naming none: "$0 of $0"
      // reads as a broken number to a couple who simply has not started.
      sub: stats.totalBudgeted > 0
        ? `${formatCurrency(stats.totalSpent)} of ${formatCurrency(stats.totalBudgeted)} committed`
        : null },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Budget" subtitle="Plan, track and forecast your wedding spending" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none', borderRadius: 0, boxShadow: 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 80, height: 32, background: 'rgba(10,10,10,0.06)' }} />
              : <>
                  <p style={statValueStyle}><CountUp to={s.value} format={s.format} /></p>
                  {/* Names what the number is measured against. A percentage
                      without its denominator was the defect this fixes. */}
                  {s.sub && (
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '4px 0 0' }}>{s.sub}</p>
                  )}
                </>
            }
          </div>
        ))}
      </div>

      {/* Toolbar row: Ava button left, actions right */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
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
          {/* Store A, the plan. Its own button because it is its own file:
              a couple who exported "budget" and got only expenses would
              reasonably think the plan had not saved. Label names the store. */}
          <button
            onClick={exportBudgetPlan}
            disabled={!savedBudget}
            className="btn-editorial-secondary"
            style={{ opacity: !savedBudget ? 0.4 : 1 }}
          >
            Export plan
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
                committedTotal={stats.totalBudgeted || 0}
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
                <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.45)', pointerEvents: 'none' }} />
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
