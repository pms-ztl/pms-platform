import { useState } from 'react';
import { FlagIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface GoalStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const GOAL_TIPS = [
  { letter: 'S', word: 'Specific', tip: 'Clearly define what you want to achieve' },
  { letter: 'M', word: 'Measurable', tip: 'Include metrics to track progress' },
  { letter: 'A', word: 'Achievable', tip: 'Set realistic and attainable targets' },
  { letter: 'R', word: 'Relevant', tip: 'Align with your role and team objectives' },
  { letter: 'T', word: 'Time-bound', tip: 'Set a clear deadline' },
];

const GOAL_TEMPLATES = [
  'Complete onboarding and shadow 3 team members within 30 days',
  'Deliver first project milestone by end of quarter',
  'Achieve 90% on role-specific skill assessment',
  'Build relationships with 5 cross-functional stakeholders',
];

export function GoalStep({ onNext, onSkip }: GoalStepProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [goalType, setGoalType] = useState<'SMART' | 'OKR_OBJECTIVE'>('SMART');

  const createMutation = useMutation({
    mutationFn: () =>
      goalsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        type: goalType,
        priority: 'MEDIUM',
        dueDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
      onNext();
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    createMutation.mutate();
  };

  const applyTemplate = (template: string) => {
    setTitle(template);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-secondary-900 dark:text-white mb-1 text-center">
        Set Your First Goal
      </h2>
      <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center mb-6">
        Get started with a goal that matters to you
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Goal Type Toggle */}
          <div className="flex gap-2">
            {(['SMART', 'OKR_OBJECTIVE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setGoalType(type)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  goalType === type
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                }`}
              >
                {type === 'SMART' ? 'SMART Goal' : 'OKR Objective'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Description <span className="text-secondary-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about how you'll achieve this goal..."
              rows={3}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Quick Templates */}
          <div>
            <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2 flex items-center gap-1">
              <LightBulbIcon className="h-3.5 w-3.5" />
              Quick templates
            </p>
            <div className="flex flex-wrap gap-2">
              {GOAL_TEMPLATES.map((template, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(template)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                >
                  {template.length > 45 ? template.slice(0, 42) + '...' : template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SMART Tips Sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-xl p-4 border border-secondary-200 dark:border-secondary-600">
            <div className="flex items-center gap-2 mb-3">
              <FlagIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">SMART Framework</p>
            </div>
            <div className="space-y-2.5">
              {GOAL_TIPS.map((tip) => (
                <div key={tip.letter} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold flex-shrink-0">
                    {tip.letter}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-secondary-800 dark:text-secondary-200">{tip.word}</p>
                    <p className="text-[11px] text-secondary-500 dark:text-secondary-400">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onSkip}
          className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300"
        >
          Skip for now
        </button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !title.trim()}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Goal & Continue'}
        </button>
      </div>
    </div>
  );
}
