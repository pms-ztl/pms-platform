import { SparklesIcon, RocketLaunchIcon, UserCircleIcon, FlagIcon } from '@heroicons/react/24/outline';

interface WelcomeStepProps {
  firstName: string;
  onNext: () => void;
}

const STEPS_PREVIEW = [
  { icon: UserCircleIcon, title: 'Complete Your Profile', desc: 'Add your job title, display name, and avatar' },
  { icon: FlagIcon, title: 'Set Your First Goal', desc: 'Create a SMART or OKR goal to get started' },
  { icon: RocketLaunchIcon, title: 'Ready to Go!', desc: 'Explore your dashboard and team tools' },
];

export function WelcomeStep({ firstName, onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 mb-6">
        <SparklesIcon className="h-10 w-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
        Welcome, {firstName}!
      </h2>
      <p className="text-secondary-500 dark:text-secondary-400 text-base max-w-md mx-auto mb-8">
        Let's set up your PMS account in just a couple of quick steps so you can hit the ground running.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
        {STEPS_PREVIEW.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-xl bg-secondary-50 dark:bg-secondary-700/50 border border-secondary-200 dark:border-secondary-600"
          >
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
              <step.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">{step.title}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-8 py-3 text-base font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
      >
        Let's Get Started
        <RocketLaunchIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
