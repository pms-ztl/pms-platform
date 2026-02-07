import { describe, it, expect, beforeEach } from 'vitest';
import { GoalAlignmentService, type GoalInput, type AlignmentInput } from './goal-alignment';

describe('GoalAlignmentService', () => {
  let service: GoalAlignmentService;

  const createMockGoals = (config?: {
    count?: number;
    withHierarchy?: boolean;
    types?: Array<GoalInput['type']>;
  }): GoalInput[] => {
    const count = config?.count ?? 5;
    const goals: GoalInput[] = [];

    if (config?.withHierarchy) {
      // Create hierarchical structure: Company -> Department -> Team -> Individual
      goals.push({
        id: 'company-goal',
        title: 'Company Annual Target',
        type: 'COMPANY',
        status: 'ACTIVE',
        progress: 50,
        ownerId: 'ceo',
        ownerName: 'CEO',
        weight: 1,
      });

      goals.push({
        id: 'dept-goal',
        title: 'Department Q1 Target',
        type: 'DEPARTMENT',
        status: 'ACTIVE',
        progress: 45,
        ownerId: 'director',
        ownerName: 'Director',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        parentGoalId: 'company-goal',
        weight: 0.5,
      });

      goals.push({
        id: 'team-goal',
        title: 'Team Sprint Goals',
        type: 'TEAM',
        status: 'ACTIVE',
        progress: 60,
        ownerId: 'manager',
        ownerName: 'Manager',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        parentGoalId: 'dept-goal',
        weight: 0.3,
      });

      for (let i = 0; i < 3; i++) {
        goals.push({
          id: `individual-goal-${i}`,
          title: `Individual Task ${i}`,
          type: 'INDIVIDUAL',
          status: i === 0 ? 'COMPLETED' : 'ACTIVE',
          progress: i === 0 ? 100 : 50,
          ownerId: `employee-${i}`,
          ownerName: `Employee ${i}`,
          departmentId: 'dept-1',
          departmentName: 'Engineering',
          parentGoalId: 'team-goal',
          weight: 0.33,
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        goals.push({
          id: `goal-${i}`,
          title: `Goal ${i}`,
          type: config?.types?.[i] ?? 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: Math.floor(Math.random() * 100),
          ownerId: `owner-${i}`,
          ownerName: `Owner ${i}`,
          departmentId: `dept-${i % 2}`,
          departmentName: `Department ${i % 2}`,
          weight: 1,
        });
      }
    }

    return goals;
  };

  beforeEach(() => {
    service = new GoalAlignmentService();
  });

  describe('buildGoalGraph', () => {
    it('should create nodes for all goals', () => {
      const goals = createMockGoals({ count: 5 });
      const result = service.buildGoalGraph(goals, []);

      expect(result.nodes.length).toBe(5);
    });

    it('should create edges for parent relationships', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.buildGoalGraph(goals, []);

      const parentEdges = result.edges.filter((e) => e.type === 'parent');
      expect(parentEdges.length).toBeGreaterThan(0);
    });

    it('should create edges for alignments', () => {
      const goals = createMockGoals({ count: 3 });
      const alignments: AlignmentInput[] = [
        { fromGoalId: 'goal-0', toGoalId: 'goal-1', weight: 0.5 },
      ];
      const result = service.buildGoalGraph(goals, alignments);

      const alignmentEdges = result.edges.filter((e) => e.type === 'alignment');
      expect(alignmentEdges.length).toBe(1);
    });

    it('should identify orphan goals', () => {
      const goals = createMockGoals({ count: 5 });
      const result = service.buildGoalGraph(goals, []);

      const orphans = result.nodes.filter((n) => n.isOrphan);
      expect(orphans.length).toBe(5);
    });

    it('should not mark COMPANY goals as orphans', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.buildGoalGraph(goals, []);

      const companyNode = result.nodes.find((n) => n.type === 'COMPANY');
      expect(companyNode?.isOrphan).toBe(false);
    });

    it('should calculate correct stats', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.buildGoalGraph(goals, []);

      expect(result.stats.totalGoals).toBe(6);
      expect(result.stats.byType).toHaveProperty('COMPANY');
      expect(result.stats.byType).toHaveProperty('DEPARTMENT');
      expect(result.stats.byType).toHaveProperty('TEAM');
      expect(result.stats.byType).toHaveProperty('INDIVIDUAL');
    });

    it('should calculate alignment rate', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.buildGoalGraph(goals, []);

      expect(result.stats.alignmentRate).toBeGreaterThan(0);
      expect(result.stats.alignmentRate).toBeLessThanOrEqual(100);
    });

    it('should calculate max depth', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.buildGoalGraph(goals, []);

      expect(result.stats.maxDepth).toBe(3); // Company -> Dept -> Team -> Individual
    });

    it('should handle empty goals array', () => {
      const result = service.buildGoalGraph([], []);

      expect(result.nodes.length).toBe(0);
      expect(result.edges.length).toBe(0);
      expect(result.stats.totalGoals).toBe(0);
    });
  });

  describe('calculateProgressRollup', () => {
    it('should return own progress for leaf goals', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.calculateProgressRollup(goals, 'individual-goal-0');

      expect(result.rollupProgress).toBe(100);
      expect(result.contributingGoals.length).toBe(0);
    });

    it('should calculate weighted average for parent goals', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.calculateProgressRollup(goals, 'team-goal');

      expect(result.rollupProgress).toBeGreaterThan(0);
      expect(result.contributingGoals.length).toBe(3);
    });

    it('should include contribution details', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.calculateProgressRollup(goals, 'team-goal');

      for (const contributing of result.contributingGoals) {
        expect(contributing).toHaveProperty('id');
        expect(contributing).toHaveProperty('title');
        expect(contributing).toHaveProperty('progress');
        expect(contributing).toHaveProperty('weight');
        expect(contributing).toHaveProperty('contribution');
      }
    });

    it('should handle non-existent goal', () => {
      const goals = createMockGoals({ count: 3 });
      const result = service.calculateProgressRollup(goals, 'non-existent');

      expect(result.title).toBe('Unknown');
      expect(result.rollupProgress).toBe(0);
    });

    it('should recursively calculate nested rollup', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.calculateProgressRollup(goals, 'dept-goal');

      expect(result.childProgress).toBeGreaterThan(0);
    });
  });

  describe('suggestAlignments', () => {
    it('should suggest alignments for orphan individual goals', () => {
      const goals: GoalInput[] = [
        {
          id: 'company-goal',
          title: 'Improve customer satisfaction metrics',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 30,
          ownerId: 'ceo',
          ownerName: 'CEO',
          departmentId: 'dept-1',
          departmentName: 'Support',
          weight: 1,
          tags: ['customer', 'satisfaction'],
        },
        {
          id: 'individual-goal',
          title: 'Increase customer satisfaction scores',
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'employee',
          ownerName: 'Employee',
          departmentId: 'dept-1',
          departmentName: 'Support',
          weight: 1,
          tags: ['customer', 'satisfaction'],
        },
      ];

      const result = service.suggestAlignments(goals, []);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sourceGoalId).toBe('individual-goal');
    });

    it('should not suggest alignment for already aligned goals', () => {
      const goals: GoalInput[] = [
        {
          id: 'team-goal',
          title: 'Team performance',
          type: 'TEAM',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'manager',
          ownerName: 'Manager',
          weight: 1,
        },
        {
          id: 'individual-goal',
          title: 'Individual task',
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'employee',
          ownerName: 'Employee',
          weight: 1,
        },
      ];

      const existingAlignments: AlignmentInput[] = [
        { fromGoalId: 'individual-goal', toGoalId: 'team-goal', weight: 1 },
      ];

      const result = service.suggestAlignments(goals, existingAlignments);

      const existingSuggestion = result.find(
        (s) => s.sourceGoalId === 'individual-goal' && s.targetGoalId === 'team-goal'
      );
      expect(existingSuggestion).toBeUndefined();
    });

    it('should include confidence score', () => {
      const goals: GoalInput[] = [
        {
          id: 'company-goal',
          title: 'Improve sales',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 30,
          ownerId: 'ceo',
          ownerName: 'CEO',
          weight: 1,
        },
        {
          id: 'individual-goal',
          title: 'Increase sales calls',
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'salesperson',
          ownerName: 'Salesperson',
          weight: 1,
        },
      ];

      const result = service.suggestAlignments(goals, []);

      if (result.length > 0) {
        expect(result[0].confidence).toBeGreaterThan(0);
        expect(result[0].confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should provide reason for suggestion', () => {
      const goals: GoalInput[] = [
        {
          id: 'dept-goal',
          title: 'Department target',
          type: 'DEPARTMENT',
          status: 'ACTIVE',
          progress: 40,
          ownerId: 'director',
          ownerName: 'Director',
          departmentId: 'dept-1',
          departmentName: 'Engineering',
          weight: 1,
        },
        {
          id: 'individual-goal',
          title: 'Individual target',
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'employee',
          ownerName: 'Employee',
          departmentId: 'dept-1',
          departmentName: 'Engineering',
          weight: 1,
        },
      ];

      const result = service.suggestAlignments(goals, []);

      if (result.length > 0) {
        expect(result[0].reason).toBeTruthy();
        expect(result[0].reason.length).toBeGreaterThan(0);
      }
    });

    it('should limit suggestions to 10', () => {
      const goals: GoalInput[] = [];

      // Add company goal
      goals.push({
        id: 'company-goal',
        title: 'Company Growth',
        type: 'COMPANY',
        status: 'ACTIVE',
        progress: 50,
        ownerId: 'ceo',
        ownerName: 'CEO',
        weight: 1,
      });

      // Add many individual goals
      for (let i = 0; i < 20; i++) {
        goals.push({
          id: `individual-${i}`,
          title: `Growth Task ${i}`,
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: `employee-${i}`,
          ownerName: `Employee ${i}`,
          weight: 1,
        });
      }

      const result = service.suggestAlignments(goals, []);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should skip goals with parent', () => {
      const goals: GoalInput[] = [
        {
          id: 'team-goal',
          title: 'Team goal',
          type: 'TEAM',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'manager',
          ownerName: 'Manager',
          weight: 1,
        },
        {
          id: 'company-goal',
          title: 'Company goal',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'ceo',
          ownerName: 'CEO',
          weight: 1,
        },
        {
          id: 'individual-goal',
          title: 'Individual goal',
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'employee',
          ownerName: 'Employee',
          parentGoalId: 'team-goal',
          weight: 1,
        },
      ];

      const result = service.suggestAlignments(goals, []);

      const individualSuggestion = result.find((s) => s.sourceGoalId === 'individual-goal');
      expect(individualSuggestion).toBeUndefined();
    });
  });

  describe('getOrphanGoals', () => {
    it('should identify orphan individual goals', () => {
      const goals = createMockGoals({ count: 5 });
      const result = service.getOrphanGoals(goals, []);

      expect(result.length).toBe(5);
    });

    it('should not include goals with parent', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.getOrphanGoals(goals, []);

      const withParent = result.find((g) => g.parentGoalId);
      expect(withParent).toBeUndefined();
    });

    it('should not include COMPANY goals', () => {
      const goals: GoalInput[] = [
        {
          id: 'company-goal',
          title: 'Company goal',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'ceo',
          ownerName: 'CEO',
          weight: 1,
        },
      ];

      const result = service.getOrphanGoals(goals, []);

      expect(result.length).toBe(0);
    });

    it('should not include aligned goals', () => {
      const goals = createMockGoals({ count: 3 });
      const alignments: AlignmentInput[] = [
        { fromGoalId: 'goal-0', toGoalId: 'goal-1', weight: 1 },
      ];

      const result = service.getOrphanGoals(goals, alignments);

      expect(result.find((g) => g.id === 'goal-0')).toBeUndefined();
    });
  });

  describe('toD3Hierarchy', () => {
    it('should create hierarchy structure', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3Hierarchy(goals);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('children');
    });

    it('should include all goal properties', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3Hierarchy(goals) as any;

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
    });

    it('should create virtual root for multiple roots', () => {
      const goals: GoalInput[] = [
        {
          id: 'root-1',
          title: 'Root 1',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 50,
          ownerId: 'owner-1',
          ownerName: 'Owner 1',
          weight: 1,
        },
        {
          id: 'root-2',
          title: 'Root 2',
          type: 'COMPANY',
          status: 'ACTIVE',
          progress: 60,
          ownerId: 'owner-2',
          ownerName: 'Owner 2',
          weight: 1,
        },
      ];

      const result = service.toD3Hierarchy(goals) as any;

      expect(result.id).toBe('root');
      expect(result.name).toBe('Organization Goals');
      expect(result.children.length).toBe(2);
    });

    it('should handle empty goals', () => {
      const result = service.toD3Hierarchy([]) as any;

      expect(result.id).toBe('root');
      expect(result.children.length).toBe(0);
    });
  });

  describe('toD3ForceGraph', () => {
    it('should create nodes and links', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3ForceGraph(goals, []) as any;

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('links');
      expect(result.nodes.length).toBe(6);
    });

    it('should include group for each node', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3ForceGraph(goals, []) as any;

      for (const node of result.nodes) {
        expect(node).toHaveProperty('group');
        expect(typeof node.group).toBe('number');
      }
    });

    it('should include radius for each node', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3ForceGraph(goals, []) as any;

      for (const node of result.nodes) {
        expect(node).toHaveProperty('radius');
        expect(node.radius).toBeGreaterThan(0);
      }
    });

    it('should create parent links', () => {
      const goals = createMockGoals({ withHierarchy: true });
      const result = service.toD3ForceGraph(goals, []) as any;

      const parentLinks = result.links.filter((l: any) => l.type === 'parent');
      expect(parentLinks.length).toBeGreaterThan(0);
    });

    it('should create alignment links', () => {
      const goals = createMockGoals({ count: 3 });
      const alignments: AlignmentInput[] = [
        { fromGoalId: 'goal-0', toGoalId: 'goal-1', weight: 0.5 },
      ];

      const result = service.toD3ForceGraph(goals, alignments) as any;

      const alignmentLinks = result.links.filter((l: any) => l.type === 'alignment');
      expect(alignmentLinks.length).toBe(1);
    });

    it('should handle empty data', () => {
      const result = service.toD3ForceGraph([], []) as any;

      expect(result.nodes.length).toBe(0);
      expect(result.links.length).toBe(0);
    });
  });
});
