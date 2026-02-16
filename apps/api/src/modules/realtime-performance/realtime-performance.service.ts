/**
 * Real-Time Performance Tracking Service  (Facade)
 *
 * Delegates to focused sub-services while preserving the original public API.
 * Controllers, routes, and WebSocket handlers continue to import from this file.
 *
 * Sub-services:
 *  - GoalTrackingService    — Features 3 & 8  (goal progress, milestones)
 *  - ReviewTrackingService  — Features 1, 2, 5 & 9  (hourly metrics, activity, workload, heatmap)
 *  - FeedbackTrackingService — Feature 7  (sentiment, team morale)
 *  - AlertEngineService     — Features 4 & 6  (deadline alerts, anomaly detection)
 */

import { EventEmitter } from 'events';
import { goalTrackingService } from './goal-tracking.service';
import { reviewTrackingService } from './review-tracking.service';
import { feedbackTrackingService } from './feedback-tracking.service';
import { alertEngineService } from './alert-engine.service';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface HourlyMetrics {
  userId: string;
  tenantId: string;
  metricHour: Date;
  tasksCompleted: number;
  tasksCreated: number;
  activeMinutes: number;
  focusMinutes: number;
  meetingMinutes: number;
  goalUpdates: number;
  goalProgressDelta: number;
  interactionsCount: number;
  feedbackGiven: number;
  feedbackReceived: number;
  messagesSent: number;
  collaborationScore: number;
  productivityScore: number;
  engagementScore: number;
  performanceScore: number;
}

export interface ActivityEventInput {
  tenantId: string;
  userId: string;
  eventType: string;
  eventSubtype?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  durationSeconds?: number;
  isProductive?: boolean;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviationPercentage: number;
  zScore: number;
}

export interface WorkloadAnalysis {
  userId: string;
  workloadScore: number;
  balanceStatus: 'underloaded' | 'optimal' | 'heavy' | 'overloaded';
  activeGoals: number;
  activeTasks: number;
  pendingReviews: number;
  estimatedHoursRequired: number;
  availableHours: number;
  capacityUtilization: number;
  redistributionRecommended: boolean;
  recommendedActions: string[];
}

export interface SentimentAnalysis {
  overallScore: number;
  positivityRatio: number;
  collaborationSentiment: number;
  stressIndicators: number;
  moraleAlert: boolean;
  moraleAlertReason?: string;
}

export interface MilestoneUpdate {
  milestoneId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  progressPercentage: number;
  velocityBasedEta?: Date;
  delayDays: number;
}

export interface GoalProgressDashboard {
  totalGoals: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    status: 'on_track' | 'at_risk' | 'off_track';
    dueDate: Date | null;
    daysRemaining: number | null;
    trend: 'improving' | 'stable' | 'declining';
  }>;
}

export interface DeadlineAlertData {
  entityType: string;
  entityId: string;
  entityTitle: string;
  deadline: Date;
  currentProgress: number;
  completionProbability: number;
  alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
}

// ============================================================================
// Real-Time Performance Service  (Facade)
// ============================================================================

export class RealtimePerformanceService extends EventEmitter {
  constructor() {
    super();
  }

  // ==========================================================================
  // Feature 1: Hourly Performance Tracker  (→ ReviewTrackingService)
  // ==========================================================================

  async recordHourlyMetrics(metrics: HourlyMetrics): Promise<void> {
    await reviewTrackingService.recordHourlyMetrics(metrics);
    this.emit('hourlyMetricsUpdated', {
      userId: metrics.userId,
      hour: new Date(new Date(metrics.metricHour).setMinutes(0, 0, 0)),
    });
  }

  async getHourlyMetrics(
    tenantId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return reviewTrackingService.getHourlyMetrics(tenantId, userId, startTime, endTime);
  }

  async getCurrentPerformanceSnapshot(tenantId: string, userId: string): Promise<any> {
    return reviewTrackingService.getCurrentPerformanceSnapshot(tenantId, userId);
  }

  // ==========================================================================
  // Feature 2: 24/7 Activity Monitor  (→ ReviewTrackingService)
  // ==========================================================================

  async recordActivityEvent(event: ActivityEventInput): Promise<void> {
    const inactivityDetected = await reviewTrackingService.recordActivityEvent(event);

    // Emit event for real-time monitoring
    this.emit('activityRecorded', event);

    // If no activity in the last hour during work hours, emit alert
    if (inactivityDetected) {
      this.emit('inactivityAlert', {
        userId: event.userId,
        duration: 60,
        message: 'No activity detected in the past hour during work hours',
      });
    }
  }

  async getActivityStream(
    tenantId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    return reviewTrackingService.getActivityStream(tenantId, userId, limit, offset);
  }

