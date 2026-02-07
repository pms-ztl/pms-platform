/**
 * Review Cycle Automation Service
 * Implements Feature 11: Intelligent Review Cycle Automation
 *
 * Provides:
 * - Template-based cycle configuration
 * - ML-optimized reminder scheduling
 * - Predictive completion modeling
 * - Dynamic escalation based on completion velocity
 * - Workflow automation
 */

export interface CycleConfig {
  name: string;
  type: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'PROBATION' | 'PROJECT' | 'AD_HOC';
  startDate: Date;
  endDate: Date;
  phases: PhaseConfig[];
  participants: ParticipantConfig[];
  settings: CycleSettings;
}

export interface PhaseConfig {
  name: string;
  type: 'SELF_ASSESSMENT' | 'MANAGER_REVIEW' | 'PEER_REVIEW' | 'CALIBRATION' | 'FINALIZATION' | 'SHARING';
  startDate: Date;
  endDate: Date;
  reminderDays: number[];
  escalationDays: number;
  required: boolean;
}

export interface ParticipantConfig {
  userId: string;
  role: 'reviewee' | 'reviewer' | 'calibrator' | 'facilitator';
  phases: string[];
}

export interface CycleSettings {
  includeGoals: boolean;
  includeFeedback: boolean;
  include360: boolean;
  requireAcknowledgment: boolean;
  allowLateSubmissions: boolean;
  autoProgressPhases: boolean;
  reminderChannels: ('email' | 'slack' | 'in_app')[];
}

export interface ReminderSchedule {
  userId: string;
  scheduledAt: Date;
  type: 'initial' | 'reminder' | 'escalation' | 'final';
  phase: string;
  channel: string;
  priority: 'low' | 'medium' | 'high';
  template: string;
  context: Record<string, unknown>;
}

export interface CompletionPrediction {
  userId: string;
  phase: string;
  predictedCompletionDate: Date;
  onTimeConfidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  suggestedIntervention?: string;
}

export interface AutomatedWorkflow {
  cycleId: string;
  currentPhase: string;
  nextPhase?: string;
  transitionDate?: Date;
  pendingActions: WorkflowAction[];
  completedActions: WorkflowAction[];
  blockers: WorkflowBlocker[];
}

export interface WorkflowAction {
  id: string;
  type: 'send_reminder' | 'escalate' | 'transition_phase' | 'notify_hr' | 'generate_report';
  scheduledAt: Date;
  executedAt?: Date;
  status: 'pending' | 'executed' | 'skipped' | 'failed';
  target?: string;
  data: Record<string, unknown>;
}

export interface WorkflowBlocker {
  type: 'incomplete_reviews' | 'missing_calibration' | 'pending_approval';
  description: string;
  affectedUsers: string[];
  resolution: string;
}

export interface HistoricalData {
  userId: string;
  cycleType: string;
  phase: string;
  remindersSent: number;
  completionTime: number; // days from phase start
  wasLate: boolean;
}

