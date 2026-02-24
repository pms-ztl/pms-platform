import { useState, useMemo, useCallback } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface AtRiskEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  department: string | null;
  overallScore: number;
}

interface ActionPlan {
  id: string;
  employeeId: string;
  employeeName: string;
  action: string;
  status: 'open' | 'in_progress' | 'completed';
  createdAt: string;
}

interface ActionPlansWidgetProps {
  atRiskEmployees: AtRiskEmployee[];
  tenantId?: string;
  className?: string;
}

const STORAGE_KEY = (tid: string) => `pms-action-plans-${tid}`;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const NEXT_STATUS: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'completed',
  completed: 'open',
};

function loadPlans(tenantId: string): ActionPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tenantId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlans(tenantId: string, plans: ActionPlan[]) {
  try {
    localStorage.setItem(STORAGE_KEY(tenantId), JSON.stringify(plans));
  } catch { /* storage full */ }
}

export function ActionPlansWidget({ atRiskEmployees, tenantId = 'default', className }: ActionPlansWidgetProps) {
  const [plans, setPlans] = useState<ActionPlan[]>(() => loadPlans(tenantId));
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [actionText, setActionText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const updatePlans = useCallback((newPlans: ActionPlan[]) => {
    setPlans(newPlans);
    savePlans(tenantId, newPlans);
  }, [tenantId]);

  const handleAdd = () => {
    if (!selectedEmployee || !actionText.trim()) return;
    const emp = atRiskEmployees.find((e) => e.userId === selectedEmployee);
    if (!emp) return;

    const newPlan: ActionPlan = {
      id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: emp.userId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      action: actionText.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    updatePlans([newPlan, ...plans]);
    setActionText('');
    setSelectedEmployee('');
    setShowForm(false);
  };

  const handleToggleStatus = (planId: string) => {
    updatePlans(
      plans.map((p) =>
        p.id === planId ? { ...p, status: NEXT_STATUS[p.status] as ActionPlan['status'] } : p
      )
    );
  };

  const handleDelete = (planId: string) => {
    updatePlans(plans.filter((p) => p.id !== planId));
  };

  const filteredPlans = useMemo(() => {
    if (filterStatus === 'all') return plans;
    return plans.filter((p) => p.status === filterStatus);
  }, [plans, filterStatus]);

  const stats = useMemo(() => ({
    open: plans.filter((p) => p.status === 'open').length,
    in_progress: plans.filter((p) => p.status === 'in_progress').length,
    completed: plans.filter((p) => p.status === 'completed').length,
  }), [plans]);

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Action Plans</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
            Track improvement actions for at-risk employees
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Plan
        </button>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 mb-4">
        {(['open', 'in_progress', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterStatus === s ? STATUS_COLORS[s] : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-600'
            )}
          >
            {STATUS_LABELS[s]}
            <span className="font-bold">{stats[s]}</span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white px-3 py-2"
            >
              <option value="">Select employee...</option>
              {atRiskEmployees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.firstName} {emp.lastName} {emp.department ? `(${emp.department})` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder="Describe the action plan..."
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white px-3 py-2 placeholder:text-secondary-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setActionText(''); setSelectedEmployee(''); }}
              className="px-3 py-1.5 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedEmployee || !actionText.trim()}
              className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-8 text-secondary-400 dark:text-secondary-500">
          <p className="text-sm">{plans.length === 0 ? 'No action plans yet. Create one to get started.' : 'No plans match the current filter.'}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                plan.status === 'completed'
                  ? 'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-200 dark:border-secondary-700 opacity-75'
                  : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700'
              )}
            >
              <button
                onClick={() => handleToggleStatus(plan.id)}
                className={clsx('flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-2xs font-medium transition-colors cursor-pointer', STATUS_COLORS[plan.status])}
                title={`Click to change to ${STATUS_LABELS[NEXT_STATUS[plan.status]]}`}
              >
                {STATUS_LABELS[plan.status]}
              </button>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm text-secondary-900 dark:text-white', plan.status === 'completed' && 'line-through')}>
                  {plan.action}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {plan.employeeName} &middot; {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(plan.id)}
                className="flex-shrink-0 p-1 text-secondary-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Remove plan"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