  async getActivitySummary(
    tenantId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any> {
    return reviewTrackingService.getActivitySummary(tenantId, userId, startTime, endTime);
  }

  // ==========================================================================
  // Feature 3: Real-Time Goal Progress Dashboard  (→ GoalTrackingService)
  // ==========================================================================

  async getGoalProgressDashboard(
    tenantId: string,
    userId: string,
    includeTeamGoals: boolean = false
  ): Promise<GoalProgressDashboard> {
    return goalTrackingService.getGoalProgressDashboard(tenantId, userId, includeTeamGoals);
  }

  // ==========================================================================
  // Feature 4: Deadline Proximity Alert System  (→ AlertEngineService)
  // ==========================================================================

  async checkDeadlineAlerts(tenantId: string, userId: string): Promise<DeadlineAlertData[]> {
    const alerts = await alertEngineService.checkDeadlineAlerts(tenantId, userId);

    if (alerts.length > 0) {
      this.emit('deadlineAlerts', { userId, alerts });
    }

    return alerts;
  }

  async getActiveDeadlineAlerts(tenantId: string, userId: string): Promise<any[]> {
    return alertEngineService.getActiveDeadlineAlerts(tenantId, userId);
  }

  async acknowledgeDeadlineAlert(tenantId: string, userId: string, alertId: string): Promise<void> {
    return alertEngineService.acknowledgeDeadlineAlert(tenantId, userId, alertId);
  }

  async snoozeDeadlineAlert(tenantId: string, userId: string, alertId: string, hours: number): Promise<void> {
    return alertEngineService.snoozeDeadlineAlert(tenantId, userId, alertId, hours);
  }

  // ==========================================================================
  // Feature 5: Live Workload Distribution Analyzer  (→ ReviewTrackingService)
  // ==========================================================================

  async analyzeWorkload(tenantId: string, userId: string): Promise<WorkloadAnalysis> {
    const analysis = await reviewTrackingService.analyzeWorkload(tenantId, userId);
    this.emit('workloadAnalyzed', {
      userId,
      workloadScore: analysis.workloadScore,
      balanceStatus: analysis.balanceStatus,
    });
    return analysis;
  }

  async getTeamWorkloadDistribution(tenantId: string, managerId: string): Promise<any> {
    return reviewTrackingService.getTeamWorkloadDistribution(tenantId, managerId);
  }

  // ==========================================================================
  // Feature 6: Instant Performance Anomaly Detector  (→ AlertEngineService)
  // ==========================================================================

  async detectAnomalies(tenantId: string, userId: string): Promise<AnomalyDetectionResult[]> {
    const anomalies = await alertEngineService.detectAnomalies(tenantId, userId);

    for (const anomaly of anomalies.filter(a => a.isAnomaly)) {
      this.emit('anomalyDetected', { userId, anomaly });
    }

    return anomalies;
  }

  // ==========================================================================
  // Feature 7: Real-Time Communication Sentiment Gauge  (→ FeedbackTrackingService)
  // ==========================================================================

  async analyzeSentiment(
    tenantId: string,
    userId: string,
    periodDays: number = 7
  ): Promise<SentimentAnalysis> {
    const result = await feedbackTrackingService.analyzeSentiment(tenantId, userId, periodDays);

    if (result.moraleAlert) {
      this.emit('moraleAlert', {
        userId,
        overallScore: result.overallScore,
        reason: result.moraleAlertReason,
      });
    }

    return result;
  }

  async getTeamMorale(tenantId: string, managerId: string): Promise<any> {
    return feedbackTrackingService.getTeamMorale(tenantId, managerId);
  }

  // ==========================================================================
  // Feature 8: Live Project Milestone Tracker  (→ GoalTrackingService)
  // ==========================================================================

  async createMilestone(
    tenantId: string,
    data: {
      goalId?: string;
      teamId?: string;
      title: string;
      description?: string;
      milestoneType: string;
      plannedDate: Date;
      ownerId?: string;
      dependsOn?: string[];
    }
  ): Promise<any> {
    return goalTrackingService.createMilestone(tenantId, data);
  }

  async updateMilestoneProgress(
    milestoneId: string,
    update: {
      status?: string;
      progressPercentage?: number;
      actualDate?: Date;
      notes?: string;
    },
    triggeredById?: string
  ): Promise<MilestoneUpdate> {
    const result = await goalTrackingService.updateMilestoneProgress(milestoneId, update, triggeredById);

    this.emit('milestoneUpdated', {
      milestoneId,
      status: result.status,
      progressPercentage: result.progressPercentage,
      delayDays: result.delayDays,
    });

    return result;
  }

  async getGoalMilestones(tenantId: string, goalId: string): Promise<any[]> {
    return goalTrackingService.getGoalMilestones(tenantId, goalId);
  }

  async getMilestoneTimeline(tenantId: string, goalId?: string, teamId?: string): Promise<any> {
    return goalTrackingService.getMilestoneTimeline(tenantId, goalId, teamId);
  }

  async detectMilestones(tenantId: string, goalId: string): Promise<any[]> {
    return goalTrackingService.detectMilestones(tenantId, goalId);
  }

  // ==========================================================================
  // Feature 9: Activity Heatmap  (→ ReviewTrackingService)
  // ==========================================================================

  async getActivityHeatmap(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number; level: number }>> {
    return reviewTrackingService.getActivityHeatmap(tenantId, userId, startDate, endDate);
  }

  async getTeamActivityHeatmap(
    tenantId: string,
    managerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    teamAggregate: Array<{ date: string; count: number; level: number }>;
    members: Array<{
      userId: string;
      name: string;
      heatmap: Array<{ date: string; count: number; level: number }>;
    }>;
  }> {
    return reviewTrackingService.getTeamActivityHeatmap(tenantId, managerId, startDate, endDate);
  }
}

// Export singleton instance
export const realtimePerformanceService = new RealtimePerformanceService();
