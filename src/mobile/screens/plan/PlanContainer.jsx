import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import PlanScreen, { BudgetCategoryScreen } from './PlanScreen';
import TaskFormSheet from './TaskFormSheet';
import ExpenseFormSheet from './ExpenseFormSheet';
import { ShellContext } from '../../shell/MobileShell';
import { useTasks, useBudget, useSchedule, useVendors, taskWrites, budgetWrites } from '../../data/wedding';
import { hapticLight } from '../../native';
import { openDesktop } from '../../lib/links';

/** /m/plan, /m/plan/budget/:category. Loads through getMyRecords, writes through the Note and Budget entities. */
export default function PlanContainer() {
  const navigate = useNavigate();
  const { category } = useParams();
  const [params, setParams] = useSearchParams();
  const { base } = useContext(ShellContext);
  const { symbol } = useCurrency();
  const [segment, setSegment] = useState(params.get('segment') || 'checklist');
  const [taskSheet, setTaskSheet] = useState(false);
  const [expenseSheet, setExpenseSheet] = useState({ open: false, item: null });

  const tasks = useTasks();
  const budget = useBudget();
  const schedule = useSchedule();
  const vendors = useVendors();

  useEffect(() => {
    if (params.get('add') === '1') {
      if ((params.get('segment') || 'checklist') === 'budget') setExpenseSheet({ open: true, item: null });
      else setTaskSheet(true);
      params.delete('add');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desktop = (path) => openDesktop(navigate, path);

  const toggleTask = async (t) => {
    try {
      await taskWrites.toggle(t);
      if (!t.completed) hapticLight();
      tasks.reload();
    } catch {
      toast.error('Could not update that task. Try again.');
    }
  };
  const addTask = async (fields) => {
    await taskWrites.create(fields);
    toast.success('Task added');
    tasks.reload();
  };
  const saveExpense = async (fields) => {
    if (expenseSheet.item) {
      await budgetWrites.update(expenseSheet.item.id, fields);
      toast.success('Expense updated');
    } else {
      await budgetWrites.create(fields);
      toast.success('Expense added');
    }
    budget.reload();
  };

  const items = budget.data?.items || [];
  const plan = budget.data?.plan || null;

  return (
    <>
      {category ? (
        <BudgetCategoryScreen
          category={category}
          items={items}
          plan={plan}
          symbol={symbol}
          back={`${base}/plan?segment=budget`}
          onAdd={() => setExpenseSheet({ open: true, item: null })}
          onEdit={(item) => setExpenseSheet({ open: true, item })}
        />
      ) : (
        <PlanScreen
          segment={segment}
          onSegment={(s) => { setSegment(s); params.set('segment', s); setParams(params, { replace: true }); }}
          checklist={{ tasks: tasks.data || [], onToggle: toggleTask, onAdd: () => setTaskSheet(true), loading: tasks.loading, error: tasks.error, onRetry: tasks.reload }}
          budget={{ items, plan, symbol, onOpenCategory: (c) => navigate(`${base}/plan/budget/${c}`), onAdd: () => setExpenseSheet({ open: true, item: null }), loading: budget.loading, error: budget.error, onRetry: budget.reload }}
          timeline={{ items: schedule.data || [], loading: schedule.loading, error: schedule.error, onRetry: schedule.reload, onOpenDesktop: () => desktop('/Schedule') }}
          vendors={{ items: vendors.data || [], symbol, loading: vendors.loading, error: vendors.error, onRetry: vendors.reload, onOpenDesktop: () => desktop('/Vendors') }}
          onSeating={() => desktop('/Seating')}
        />
      )}
      <TaskFormSheet open={taskSheet} onClose={() => setTaskSheet(false)} onSave={addTask} />
      <ExpenseFormSheet open={expenseSheet.open} item={expenseSheet.item} defaultCategory={category || ''} symbol={symbol} onClose={() => setExpenseSheet((s) => ({ ...s, open: false }))} onSave={saveExpense} />
    </>
  );
}
