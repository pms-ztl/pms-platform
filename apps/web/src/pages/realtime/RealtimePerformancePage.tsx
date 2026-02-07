/**
 * Real-Time Performance Dashboard Page
 *
 * Combines all 8 real-time performance tracking features:
 * 1. Hourly Performance Tracker
 * 2. 24/7 Activity Monitor
 * 3. Real-Time Goal Progress Dashboard
 * 4. Deadline Proximity Alert System
 * 5. Live Workload Distribution Analyzer
 * 6. Instant Performance Anomaly Detector
 * 7. Real-Time Communication Sentiment Gauge
 * 8. Live Project Milestone Tracker
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  FlagIcon,
  BellAlertIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  FaceSmileIcon,
  CheckBadgeIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
  ArrowPathIcon,
  SignalIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import {
  HourlyPerformanceTracker,
  GoalProgressDashboard,
  DeadlineAlertSystem,
  WorkloadDistributionAnalyzer,
  AnomalyDetector,
  SentimentGauge,
  MilestoneTracker,
} from '@/components/realtime-performance';
import { ActivityHeatmap } from '@/components/realtime-performance/ActivityHeatmap';

// ─── Animated Card wrapper for the deck-of-cards overview ───
function OverviewCard({
  icon: Icon,
  title,
  subtitle,
  gradient,
  index,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  gradient: string;
  index: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '60px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        'transform transition-all duration-700 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-12'
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        {/* Gradient top accent bar */}
        <div className={clsx('h-1 w-full bg-gradient-to-r', gradient)} />

        {/* Section header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-2">
          <div className="flex items-center gap-4">
            <div className={clsx(
              'flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br shadow-lg',
              gradient
            )}>
              <Icon className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Decorative pulse dot */}
          <span className="relative flex h-3 w-3">
            <span className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 bg-gradient-to-r',
              gradient
            )} />
            <span className={clsx(
              'relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r',
              gradient
            )} />
          </span>
        </div>

        {/* Card content */}
        <div className="px-8 pb-8 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

type FeatureTab =
  | 'overview'
  | 'hourly'
  | 'goals'
  | 'deadlines'
  | 'workload'
  | 'anomalies'
  | 'sentiment'
  | 'milestones';

interface TabConfig {
  id: FeatureTab;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const tabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: ChartBarIcon,
    description: 'Real-time performance summary',
    color: 'from-primary-500 to-cyan-500',
  },
  {
    id: 'hourly',
    label: 'Hourly Tracker',
    shortLabel: 'Hourly',
    icon: ClockIcon,
    description: 'Track hourly productivity metrics',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'goals',
    label: 'Goal Progress',
    shortLabel: 'Goals',
    icon: FlagIcon,
    description: 'Real-time goal tracking',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'deadlines',
    label: 'Deadline Alerts',
    shortLabel: 'Deadlines',
    icon: BellAlertIcon,
    description: 'Deadline proximity monitoring',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'workload',
    label: 'Workload',
    shortLabel: 'Workload',
    icon: ScaleIcon,
    description: 'Workload distribution analysis',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'anomalies',
    label: 'Anomaly Detector',
    shortLabel: 'Anomalies',
    icon: ShieldExclamationIcon,
    description: 'AI-powered pattern detection',
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'sentiment',
    label: 'Sentiment Gauge',
    shortLabel: 'Sentiment',
    icon: FaceSmileIcon,
    description: 'Communication sentiment analysis',
    color: 'from-pink-500 to-rose-400',
  },
  {
    id: 'milestones',
    label: 'Milestones',
    shortLabel: 'Milestones',
    icon: CheckBadgeIcon,
    description: 'Project milestone tracking',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'heatmap',
    label: 'Activity Heatmap',
    shortLabel: 'Heatmap',
    icon: CalendarDaysIcon,
    description: 'Day-by-day activity visualization',
    color: 'from-emerald-500 to-green-500',
  },
];

const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => (
  <div className={clsx(
    'flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium',
    isConnected
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  )}>
    <SignalIcon className={clsx('h-3.5 w-3.5', isConnected ? 'animate-pulse' : '')} />
    <span>{isConnected ? 'Live' : 'Connecting...'}</span>
  </div>
);