export class ReviewCycleAutomationService {
  /**
   * Generates optimized reminder schedule based on historical patterns
   */
  generateReminderSchedule(
    config: CycleConfig,
    historicalData: HistoricalData[]
  ): ReminderSchedule[] {
    const schedules: ReminderSchedule[] = [];
    const userPatterns = this.analyzeUserPatterns(historicalData);

    for (const phase of config.phases) {
      for (const participant of config.participants) {
        if (!participant.phases.includes(phase.name)) continue;

        const pattern = userPatterns.get(participant.userId);
        const optimalDays = this.calculateOptimalReminderDays(
          phase,
          pattern
        );

        // Initial notification
        schedules.push({
          userId: participant.userId,
          scheduledAt: phase.startDate,
          type: 'initial',
          phase: phase.name,
          channel: this.selectChannel(config.settings.reminderChannels, 'initial'),
          priority: 'medium',
          template: `${phase.type}_STARTED`,
          context: {
            phaseName: phase.name,
            endDate: phase.endDate,
            daysRemaining: this.daysBetween(phase.startDate, phase.endDate),
          },
        });

        // Optimized reminders
        for (const day of optimalDays) {
          const reminderDate = this.addDays(phase.startDate, day);
          if (reminderDate >= phase.endDate) continue;

          const daysRemaining = this.daysBetween(reminderDate, phase.endDate);
          const priority = daysRemaining <= 2 ? 'high' : daysRemaining <= 5 ? 'medium' : 'low';

          schedules.push({
            userId: participant.userId,
            scheduledAt: reminderDate,
            type: 'reminder',
            phase: phase.name,
            channel: this.selectChannel(config.settings.reminderChannels, 'reminder', daysRemaining),
            priority,
            template: `${phase.type}_REMINDER`,
            context: {
              phaseName: phase.name,
              daysRemaining,
              urgency: priority,
            },
          });
        }

        // Final reminder
        const finalReminderDate = this.addDays(phase.endDate, -1);
        if (finalReminderDate > phase.startDate) {
          schedules.push({
            userId: participant.userId,
            scheduledAt: finalReminderDate,
            type: 'final',
            phase: phase.name,
            channel: this.selectChannel(config.settings.reminderChannels, 'final'),
            priority: 'high',
            template: `${phase.type}_FINAL_REMINDER`,
            context: {
              phaseName: phase.name,
              daysRemaining: 1,
            },
          });
        }

        // Escalation
        const escalationDate = this.addDays(phase.endDate, phase.escalationDays);
        schedules.push({
          userId: participant.userId,
          scheduledAt: escalationDate,
          type: 'escalation',
          phase: phase.name,
          channel: 'email',
          priority: 'high',
          template: `${phase.type}_ESCALATION`,
          context: {
            phaseName: phase.name,
            daysOverdue: phase.escalationDays,
          },
        });
      }
    }

    return schedules.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  /**
   * Predicts completion likelihood for participants
   */
  predictCompletion(
    config: CycleConfig,
    currentProgress: Map<string, number>, // userId -> progress percentage
    historicalData: HistoricalData[]
  ): CompletionPrediction[] {
    const predictions: CompletionPrediction[] = [];
    const userPatterns = this.analyzeUserPatterns(historicalData);

    for (const phase of config.phases) {
      const phaseDuration = this.daysBetween(phase.startDate, phase.endDate);
      const daysSinceStart = this.daysBetween(phase.startDate, new Date());

      for (const participant of config.participants) {
        if (!participant.phases.includes(phase.name)) continue;

        const progress = currentProgress.get(`${participant.userId}:${phase.name}`) ?? 0;
        const pattern = userPatterns.get(participant.userId);

        // Calculate predicted completion
        const { predictedDays, confidence, factors } = this.calculatePrediction(
          progress,
          daysSinceStart,
          phaseDuration,
          pattern
        );

        const predictedDate = this.addDays(phase.startDate, predictedDays);
        const willBeOnTime = predictedDate <= phase.endDate;

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (!willBeOnTime) riskLevel = 'high';
        else if (confidence < 0.6) riskLevel = 'medium';

        const prediction: CompletionPrediction = {
          userId: participant.userId,
          phase: phase.name,
          predictedCompletionDate: predictedDate,
          onTimeConfidence: Math.round(confidence * 100),
          riskLevel,
          factors,
        };

        if (riskLevel !== 'low') {
          prediction.suggestedIntervention = this.suggestIntervention(riskLevel, factors, pattern);
        }

        predictions.push(prediction);
      }
    }

    return predictions;
  }

  /**
   * Creates automated workflow for a cycle
   */
  createWorkflow(config: CycleConfig): AutomatedWorkflow {
    const now = new Date();
    let currentPhase = '';
    let nextPhase: string | undefined;
    let transitionDate: Date | undefined;

    // Determine current and next phase
    for (let i = 0; i < config.phases.length; i++) {
      const phase = config.phases[i];
      if (now >= phase.startDate && now < phase.endDate) {
        currentPhase = phase.name;
        if (i < config.phases.length - 1) {
          nextPhase = config.phases[i + 1].name;
          transitionDate = phase.endDate;
        }
        break;
      }
    }

    // Generate pending actions
    const pendingActions: WorkflowAction[] = [];

    // Phase transition action
    if (nextPhase && transitionDate && config.settings.autoProgressPhases) {
      pendingActions.push({
        id: `transition_${currentPhase}_${nextPhase}`,
        type: 'transition_phase',
        scheduledAt: transitionDate,
        status: 'pending',
        data: {
          fromPhase: currentPhase,
          toPhase: nextPhase,
        },
      });
    }

    // Cycle completion report
    const lastPhase = config.phases[config.phases.length - 1];
    pendingActions.push({
      id: 'generate_completion_report',
      type: 'generate_report',
      scheduledAt: lastPhase.endDate,
      status: 'pending',
      data: {
        reportType: 'cycle_completion',
        cycleType: config.type,
      },
    });

    return {
      cycleId: `${config.name}_${config.startDate.getTime()}`,
      currentPhase,
      nextPhase,
      transitionDate,
      pendingActions,
      completedActions: [],
      blockers: [],
    };
  }

  /**
   * Checks for blockers preventing phase transition
   */
  checkBlockers(
    config: CycleConfig,
    currentPhase: string,
    completionStatus: Map<string, boolean> // `${userId}:${phase}` -> completed
  ): WorkflowBlocker[] {
    const blockers: WorkflowBlocker[] = [];
    const phase = config.phases.find(p => p.name === currentPhase);
    if (!phase || !phase.required) return blockers;

    // Check incomplete reviews
    const incompleteUsers: string[] = [];
    for (const participant of config.participants) {
      if (participant.phases.includes(currentPhase)) {
        const key = `${participant.userId}:${currentPhase}`;
        if (!completionStatus.get(key)) {
          incompleteUsers.push(participant.userId);
        }
      }
    }

    if (incompleteUsers.length > 0) {
      blockers.push({
        type: 'incomplete_reviews',
        description: `${incompleteUsers.length} participant(s) have not completed ${currentPhase}`,
        affectedUsers: incompleteUsers,
        resolution: 'Send targeted reminders or extend deadline',
      });
    }

    return blockers;
  }

  /**
   * Generates cycle configuration from template
   */
  generateFromTemplate(
    templateType: 'annual' | 'quarterly' | 'probation',
    startDate: Date,
    participants: ParticipantConfig[]
  ): CycleConfig {
    const templates: Record<string, Omit<CycleConfig, 'startDate' | 'participants'>> = {
      annual: {
        name: `Annual Review ${startDate.getFullYear()}`,
        type: 'ANNUAL',
        endDate: this.addDays(startDate, 60),
        phases: [
          {
            name: 'Self Assessment',
            type: 'SELF_ASSESSMENT',
            startDate: startDate,
            endDate: this.addDays(startDate, 14),
            reminderDays: [3, 7, 11],
            escalationDays: 3,
            required: true,
          },
          {
            name: 'Manager Review',
            type: 'MANAGER_REVIEW',
            startDate: this.addDays(startDate, 14),
            endDate: this.addDays(startDate, 35),
            reminderDays: [5, 14, 18],
            escalationDays: 3,
            required: true,
          },
          {
            name: 'Calibration',
            type: 'CALIBRATION',
            startDate: this.addDays(startDate, 35),
            endDate: this.addDays(startDate, 49),
            reminderDays: [3, 10],
            escalationDays: 2,
            required: true,
          },
          {
            name: 'Finalization',
            type: 'FINALIZATION',
            startDate: this.addDays(startDate, 49),
            endDate: this.addDays(startDate, 53),
            reminderDays: [2],
            escalationDays: 1,
            required: true,
          },
          {
            name: 'Sharing',
            type: 'SHARING',
            startDate: this.addDays(startDate, 53),
            endDate: this.addDays(startDate, 60),
            reminderDays: [2, 5],
            escalationDays: 2,
            required: true,
          },
        ],
        settings: {
          includeGoals: true,
          includeFeedback: true,
          include360: false,
          requireAcknowledgment: true,
          allowLateSubmissions: true,
          autoProgressPhases: false,
          reminderChannels: ['email', 'in_app'],
        },
      },
      quarterly: {
        name: `Q${Math.ceil((startDate.getMonth() + 1) / 3)} Review ${startDate.getFullYear()}`,
        type: 'QUARTERLY',
        endDate: this.addDays(startDate, 21),
        phases: [
          {
            name: 'Self Assessment',
            type: 'SELF_ASSESSMENT',
            startDate: startDate,
            endDate: this.addDays(startDate, 7),
            reminderDays: [2, 5],
            escalationDays: 2,
            required: true,
          },
          {
            name: 'Manager Review',
            type: 'MANAGER_REVIEW',
            startDate: this.addDays(startDate, 7),
            endDate: this.addDays(startDate, 17),
            reminderDays: [3, 7],
            escalationDays: 2,
            required: true,
          },
          {
            name: 'Sharing',
            type: 'SHARING',
            startDate: this.addDays(startDate, 17),
            endDate: this.addDays(startDate, 21),
            reminderDays: [2],
            escalationDays: 1,
            required: true,
          },
        ],
        settings: {
          includeGoals: true,
          includeFeedback: true,
          include360: false,
          requireAcknowledgment: true,
          allowLateSubmissions: false,
          autoProgressPhases: true,
          reminderChannels: ['email', 'in_app', 'slack'],
        },
      },
      probation: {
        name: 'Probation Review',
        type: 'PROBATION',
        endDate: this.addDays(startDate, 14),
        phases: [
          {
            name: 'Self Assessment',
            type: 'SELF_ASSESSMENT',
            startDate: startDate,
            endDate: this.addDays(startDate, 5),
            reminderDays: [2],
            escalationDays: 1,
            required: true,
          },
          {
            name: 'Manager Review',
            type: 'MANAGER_REVIEW',
            startDate: this.addDays(startDate, 5),
            endDate: this.addDays(startDate, 12),
            reminderDays: [3, 5],
            escalationDays: 1,
            required: true,
          },
          {
            name: 'Sharing',
            type: 'SHARING',
            startDate: this.addDays(startDate, 12),
            endDate: this.addDays(startDate, 14),
            reminderDays: [1],
            escalationDays: 1,
            required: true,
          },
        ],
        settings: {
          includeGoals: true,
          includeFeedback: false,
          include360: false,
          requireAcknowledgment: true,
          allowLateSubmissions: false,
          autoProgressPhases: false,
          reminderChannels: ['email'],
        },
      },
    };

    const template = templates[templateType];
    return {
      ...template,
      startDate,
      participants,
    };
  }

  // Helper methods
  private analyzeUserPatterns(data: HistoricalData[]): Map<string, {
    avgCompletionDays: number;
    avgRemindersNeeded: number;
    lateFrequency: number;
    preferredDayOfWeek?: number;
  }> {
    const patterns = new Map<string, {
      avgCompletionDays: number;
      avgRemindersNeeded: number;
      lateFrequency: number;
      preferredDayOfWeek?: number;
    }>();

    const userDataMap = new Map<string, HistoricalData[]>();
    for (const d of data) {
      const existing = userDataMap.get(d.userId) ?? [];
      existing.push(d);
      userDataMap.set(d.userId, existing);
    }

    for (const [userId, userData] of userDataMap) {
      const avgCompletionDays = userData.reduce((sum, d) => sum + d.completionTime, 0) / userData.length;
      const avgRemindersNeeded = userData.reduce((sum, d) => sum + d.remindersSent, 0) / userData.length;
      const lateFrequency = userData.filter(d => d.wasLate).length / userData.length;

      patterns.set(userId, {
        avgCompletionDays,
        avgRemindersNeeded,
        lateFrequency,
      });
    }

    return patterns;
  }

  private calculateOptimalReminderDays(
    phase: PhaseConfig,
    pattern?: { avgCompletionDays: number; avgRemindersNeeded: number; lateFrequency: number }
  ): number[] {
    const phaseDuration = this.daysBetween(phase.startDate, phase.endDate);

    // Default reminder pattern
    let reminderDays = [...phase.reminderDays];

    if (pattern) {
      // Users who complete early need fewer reminders
      if (pattern.avgCompletionDays < phaseDuration * 0.5) {
        reminderDays = reminderDays.filter((_, i) => i % 2 === 0);
      }
      // Users who are frequently late need more reminders
      else if (pattern.lateFrequency > 0.3) {
        const extraReminder = Math.floor(phaseDuration * 0.8);
        if (!reminderDays.includes(extraReminder)) {
          reminderDays.push(extraReminder);
        }
      }
    }

    return reminderDays.sort((a, b) => a - b);
  }

  private calculatePrediction(
    currentProgress: number,
    daysSinceStart: number,
    totalDays: number,
    pattern?: { avgCompletionDays: number; lateFrequency: number }
  ): { predictedDays: number; confidence: number; factors: string[] } {
    const factors: string[] = [];
    let predictedDays: number;
    let confidence: number;

    if (currentProgress === 100) {
      return { predictedDays: daysSinceStart, confidence: 1.0, factors: ['Already completed'] };
    }

    if (currentProgress === 0 && daysSinceStart > 0) {
      // Not started
      predictedDays = pattern?.avgCompletionDays ?? totalDays * 1.2;
      confidence = pattern ? 0.5 : 0.3;
      factors.push('Has not started');
    } else {
      // Linear projection
      const velocity = currentProgress / Math.max(daysSinceStart, 1);
      const remainingProgress = 100 - currentProgress;
      const projectedRemainingDays = velocity > 0 ? remainingProgress / velocity : totalDays;
      predictedDays = daysSinceStart + projectedRemainingDays;

      // Adjust confidence based on data quality
      confidence = 0.7;
      if (daysSinceStart < 2) {
        confidence -= 0.2;
        factors.push('Limited data (early in phase)');
      }
    }

    // Adjust based on historical pattern
    if (pattern) {
      if (pattern.lateFrequency > 0.5) {
        predictedDays *= 1.1;
        confidence -= 0.1;
        factors.push('History of late completion');
      } else if (pattern.lateFrequency < 0.1) {
        confidence += 0.1;
        factors.push('Strong completion history');
      }
    }

    return {
      predictedDays: Math.round(predictedDays),
      confidence: Math.max(0, Math.min(1, confidence)),
      factors,
    };
  }

  private suggestIntervention(
    riskLevel: 'medium' | 'high',
    factors: string[],
    pattern?: { avgRemindersNeeded: number; lateFrequency: number }
  ): string {
    if (factors.includes('Has not started')) {
      return 'Personal outreach recommended - participant has not begun';
    }

    if (riskLevel === 'high') {
      if (pattern?.lateFrequency && pattern.lateFrequency > 0.5) {
        return 'Schedule 1-on-1 support session - participant has history of delays';
      }
      return 'Escalate to manager - significant completion risk';
    }

    return 'Increase reminder frequency';
  }

  private selectChannel(
    available: string[],
    type: string,
    daysRemaining?: number
  ): string {
    // Urgent reminders should use more intrusive channels
    if (type === 'final' || type === 'escalation') {
      return available.includes('email') ? 'email' : available[0];
    }

    if (daysRemaining !== undefined && daysRemaining <= 2) {
      return available.includes('slack') ? 'slack' : available[0];
    }

    return available.includes('in_app') ? 'in_app' : available[0];
  }

  private daysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

export const reviewCycleAutomationService = new ReviewCycleAutomationService();
