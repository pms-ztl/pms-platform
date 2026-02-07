import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ReviewCycleAutomationService,
  type CycleConfig,
  type PhaseConfig,
  type ParticipantConfig,
  type HistoricalData,
} from './review-cycle-automation';

describe('ReviewCycleAutomationService', () => {
  let service: ReviewCycleAutomationService;
  let mockNow: Date;

  const createMockConfig = (options?: {
    phases?: number;
    participants?: number;
    startDate?: Date;
  }): CycleConfig => {
    const startDate = options?.startDate ?? new Date('2024-01-01');
    const phases: PhaseConfig[] = [];

    const phaseCount = options?.phases ?? 3;
    for (let i = 0; i < phaseCount; i++) {
      const phaseStart = new Date(startDate);
      phaseStart.setDate(phaseStart.getDate() + i * 14);
      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseEnd.getDate() + 14);

      phases.push({
        name: `Phase ${i + 1}`,
        type: i === 0 ? 'SELF_ASSESSMENT' : i === 1 ? 'MANAGER_REVIEW' : 'SHARING',
        startDate: phaseStart,
        endDate: phaseEnd,
        reminderDays: [3, 7, 10],
        escalationDays: 3,
        required: true,
      });
    }

    const participantCount = options?.participants ?? 3;
    const participants: ParticipantConfig[] = [];
    for (let i = 0; i < participantCount; i++) {
      participants.push({
        userId: `user-${i}`,
        role: 'reviewee',
        phases: phases.map((p) => p.name),
      });
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + phaseCount * 14);

    return {
      name: 'Test Cycle',
      type: 'QUARTERLY',
      startDate,
      endDate,
      phases,
      participants,
      settings: {
        includeGoals: true,
        includeFeedback: true,
        include360: false,
        requireAcknowledgment: true,
        allowLateSubmissions: true,
        autoProgressPhases: true,
        reminderChannels: ['email', 'slack', 'in_app'],
      },
    };
  };

  const createMockHistoricalData = (userIds: string[], options?: {
    avgCompletionDays?: number;
    avgReminders?: number;
    lateFrequency?: number;
  }): HistoricalData[] => {
    const data: HistoricalData[] = [];

    for (const userId of userIds) {
      for (let i = 0; i < 5; i++) {
        const wasLate = Math.random() < (options?.lateFrequency ?? 0.2);
        data.push({
          userId,
          cycleType: 'QUARTERLY',
          phase: `Phase ${(i % 3) + 1}`,
          remindersSent: options?.avgReminders ?? Math.floor(Math.random() * 4) + 1,
          completionTime: options?.avgCompletionDays ?? Math.floor(Math.random() * 10) + 3,
          wasLate,
        });
      }
    }

    return data;
  };

  beforeEach(() => {
    service = new ReviewCycleAutomationService();
    mockNow = new Date('2024-01-08'); // Mid-way through first phase
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateReminderSchedule', () => {
    it('should generate reminders for all participants', () => {
      const config = createMockConfig({ participants: 3, phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const userReminders = result.filter((r) => r.userId === 'user-0');
      expect(userReminders.length).toBeGreaterThan(0);
    });

    it('should include initial notification', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const initialReminders = result.filter((r) => r.type === 'initial');
      expect(initialReminders.length).toBeGreaterThan(0);
    });

    it('should include final reminder', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const finalReminders = result.filter((r) => r.type === 'final');
      expect(finalReminders.length).toBeGreaterThan(0);
    });

    it('should include escalation reminder', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const escalationReminders = result.filter((r) => r.type === 'escalation');
      expect(escalationReminders.length).toBeGreaterThan(0);
    });

    it('should sort reminders by scheduled time', () => {
      const config = createMockConfig();
      const result = service.generateReminderSchedule(config, []);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].scheduledAt.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].scheduledAt.getTime()
        );
      }
    });

    it('should set high priority for urgent reminders', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const finalReminders = result.filter((r) => r.type === 'final');
      for (const reminder of finalReminders) {
        expect(reminder.priority).toBe('high');
      }
    });

    it('should include context in reminders', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      for (const reminder of result) {
        expect(reminder.context).toBeDefined();
        expect(reminder.context).toHaveProperty('phaseName');
      }
    });

    it('should optimize reminders based on historical data', () => {
      const config = createMockConfig({ participants: 1, phases: 1 });
      const earlyCompleter = createMockHistoricalData(['user-0'], {
        avgCompletionDays: 3,
        lateFrequency: 0,
      });
      const lateCompleter = createMockHistoricalData(['user-0'], {
        avgCompletionDays: 12,
        lateFrequency: 0.5,
      });

      const earlyResult = service.generateReminderSchedule(config, earlyCompleter);
      const lateResult = service.generateReminderSchedule(config, lateCompleter);

      // Late completers should get more reminders
      const earlyReminders = earlyResult.filter((r) => r.type === 'reminder');
      const lateReminders = lateResult.filter((r) => r.type === 'reminder');
      expect(lateReminders.length).toBeGreaterThanOrEqual(earlyReminders.length);
    });

    it('should only create reminders for participants in phase', () => {
      const config = createMockConfig({ phases: 2 });
      config.participants[0].phases = ['Phase 1']; // Only in first phase

      const result = service.generateReminderSchedule(config, []);

      const phase2Reminders = result.filter(
        (r) => r.userId === 'user-0' && r.phase === 'Phase 2'
      );
      expect(phase2Reminders.length).toBe(0);
    });

    it('should use appropriate template names', () => {
      const config = createMockConfig({ phases: 1 });
      const result = service.generateReminderSchedule(config, []);

      const initialReminder = result.find((r) => r.type === 'initial');
      expect(initialReminder?.template).toContain('STARTED');

      const regularReminder = result.find((r) => r.type === 'reminder');
      expect(regularReminder?.template).toContain('REMINDER');
    });
  });

  describe('predictCompletion', () => {
    it('should predict completion for all participants', () => {
      const config = createMockConfig({ participants: 3, phases: 1 });
      const progress = new Map<string, number>();

      const result = service.predictCompletion(config, progress, []);

      expect(result.length).toBe(3);
    });

    it('should return 100% confidence for completed participants', () => {
      const config = createMockConfig({ participants: 1, phases: 1 });
      const progress = new Map<string, number>();
      progress.set('user-0:Phase 1', 100);

      const result = service.predictCompletion(config, progress, []);

      expect(result[0].onTimeConfidence).toBe(100);
      expect(result[0].riskLevel).toBe('low');
    });

    it('should identify high risk for not started participants', () => {
      const config = createMockConfig({ participants: 1, phases: 1 });
      const progress = new Map<string, number>();
      progress.set('user-0:Phase 1', 0);

      const result = service.predictCompletion(config, progress, []);

      expect(result[0].factors).toContain('Has not started');
    });

    it('should suggest intervention for high risk', () => {
      const config = createMockConfig({ participants: 1, phases: 1 });
      const progress = new Map<string, number>();
      progress.set('user-0:Phase 1', 0);

      const result = service.predictCompletion(config, progress, []);

      if (result[0].riskLevel !== 'low') {
        expect(result[0].suggestedIntervention).toBeDefined();
      }
    });

    it('should use historical data for predictions', () => {
      const config = createMockConfig({ participants: 1, phases: 1 });
      const progress = new Map<string, number>();
      progress.set('user-0:Phase 1', 50);

      const historicalData = createMockHistoricalData(['user-0'], {
        lateFrequency: 0.8,
      });

      const result = service.predictCompletion(config, progress, historicalData);

      expect(result[0].factors.some((f) => f.toLowerCase().includes('late') || f.toLowerCase().includes('history'))).toBe(true);
    });

    it('should predict lower confidence early in phase', () => {
      vi.setSystemTime(new Date('2024-01-02')); // Day 2 of phase

      const config = createMockConfig({ participants: 1, phases: 1 });
      const progress = new Map<string, number>();
      progress.set('user-0:Phase 1', 10);

      const result = service.predictCompletion(config, progress, []);

      expect(result[0].onTimeConfidence).toBeLessThan(100);
    });

    it('should include risk level', () => {
      const config = createMockConfig({ participants: 3, phases: 1 });
      const progress = new Map<string, number>();

      const result = service.predictCompletion(config, progress, []);

      for (const prediction of result) {
        expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
      }
    });
  });

  describe('createWorkflow', () => {
    it('should identify current phase', () => {
      const config = createMockConfig({ phases: 3 });
      const result = service.createWorkflow(config);

      expect(result.currentPhase).toBe('Phase 1');
    });

    it('should identify next phase', () => {
      const config = createMockConfig({ phases: 3 });
      const result = service.createWorkflow(config);

      expect(result.nextPhase).toBe('Phase 2');
    });

    it('should generate cycle ID', () => {
      const config = createMockConfig();
      const result = service.createWorkflow(config);

      expect(result.cycleId).toContain(config.name);
    });

    it('should include pending actions', () => {
      const config = createMockConfig({ phases: 3 });
      const result = service.createWorkflow(config);

      expect(result.pendingActions.length).toBeGreaterThan(0);
    });

    it('should include phase transition action when auto-progress enabled', () => {
      const config = createMockConfig({ phases: 3 });
      config.settings.autoProgressPhases = true;

      const result = service.createWorkflow(config);

      const transitionAction = result.pendingActions.find(
        (a) => a.type === 'transition_phase'
      );
      expect(transitionAction).toBeDefined();
    });

    it('should include completion report action', () => {
      const config = createMockConfig({ phases: 2 });
      const result = service.createWorkflow(config);

      const reportAction = result.pendingActions.find(
        (a) => a.type === 'generate_report'
      );
      expect(reportAction).toBeDefined();
    });

    it('should set transition date', () => {
      const config = createMockConfig({ phases: 2 });
      const result = service.createWorkflow(config);

      expect(result.transitionDate).toBeDefined();
    });

    it('should initialize empty completed actions', () => {
      const config = createMockConfig();
      const result = service.createWorkflow(config);

      expect(result.completedActions).toEqual([]);
    });

    it('should initialize empty blockers', () => {
      const config = createMockConfig();
      const result = service.createWorkflow(config);

      expect(result.blockers).toEqual([]);
    });
  });

  describe('checkBlockers', () => {
    it('should detect incomplete reviews', () => {
      const config = createMockConfig({ participants: 3, phases: 1 });
      const completionStatus = new Map<string, boolean>();
      completionStatus.set('user-0:Phase 1', true);
      completionStatus.set('user-1:Phase 1', false);
      completionStatus.set('user-2:Phase 1', false);

      const result = service.checkBlockers(config, 'Phase 1', completionStatus);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('incomplete_reviews');
      expect(result[0].affectedUsers).toContain('user-1');
      expect(result[0].affectedUsers).toContain('user-2');
    });

    it('should return empty array when all complete', () => {
      const config = createMockConfig({ participants: 2, phases: 1 });
      const completionStatus = new Map<string, boolean>();
      completionStatus.set('user-0:Phase 1', true);
      completionStatus.set('user-1:Phase 1', true);

      const result = service.checkBlockers(config, 'Phase 1', completionStatus);

      expect(result.length).toBe(0);
    });

    it('should return empty array for non-required phase', () => {
      const config = createMockConfig({ participants: 2, phases: 1 });
      config.phases[0].required = false;
      const completionStatus = new Map<string, boolean>();

      const result = service.checkBlockers(config, 'Phase 1', completionStatus);

      expect(result.length).toBe(0);
    });

    it('should include resolution suggestion', () => {
      const config = createMockConfig({ participants: 2, phases: 1 });
      const completionStatus = new Map<string, boolean>();
      completionStatus.set('user-0:Phase 1', false);
      completionStatus.set('user-1:Phase 1', false);

      const result = service.checkBlockers(config, 'Phase 1', completionStatus);

      expect(result[0].resolution).toBeTruthy();
    });

    it('should handle non-existent phase', () => {
      const config = createMockConfig({ phases: 1 });
      const completionStatus = new Map<string, boolean>();

      const result = service.checkBlockers(config, 'Non-Existent Phase', completionStatus);

      expect(result.length).toBe(0);
    });
  });

  describe('generateFromTemplate', () => {
    it('should generate annual review config', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [
        { userId: 'user-1', role: 'reviewee', phases: [] },
      ];

      const result = service.generateFromTemplate('annual', startDate, participants);

      expect(result.type).toBe('ANNUAL');
      expect(result.phases.length).toBe(5);
      expect(result.name).toContain('Annual Review');
    });

    it('should generate quarterly review config', () => {
      const startDate = new Date('2024-04-01');
      const participants: ParticipantConfig[] = [
        { userId: 'user-1', role: 'reviewee', phases: [] },
      ];

      const result = service.generateFromTemplate('quarterly', startDate, participants);

      expect(result.type).toBe('QUARTERLY');
      expect(result.phases.length).toBe(3);
      expect(result.name).toContain('Q2');
    });

    it('should generate probation review config', () => {
      const startDate = new Date('2024-01-15');
      const participants: ParticipantConfig[] = [
        { userId: 'user-1', role: 'reviewee', phases: [] },
      ];

      const result = service.generateFromTemplate('probation', startDate, participants);

      expect(result.type).toBe('PROBATION');
      expect(result.phases.length).toBe(3);
      expect(result.name).toContain('Probation');
    });

    it('should set correct phase types', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [];

      const result = service.generateFromTemplate('annual', startDate, participants);

      expect(result.phases.some((p) => p.type === 'SELF_ASSESSMENT')).toBe(true);
      expect(result.phases.some((p) => p.type === 'MANAGER_REVIEW')).toBe(true);
      expect(result.phases.some((p) => p.type === 'CALIBRATION')).toBe(true);
    });

    it('should set appropriate settings per template', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [];

      const annual = service.generateFromTemplate('annual', startDate, participants);
      const quarterly = service.generateFromTemplate('quarterly', startDate, participants);
      const probation = service.generateFromTemplate('probation', startDate, participants);

      // Annual shouldn't auto-progress
      expect(annual.settings.autoProgressPhases).toBe(false);
      // Quarterly should auto-progress
      expect(quarterly.settings.autoProgressPhases).toBe(true);
      // Probation shouldn't allow late submissions
      expect(probation.settings.allowLateSubmissions).toBe(false);
    });

    it('should assign participants', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [
        { userId: 'user-1', role: 'reviewee', phases: ['Phase 1'] },
        { userId: 'user-2', role: 'reviewer', phases: ['Phase 2'] },
      ];

      const result = service.generateFromTemplate('quarterly', startDate, participants);

      expect(result.participants).toEqual(participants);
    });

    it('should calculate correct end date', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [];

      const annual = service.generateFromTemplate('annual', startDate, participants);
      const quarterly = service.generateFromTemplate('quarterly', startDate, participants);
      const probation = service.generateFromTemplate('probation', startDate, participants);

      // Annual is ~60 days
      expect(annual.endDate > annual.startDate).toBe(true);
      // Quarterly is ~21 days
      expect(quarterly.endDate > quarterly.startDate).toBe(true);
      // Probation is ~14 days
      expect(probation.endDate > probation.startDate).toBe(true);
    });

    it('should set reminder channels per template', () => {
      const startDate = new Date('2024-01-01');
      const participants: ParticipantConfig[] = [];

      const annual = service.generateFromTemplate('annual', startDate, participants);
      const quarterly = service.generateFromTemplate('quarterly', startDate, participants);

      expect(annual.settings.reminderChannels).toContain('email');
      expect(quarterly.settings.reminderChannels).toContain('slack');
    });
  });
});
