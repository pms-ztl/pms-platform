import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  SparklesIcon,
  BanknotesIcon,
  StarIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  BookOpenIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi, type CreateGoalInput } from '@/lib/api';

type TemplateIconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

// ---------------------------------------------------------------------------
// Template Data
// ---------------------------------------------------------------------------

interface GoalTemplate {
  name: string;
  category: string;
  icon: TemplateIconComponent;
  iconColor: string;
  description: string;
  objective: { title: string; type: string; priority: string };
  keyResults: Array<{ title: string; type: string }>;
}

const CATEGORIES = ['All', 'Business', 'Product', 'Engineering', 'People', 'Marketing'];

const TEMPLATES: GoalTemplate[] = [
  {
    name: 'Revenue Growth',
    category: 'Business',
    icon: BanknotesIcon,
    iconColor: 'text-emerald-600',
    description: 'Drive quarterly revenue targets with focused sales and conversion goals.',
    objective: { title: 'Increase quarterly revenue by X%', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Achieve $Xk in new sales', type: 'OKR_KEY_RESULT' },
      { title: 'Increase conversion rate to X%', type: 'OKR_KEY_RESULT' },
      { title: 'Expand to X new markets', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Customer Satisfaction',
    category: 'Business',
    icon: StarIcon,
    iconColor: 'text-amber-500',
    description: 'Improve NPS and customer retention through better service and product quality.',
    objective: { title: 'Achieve industry-leading customer satisfaction', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Increase NPS score to X', type: 'OKR_KEY_RESULT' },
      { title: 'Reduce support ticket resolution time to <X hours', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve X% customer retention rate', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Product Launch',
    category: 'Product',
    icon: RocketLaunchIcon,
    iconColor: 'text-violet-600',
    description: 'Successfully launch a new product feature or version on schedule.',
    objective: { title: 'Successfully launch [Product/Feature] by [Date]', type: 'OKR_OBJECTIVE', priority: 'CRITICAL' },
    keyResults: [
      { title: 'Complete all development milestones on time', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve X beta users with >X% satisfaction', type: 'OKR_KEY_RESULT' },
      { title: 'Zero critical bugs at launch', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Employee Engagement',
    category: 'People',
    icon: UserGroupIcon,
    iconColor: 'text-blue-600',
    description: 'Build a more engaged and motivated workforce through culture improvements.',
    objective: { title: 'Improve employee engagement and satisfaction', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Increase engagement survey score to X%', type: 'OKR_KEY_RESULT' },
      { title: 'Reduce voluntary attrition to <X%', type: 'OKR_KEY_RESULT' },
      { title: 'Launch X employee development programs', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Engineering Quality',
    category: 'Engineering',
    icon: WrenchScrewdriverIcon,
    iconColor: 'text-slate-600',
    description: 'Elevate code quality, testing coverage, and deployment reliability.',
    objective: { title: 'Achieve engineering excellence and reliability', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Increase test coverage to X%', type: 'OKR_KEY_RESULT' },
      { title: 'Reduce production incidents by X%', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve <X minute deploy times', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Marketing Growth',
    category: 'Marketing',
    icon: ArrowTrendingUpIcon,
    iconColor: 'text-pink-600',
    description: 'Drive awareness, traffic, and lead generation through marketing initiatives.',
    objective: { title: 'Accelerate brand awareness and lead generation', type: 'OKR_OBJECTIVE', priority: 'MEDIUM' },
    keyResults: [
      { title: 'Increase website traffic by X%', type: 'OKR_KEY_RESULT' },
      { title: 'Generate X marketing qualified leads', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve X% social media engagement rate', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Hiring & Onboarding',
    category: 'People',
    icon: UserGroupIcon,
    iconColor: 'text-teal-600',
    description: 'Scale the team effectively with a streamlined hiring and onboarding process.',
    objective: { title: 'Build a world-class hiring and onboarding process', type: 'OKR_OBJECTIVE', priority: 'MEDIUM' },
    keyResults: [
      { title: 'Hire X new team members by [Date]', type: 'OKR_KEY_RESULT' },
      { title: 'Reduce time-to-hire to <X days', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve >X% new hire 90-day retention', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Cost Reduction',
    category: 'Business',
    icon: ArrowTrendingDownIcon,
    iconColor: 'text-red-600',
    description: 'Optimize operational costs without compromising quality or growth.',
    objective: { title: 'Reduce operational costs by X%', type: 'OKR_OBJECTIVE', priority: 'MEDIUM' },
    keyResults: [
      { title: 'Reduce infrastructure spend by X%', type: 'OKR_KEY_RESULT' },
      { title: 'Automate X manual processes', type: 'OKR_KEY_RESULT' },
      { title: 'Renegotiate X vendor contracts', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Team Productivity',
    category: 'Engineering',
    icon: BoltIcon,
    iconColor: 'text-yellow-600',
    description: 'Improve team velocity and delivery predictability.',
    objective: { title: 'Increase team delivery velocity by X%', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Reduce average cycle time to X days', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve X% sprint completion rate', type: 'OKR_KEY_RESULT' },
      { title: 'Implement X process improvements', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Learning & Development',
    category: 'People',
    icon: BookOpenIcon,
    iconColor: 'text-indigo-600',
    description: 'Invest in continuous learning and professional growth for the team.',
    objective: { title: 'Foster a culture of continuous learning', type: 'OKR_OBJECTIVE', priority: 'MEDIUM' },
    keyResults: [
      { title: 'X% of team completes training program', type: 'OKR_KEY_RESULT' },
      { title: 'Launch X internal knowledge-sharing sessions', type: 'OKR_KEY_RESULT' },
      { title: 'Each team member earns X certification', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Customer Retention',
    category: 'Business',
    icon: ArrowPathIcon,
    iconColor: 'text-cyan-600',
    description: 'Reduce churn and increase lifetime value through proactive retention strategies.',
    objective: { title: 'Maximize customer retention and lifetime value', type: 'OKR_OBJECTIVE', priority: 'HIGH' },
    keyResults: [
      { title: 'Reduce monthly churn rate to <X%', type: 'OKR_KEY_RESULT' },
      { title: 'Increase average contract length to X months', type: 'OKR_KEY_RESULT' },
      { title: 'Achieve X% upsell rate on renewals', type: 'OKR_KEY_RESULT' },
    ],
  },
  {
    name: 'Process Improvement',
    category: 'Engineering',
    icon: WrenchScrewdriverIcon,
    iconColor: 'text-orange-600',
    description: 'Streamline workflows and eliminate bottlenecks across engineering.',
    objective: { title: 'Streamline engineering processes and eliminate bottlenecks', type: 'OKR_OBJECTIVE', priority: 'MEDIUM' },
    keyResults: [
      { title: 'Document X core processes with runbooks', type: 'OKR_KEY_RESULT' },
      { title: 'Reduce code review turnaround to <X hours', type: 'OKR_KEY_RESULT' },
      { title: 'Implement CI/CD for X% of services', type: 'OKR_KEY_RESULT' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface OKRTemplatesModalProps {
  open: boolean;
  onClose: () => void;
}

export function OKRTemplatesModal({ open, onClose }: OKRTemplatesModalProps) {
  const [category, setCategory] = useState('All');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (template: GoalTemplate) => {
      // Create objective
      const obj = await goalsApi.create({
        title: template.objective.title,
        type: template.objective.type,
        priority: template.objective.priority,
      } as CreateGoalInput);

      // Create key results as children
      for (const kr of template.keyResults) {
        await goalsApi.create({
          title: kr.title,
          type: kr.type,
          parentGoalId: obj.id,
        } as CreateGoalInput);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
      toast.success('OKR created from template!');
      onClose();
    },
    onError: () => toast.error('Failed to create from template'),
  });

  const filtered =
    category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-secondary-200/60 dark:border-white/[0.06] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200/60 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-amber-500" />
                    <Dialog.Title className="text-lg font-semibold text-secondary-900 dark:text-white">
                      OKR Templates
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                    <XMarkIcon className="h-5 w-5 text-secondary-500" />
                  </button>
                </div>

                {/* Category tabs */}
                <div className="px-6 py-3 border-b border-secondary-100 dark:border-secondary-700/50 flex items-center gap-1 overflow-x-auto">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
                        category === cat
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Template grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                  {filtered.map((tmpl) => (
                    <div
                      key={tmpl.name}
                      className="bg-secondary-50 dark:bg-secondary-900/40 rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-4 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-100 dark:bg-secondary-800`}>
                          <tmpl.icon className={`h-4 w-4 ${tmpl.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                            {tmpl.name}
                          </h3>
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-secondary-200 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400 font-medium">
                            {tmpl.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-2">
                        {tmpl.description}
                      </p>

                      {/* Preview KRs */}
                      <div className="mt-3 space-y-1">
                        {tmpl.keyResults.map((kr, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="px-1 py-0.5 rounded text-3xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              KR
                            </span>
                            <span className="text-2xs text-secondary-600 dark:text-secondary-300 break-words">
                              {kr.title}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => createMutation.mutate(tmpl)}
                        disabled={createMutation.isPending}
                        className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {createMutation.isPending ? 'Creating...' : 'Use Template'}
                      </button>
                    </div>
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
