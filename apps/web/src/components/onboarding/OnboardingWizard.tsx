import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { WelcomeStep } from './WelcomeStep';
import { ProfileStep } from './ProfileStep';
import { GoalStep } from './GoalStep';
import clsx from 'clsx';

interface OnboardingWizardProps {
  user: { id: string; firstName: string };
  onComplete: () => void;
  onSkip: () => void;
}

const STORAGE_KEY = (userId: string) => `pms-onboarding-done-${userId}`;

const STEPS = [
  { label: 'Welcome', shortLabel: 'Hi' },
  { label: 'Profile', shortLabel: 'Profile' },
  { label: 'Goal', shortLabel: 'Goal' },
  { label: 'Done', shortLabel: 'Done' },
];

export function OnboardingWizard({ user, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const markDone = () => {
    try {
      localStorage.setItem(STORAGE_KEY(user.id), 'true');
    } catch { /* storage full */ }
  };

  const handleComplete = () => {
    markDone();
    onComplete();
  };

  const handleSkipAll = () => {
    markDone();
    onSkip();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl">
        {/* Close / Skip button */}
        <button
          onClick={handleSkipAll}
          className="absolute top-4 right-4 p-2 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors z-10"
          title="Skip onboarding"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Progress Bar */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={clsx(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors',
                    i < currentStep
                      ? 'bg-primary-600 text-white'
                      : i === currentStep
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 ring-2 ring-primary-600'
                        : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-400'
                  )}
                >
                  {i < currentStep ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'hidden sm:block w-16 lg:w-24 h-0.5 mx-2 transition-colors',
                      i < currentStep
                        ? 'bg-primary-600'
                        : 'bg-secondary-200 dark:bg-secondary-700'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-1">
            {STEPS.map((step, i) => (
              <span
                key={i}
                className={clsx(
                  'text-2xs font-medium',
                  i <= currentStep
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-secondary-400 dark:text-secondary-500'
                )}
              >
                {step.shortLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-8 py-6">
          {currentStep === 0 && (
            <WelcomeStep firstName={user.firstName} onNext={handleNext} />
          )}

          {currentStep === 1 && (
            <ProfileStep onNext={handleNext} onSkip={handleNext} />
          )}

          {currentStep === 2 && (
            <GoalStep onNext={handleNext} onSkip={handleNext} />
          )}

          {currentStep === 3 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
                You're All Set!
              </h2>
              <p className="text-secondary-500 dark:text-secondary-400 max-w-md mx-auto mb-8">
                Your account is ready. Explore your dashboard, check out your goals, and connect with your team.
              </p>
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-8 py-3 text-base font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
              >
                Go to Dashboard
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