export function RealtimePerformancePage() {
  const [activeTab, setActiveTab] = useState<FeatureTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simulate WebSocket connection status
  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLastUpdated(new Date());
    // Trigger data refresh in child components through context or callback
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Hero summary banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-8 shadow-xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-60" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Performance Overview
                  </h2>
                  <p className="text-indigo-100 mt-1 text-sm max-w-xl">
                    A comprehensive, real-time snapshot of your productivity, goals, workload, and team health — all in one place.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                    Live Data
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Deck of Cards: Each section full-width ─── */}
            <OverviewCard
              icon={ClockIcon}
              title="Hourly Performance"
              subtitle="Track productivity, focus time, and engagement metrics hour-by-hour"
              gradient="from-blue-500 to-indigo-500"
              index={0}
            >
              <HourlyPerformanceTracker />
            </OverviewCard>

            <OverviewCard
              icon={FlagIcon}
              title="Goal Progress"
              subtitle="Real-time status of active goals with trend indicators"
              gradient="from-emerald-500 to-teal-500"
              index={1}
            >
              <GoalProgressDashboard />
            </OverviewCard>

            <OverviewCard
              icon={BellAlertIcon}
              title="Deadline Alerts"
              subtitle="Approaching deadlines and completion probability monitoring"
              gradient="from-amber-500 to-orange-500"
              index={2}
            >
              <DeadlineAlertSystem />
            </OverviewCard>

            <OverviewCard
              icon={ScaleIcon}
              title="Workload Distribution"
              subtitle="Capacity utilization, balance status, and redistribution recommendations"
              gradient="from-violet-500 to-purple-500"
              index={3}
            >
              <WorkloadDistributionAnalyzer />
            </OverviewCard>

            <OverviewCard
              icon={ShieldExclamationIcon}
              title="Anomaly Detector"
              subtitle="AI-powered detection of unusual performance patterns and deviations"
              gradient="from-red-500 to-rose-500"
              index={4}
            >
              <AnomalyDetector />
            </OverviewCard>

            <OverviewCard
              icon={FaceSmileIcon}
              title="Team Sentiment"
              subtitle="Communication sentiment analysis, morale tracking, and stress indicators"
              gradient="from-pink-500 to-rose-400"
              index={5}
            >
              <SentimentGauge />
            </OverviewCard>

            <OverviewCard
              icon={CheckBadgeIcon}
              title="Milestones"
              subtitle="Project milestone tracking with dependency visualization and progress events"
              gradient="from-cyan-500 to-blue-500"
              index={6}
            >
              <MilestoneTracker />
            </OverviewCard>
          </div>
        );

      case 'hourly':
        return <HourlyPerformanceTracker />;

      case 'goals':
        return <GoalProgressDashboard />;

      case 'deadlines':
        return <DeadlineAlertSystem />;

      case 'workload':
        return <WorkloadDistributionAnalyzer />;

      case 'anomalies':
        return <AnomalyDetector />;

      case 'sentiment':
        return <SentimentGauge />;

      case 'milestones':
        return <MilestoneTracker />;

      case 'heatmap':
        return <ActivityHeatmap mode="individual" />;

      default:
        return null;
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className={clsx(
          'mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300',
          activeTab === 'overview' ? 'max-w-[1400px] lg:px-10' : 'max-w-7xl'
        )}>
          <div className="flex items-center justify-between h-16">
            {/* Title & Mobile Menu Toggle */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Bars3BottomLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                <div className={clsx(
                  'p-2 rounded-lg bg-gradient-to-br',
                  currentTab.color
                )}>
                  <currentTab.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    Real-Time Performance
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {currentTab.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center space-x-4">
              <ConnectionStatus isConnected={isConnected} />

              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title="Refresh data"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>

              <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex space-x-1 pb-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r text-white shadow-lg ' + tab.color
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-16 w-72 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r text-white shadow-lg ' + tab.color
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{tab.label}</div>
                    <div className={clsx(
                      'text-xs',
                      activeTab === tab.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={clsx(
        'mx-auto py-8 transition-all duration-300',
        activeTab === 'overview'
          ? 'max-w-[1400px] px-4 sm:px-6 lg:px-10'
          : 'max-w-7xl px-4 sm:px-6 lg:px-8'
      )}>
        {renderContent()}
      </main>
    </div>
  );
}

export default RealtimePerformancePage;
