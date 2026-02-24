import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi, type Goal } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox';

interface CustomField {
  key: string;
  label: string;
  type: FieldType;
  value: any;
  options?: string[]; // for dropdown type
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCustomFields(goal: Goal): CustomField[] {
  const meta = goal.metadata as Record<string, any> | null;
  if (!meta || !Array.isArray(meta.customFields)) return [];
  return meta.customFields;
}

function generateKey(): string {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

// ---------------------------------------------------------------------------
// Field Value Display
// ---------------------------------------------------------------------------

function FieldValueDisplay({ field }: { field: CustomField }) {
  if (field.type === 'checkbox') {
    return (
      <span className={clsx('text-xs font-medium', field.value ? 'text-green-600 dark:text-green-400' : 'text-secondary-400')}>
        {field.value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (field.type === 'date' && field.value) {
    return (
      <span className="text-xs text-secondary-700 dark:text-secondary-300">
        {new Date(field.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    );
  }
  return (
    <span className="text-xs text-secondary-700 dark:text-secondary-300">
      {field.value !== undefined && field.value !== null ? String(field.value) : '---'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Field Editor
// ---------------------------------------------------------------------------

function FieldEditor({
  field,
  onChange,
  onCancel,
}: {
  field: CustomField;
  onChange: (value: any) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(field.value ?? '');

  const save = () => onChange(val);

  if (field.type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!val}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
      />
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div className="flex items-center gap-1">
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button onClick={save} className="p-0.5 text-green-500 hover:text-green-600"><CheckIcon className="h-3.5 w-3.5" /></button>
        <button onClick={onCancel} className="p-0.5 text-secondary-400 hover:text-secondary-600"><XMarkIcon className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={val}
        onChange={(e) => setVal(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none flex-1"
        autoFocus
      />
      <button onClick={save} className="p-0.5 text-green-500 hover:text-green-600"><CheckIcon className="h-3.5 w-3.5" /></button>
      <button onClick={onCancel} className="p-0.5 text-secondary-400 hover:text-secondary-600"><XMarkIcon className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Field Form
// ---------------------------------------------------------------------------

function AddFieldForm({ onAdd, onCancel }: { onAdd: (f: CustomField) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState('');

  const submit = () => {
    if (!label.trim()) return;
    const field: CustomField = {
      key: generateKey(),
      label: label.trim(),
      type,
      value: type === 'checkbox' ? false : type === 'number' ? 0 : '',
    };
    if (type === 'dropdown') {
      field.options = options.split(',').map((o) => o.trim()).filter(Boolean);
    }
    onAdd(field);
  };

  return (
    <div className="mt-2 p-3 bg-secondary-50 dark:bg-secondary-900/30 rounded-lg border border-secondary-200 dark:border-secondary-700 space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Field label..."
          className="flex-1 text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as FieldType)}
          className="text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>
      {type === 'dropdown' && (
        <input
          type="text"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder="Options (comma separated): Low, Medium, High"
          className="w-full text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!label.trim()}
          className="px-2.5 py-1 text-2xs font-medium rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
        >
          Add Field
        </button>
        <button
          onClick={onCancel}
          className="text-2xs text-secondary-400 hover:text-secondary-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface OKRCustomFieldsProps {
  goal: Goal;
}

export function OKRCustomFields({ goal }: OKRCustomFieldsProps) {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fields = getCustomFields(goal);

  const updateMutation = useMutation({
    mutationFn: (newFields: CustomField[]) => {
      const meta = (goal.metadata as Record<string, any>) || {};
      return goalsApi.update(goal.id, {
        metadata: { ...meta, customFields: newFields },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
    },
    onError: () => toast.error('Failed to update custom fields'),
  });

  const handleValueChange = useCallback(
    (key: string, value: any) => {
      const updated = fields.map((f) => (f.key === key ? { ...f, value } : f));
      updateMutation.mutate(updated);
      setEditingKey(null);
    },
    [fields, updateMutation]
  );

  const handleDelete = useCallback(
    (key: string) => {
      const updated = fields.filter((f) => f.key !== key);
      updateMutation.mutate(updated);
    },
    [fields, updateMutation]
  );

  const handleAddField = useCallback(
    (field: CustomField) => {
      updateMutation.mutate([...fields, field]);
      setIsAdding(false);
      toast.success('Custom field added');
    },
    [fields, updateMutation]
  );

  return (
    <div>
      <h4 className="text-2xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
        Custom Fields
      </h4>

      {fields.length === 0 && !isAdding && (
        <p className="text-2xs text-secondary-400 italic mb-2">No custom fields</p>
      )}

      {/* Field list */}
      <div className="space-y-1.5">
        {fields.map((field) => (
          <div key={field.key} className="group flex items-center gap-2 py-1">
            <span className="text-2xs font-medium text-secondary-500 dark:text-secondary-400 w-24 shrink-0 break-words">
              {field.label}
            </span>
            {editingKey === field.key ? (
              <FieldEditor
                field={field}
                onChange={(v) => handleValueChange(field.key, v)}
                onCancel={() => setEditingKey(null)}
              />
            ) : (
              <>
                <FieldValueDisplay field={field} />
                <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingKey(field.key)}
                    className="p-0.5 rounded text-secondary-400 hover:text-primary-500 transition-colors"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(field.key)}
                    className="p-0.5 rounded text-secondary-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add field */}
      {isAdding ? (
        <AddFieldForm onAdd={handleAddField} onCancel={() => setIsAdding(false)} />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors mt-2"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add custom field
        </button>
      )}
    </div>
  );
}
