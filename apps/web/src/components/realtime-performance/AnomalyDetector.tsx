/**
 * Feature 6: Instant Performance Anomaly Detector
 *
 * AI-based pattern detection for productivity, attendance, and quality metrics
 * with instant manager alerts
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface AnomalyResult {
  isAnomaly: boolean;
  anomalyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviationPercentage: number;
  zScore: number;
}

const api = {
  detectAnomalies: async (): Promise<AnomalyResult[]> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/anomalies/detect');
    const data = await res.json();
    return data.data;
  },
};

const severityConfig = {
  low: {
    color: 'blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Low',
    description: 'Minor deviation from normal',
  },
  medium: {
    color: 'yellow',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Medium',
    description: 'Noticeable pattern change',
  },
  high: {
    color: 'orange',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'High',
    description: 'Significant deviation detected',
  },
  critical: {
    color: 'red',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    label: 'Critical',
    description: 'Immediate attention required',
  },
};

const metricLabels: Record<string, string> = {
  productivity_score: 'Productivity Score',
  engagement_score: 'Engagement Score',
  active_minutes: 'Active Time',
  tasks_completed: 'Task Completion',
  focus_minutes: 'Focus Time',
  collaboration_score: 'Collaboration',
};

const ZScoreIndicator = ({ zScore }: { zScore: number }) => {
  const absScore = Math.abs(zScore);
  const isNegative = zScore < 0;

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1">
        <div className="relative h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-secondary-400 z-10" />
          {/* Z-score bar */}
          <div
            className={clsx(
              'absolute top-0 bottom-0 transition-all',
              isNegative
                ? 'bg-red-500 right-1/2'
                : 'bg-green-500 left-1/2'
            )}
            style={{
              width: `${Math.min(50, absScore * 10)}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-secondary-500 mt-1">
          <span>-3σ</span>
          <span>0</span>
          <span>+3σ</span>
        </div>
      </div>
      <div className={clsx(
        'text-sm font-semibold',
        isNegative ? 'text-red-500' : 'text-green-500'
      )}>
        {(zScore ?? 0) > 0 ? '+' : ''}{(zScore ?? 0).toFixed(1)}σ
      </div>
    </div>
  );
};

const AnomalyCard = ({ anomaly }: { anomaly: AnomalyResult }) => {
  const config = anomaly.severity
    ? severityConfig[anomaly.severity]
    : severityConfig.low;

  const isNegativeDeviation = anomaly.deviationPercentage < 0;
  const TrendIcon = isNegativeDeviation ? ArrowTrendingDownIcon : ArrowTrendingUpIcon;

  return (
    <div className={clsx('rounded-xl border p-5', config.bg, config.border)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={clsx('p-2 rounded-lg', config.bg)}>
            <ShieldExclamationIcon className={clsx('h-5 w-5', config.text)} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', config.bg, config.text)}>
                {config.label}
              </span>
              <span className="text-xs text-secondary-500 dark:text-secondary-400 capitalize">
                {anomaly.anomalyType?.replace('_', ' ')}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mt-1">
              {metricLabels[anomaly.metricName] || anomaly.metricName}
            </h4>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              {config.description}
            </p>
          </div>
        </div>
        <TrendIcon className={clsx(
          'h-5 w-5',
          isNegativeDeviation ? 'text-red-500' : 'text-green-500'
        )} />
      </div>

      {/* Values comparison */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Expected</div>
          <div className="text-lg font-semibold text-secondary-900 dark:text-white">
            {(anomaly.expectedValue ?? 0).toFixed(1)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Actual</div>
          <div className={clsx(
            'text-lg font-semibold',
            isNegativeDeviation ? 'text-red-600' : 'text-green-600'
          )}>
            {(anomaly.actualValue ?? 0).toFixed(1)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Deviation</div>
          <div className={clsx(
            'text-lg font-semibold',
            isNegativeDeviation ? 'text-red-600' : 'text-green-600'
          )}>
            {(anomaly.deviationPercentage ?? 0) > 0 ? '+' : ''}{(anomaly.deviationPercentage ?? 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Z-Score indicator */}
      <div className="mt-4">
        <div className="text-xs text-secondary-500 dark:text-secondary-400 mb-2">Statistical Deviation (Z-Score)</div>
        <ZScoreIndicator zScore={anomaly.zScore} />
      </div>
    </div>
  );
};

const SeveritySummary = ({ anomalies }: { anomalies: AnomalyResult[] }) => {
  const counts = {
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(counts).map(([severity, count]) => {
        const config = severityConfig[severity as keyof typeof severityConfig];
        return (
          <div
            key={severity}
            className={clsx('rounded-xl border p-4 text-center', config.bg, config.border)}
          >
            <div className={clsx('text-2xl font-bold', config.text)}>{count}</div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400 capitalize">{severity}</div>
          </div>
        );
      })}
    </div>
  );
};

export function AnomalyDetector() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const { data: anomalies, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['anomalyDetection'],
    queryFn: api.detectAnomalies,
    refetchInterval: 300000, // Check every 5 minutes
  });

  const detectedAnomalies = anomalies?.filter(a => a.isAnomaly) || [];
  const filteredAnomalies = filter === 'all'
    ? detectedAnomalies
    : detectedAnomalies.filter(a => a.severity === filter);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
            <ShieldExclamationIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Performance Anomaly Detector
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              AI-powered pattern detection with instant alerts
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isFetching ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Run Detection
            </>
          )}
        </button>
      </div>

      {/* Severity Summary */}
      <SeveritySummary anomalies={detectedAnomalies} />

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">How anomaly detection works</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Our AI analyzes your performance patterns over the past 30 days to establish a baseline.
              When recent metrics deviate significantly (using statistical z-scores), we flag them as anomalies
              with severity based on the magnitude of deviation.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-secondary-200/60 dark:border-white/[0.06]">
        {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level as any)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              filter === level
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700'
            )}
          >
            {level}
            {level !== 'all' && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-secondary-100 dark:bg-secondary-800">
                {detectedAnomalies.filter(a => a.severity === level).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      {filteredAnomalies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAnomalies.map((anomaly, idx) => (
            <AnomalyCard key={idx} anomaly={anomaly} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06]">
          <ChartBarIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white">No anomalies detected</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {filter !== 'all'
              ? `No ${filter} severity anomalies found`
              : 'Your performance metrics are within normal ranges'}
          </p>
        </div>
      )}

      {/* Last checked timestamp */}
      <div className="flex items-center justify-center space-x-2 text-xs text-secondary-500 dark:text-secondary-400">
        <ClockIcon className="h-4 w-4" />
        <span>Last analyzed: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}

export default AnomalyDetector;
