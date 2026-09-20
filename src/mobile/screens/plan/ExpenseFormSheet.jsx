import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton, TextField, SelectField, Checkbox } from '../../ui';
import { BUDGET_CATEGORIES } from '@/lib/budgetCategories';

const CATEGORY_OPTIONS = BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label }));
const EMPTY = { category: '', item_name: '', budgeted_amount: '', actual_amount: '', vendor: '', paid: false, payment_date: '', notes: '' };

/** Add or edit a Budget record, the same fields BudgetForm.jsx writes. */
export default function ExpenseFormSheet({ open, item, onClose, onSave, onDelete, symbol = '$', defaultCategory = '' }) {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    if (open) {
      setF(item ? { ...EMPTY, ...item, budgeted_amount: item.budgeted_amount ?? '', actual_amount: item.actual_amount ?? '' } : { ...EMPTY, category: defaultCategory });
      setErrors({});
      setSaveError('');
    }
  }, [open, item, defaultCategory]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const submit = async () => {
    const e = {};
    if (!f.category) e.category = 'Choose a category.';
    if (!f.item_name.trim()) e.item_name = 'Say what this is for.';
    if (f.budgeted_amount === '' || Number.isNaN(parseFloat(f.budgeted_amount))) e.budgeted_amount = 'Add the amount you have set aside.';
    if (f.actual_amount !== '' && Number.isNaN(parseFloat(f.actual_amount))) e.actual_amount = 'Amounts are numbers only.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave({
        category: f.category,
        item_name: f.item_name.trim(),
        budgeted_amount: parseFloat(f.budgeted_amount) || 0,
        actual_amount: parseFloat(f.actual_amount) || 0,
        vendor: f.vendor.trim(),
        paid: !!f.paid,
        payment_date: f.payment_date || '',
        notes: f.notes,
      });
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Could not save this expense. Try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit expense' : 'Add an expense'}
      footer={(
        <>
          {item && onDelete && <PillButton variant="ghost" onClick={() => onDelete(item)} disabled={saving} style={{ color: 'var(--m-primary)' }}>Remove</PillButton>}
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : item ? 'Save changes' : 'Add expense'}</PillButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SelectField label="Category" value={f.category} onChange={(e) => set('category', e.target.value)} options={CATEGORY_OPTIONS} placeholder="Choose a category" error={errors.category} />
        <TextField label="What it is" value={f.item_name} onChange={(e) => set('item_name', e.target.value)} error={errors.item_name} placeholder="Venue deposit, florist, suit hire" />
        <TextField label={`Budgeted (${symbol})`} type="number" inputMode="decimal" value={f.budgeted_amount} onChange={(e) => set('budgeted_amount', e.target.value)} error={errors.budgeted_amount} placeholder="0" />
        <TextField label={`Actual (${symbol})`} type="number" inputMode="decimal" value={f.actual_amount} onChange={(e) => set('actual_amount', e.target.value)} error={errors.actual_amount} placeholder="0" />
        <TextField label="Vendor" value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="Optional" />
        <TextField label="Payment due" type="date" value={f.payment_date || ''} onChange={(e) => set('payment_date', e.target.value)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Checkbox checked={!!f.paid} onChange={(v) => set('paid', v)} label="Paid" />
          <span className="oi-m-body">Paid</span>
        </div>
        {saveError && <p className="oi-m-field__error" role="alert">{saveError}</p>}
      </div>
    </BottomSheet>
  );
}
