/**
 * Goal Alignment Service
 * Implements Feature 8: Real-Time Goal Alignment Visualization
 *
 * Provides:
 * - Graph data structure for goal relationships
 * - Progress rollup calculations
 * - Alignment suggestions
 * - Orphan goal detection
 * - D3.js-compatible data format
 */

export interface GoalNode {
  id: string;
  title: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'COMPANY' | 'OKR_OBJECTIVE' | 'OKR_KEY_RESULT';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  progress: number;
  ownerId: string;
  ownerName: string;
  departmentId?: string;
  departmentName?: string;
  dueDate?: Date;
  weight: number;
  isOrphan: boolean;
  depth: number; // Distance from root
  childCount: number;
}

export interface GoalEdge {
  source: string; // from goal ID
  target: string; // to goal ID
  type: 'parent' | 'alignment';
  weight: number;
}

export interface GoalGraph {
  nodes: GoalNode[];
  edges: GoalEdge[];
  stats: {
    totalGoals: number;
    orphanGoals: number;
    alignmentRate: number;
    averageProgress: number;
    maxDepth: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

export interface AlignmentSuggestion {
  sourceGoalId: string;
  sourceGoalTitle: string;
  targetGoalId: string;
  targetGoalTitle: string;
  confidence: number;
  reason: string;
}

export interface ProgressRollup {
  goalId: string;
  title: string;
  ownProgress: number;
  childProgress: number;
  rollupProgress: number;
  contributingGoals: Array<{
    id: string;
    title: string;
    progress: number;
    weight: number;
    contribution: number;
  }>;
}

export interface GoalInput {
  id: string;
  title: string;
  description?: string;
  type: GoalNode['type'];
  status: GoalNode['status'];
  progress: number;
  ownerId: string;
  ownerName: string;
  departmentId?: string;
  departmentName?: string;
  parentGoalId?: string;
  dueDate?: Date;
  weight: number;
  tags?: string[];
}

export interface AlignmentInput {
  fromGoalId: string;
  toGoalId: string;
  weight: number;
}

export class GoalAlignmentService {
  /**
   * Builds a graph representation of goal relationships
   */
  buildGoalGraph(goals: GoalInput[], alignments: AlignmentInput[]): GoalGraph {
    const nodeMap = new Map<string, GoalNode>();
    const edges: GoalEdge[] = [];
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    // First pass: create nodes and parent relationships
    for (const goal of goals) {
      nodeMap.set(goal.id, {
        id: goal.id,
        title: goal.title,
        type: goal.type,
        status: goal.status,
        progress: goal.progress,
        ownerId: goal.ownerId,
        ownerName: goal.ownerName,
        departmentId: goal.departmentId,
        departmentName: goal.departmentName,
        dueDate: goal.dueDate,
        weight: goal.weight,
        isOrphan: true,
        depth: 0,
        childCount: 0,
      });

      if (goal.parentGoalId) {
        edges.push({
          source: goal.id,
          target: goal.parentGoalId,
          type: 'parent',
          weight: goal.weight,
        });

        parentMap.set(goal.id, goal.parentGoalId);

        const siblings = childrenMap.get(goal.parentGoalId) ?? [];
        siblings.push(goal.id);
        childrenMap.set(goal.parentGoalId, siblings);
      }
    }

    // Add alignment edges
    for (const alignment of alignments) {
      if (nodeMap.has(alignment.fromGoalId) && nodeMap.has(alignment.toGoalId)) {
        edges.push({
          source: alignment.fromGoalId,
          target: alignment.toGoalId,
          type: 'alignment',
          weight: alignment.weight,
        });
      }
    }

    // Calculate depths and identify orphans
    const visited = new Set<string>();
    const calculateDepth = (goalId: string, depth: number): void => {
      if (visited.has(goalId)) return;
      visited.add(goalId);

      const node = nodeMap.get(goalId);
      if (!node) return;

      node.depth = depth;

      const children = childrenMap.get(goalId) ?? [];
      node.childCount = children.length;

      for (const childId of children) {
        calculateDepth(childId, depth + 1);
      }
    };

    // Find root goals (no parent) and calculate depths
    const rootGoals = goals.filter(g => !g.parentGoalId);
    for (const root of rootGoals) {
      calculateDepth(root.id, 0);
    }

    // Identify orphans (no parent and not company/department level)
    let orphanCount = 0;
    for (const node of nodeMap.values()) {
      const hasParent = parentMap.has(node.id);
      const hasAlignment = alignments.some(a => a.fromGoalId === node.id);
      const isTopLevel = node.type === 'COMPANY' || node.type === 'DEPARTMENT';

      node.isOrphan = !hasParent && !hasAlignment && !isTopLevel && node.type !== 'OKR_KEY_RESULT';

      if (node.isOrphan) orphanCount++;
    }

    // Calculate stats
    const nodes = Array.from(nodeMap.values());
    const alignedGoals = goals.filter(g =>
      g.parentGoalId || alignments.some(a => a.fromGoalId === g.id)
    );

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalProgress = 0;
    let maxDepth = 0;

    for (const node of nodes) {
      byType[node.type] = (byType[node.type] ?? 0) + 1;
      byStatus[node.status] = (byStatus[node.status] ?? 0) + 1;
      totalProgress += node.progress;
      maxDepth = Math.max(maxDepth, node.depth);
    }

    return {
      nodes,
      edges,
      stats: {
        totalGoals: goals.length,
        orphanGoals: orphanCount,
        alignmentRate: goals.length > 0 ? (alignedGoals.length / goals.length) * 100 : 0,
        averageProgress: goals.length > 0 ? totalProgress / goals.length : 0,
        maxDepth,
        byType,
        byStatus,
      },
    };
  }

  /**
   * Calculates progress rollup from children to parents
   */
  calculateProgressRollup(
    goals: GoalInput[],
    goalId: string
  ): ProgressRollup {
    const goalMap = new Map(goals.map(g => [g.id, g]));
    const childrenMap = new Map<string, GoalInput[]>();

    // Build children map
    for (const goal of goals) {
      if (goal.parentGoalId) {
        const siblings = childrenMap.get(goal.parentGoalId) ?? [];
        siblings.push(goal);
        childrenMap.set(goal.parentGoalId, siblings);
      }
    }

    const goal = goalMap.get(goalId);
    if (!goal) {
      return {
        goalId,
        title: 'Unknown',
        ownProgress: 0,
        childProgress: 0,
        rollupProgress: 0,
        contributingGoals: [],
      };
    }

    const children = childrenMap.get(goalId) ?? [];
    const contributingGoals: ProgressRollup['contributingGoals'] = [];

    if (children.length === 0) {
      return {
        goalId,
        title: goal.title,
        ownProgress: goal.progress,
        childProgress: 0,
        rollupProgress: goal.progress,
        contributingGoals: [],
      };
    }

    // Calculate weighted average of children
    let totalWeight = 0;
    let weightedProgress = 0;

    for (const child of children) {
      const childRollup = this.calculateProgressRollup(goals, child.id);
      const contribution = child.weight * childRollup.rollupProgress;

      totalWeight += child.weight;
      weightedProgress += contribution;

      contributingGoals.push({
        id: child.id,
        title: child.title,
        progress: childRollup.rollupProgress,
        weight: child.weight,
        contribution: Math.round((contribution / 100) * 100) / 100,
      });
    }

    const childProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
    const rollupProgress = Math.round(childProgress * 100) / 100;

    return {
      goalId,
      title: goal.title,
      ownProgress: goal.progress,
      childProgress: Math.round(childProgress * 100) / 100,
      rollupProgress,
      contributingGoals,
    };
  }

  /**
   * Suggests potential goal alignments based on similarity
   */
  suggestAlignments(
    goals: GoalInput[],
    existingAlignments: AlignmentInput[]
  ): AlignmentSuggestion[] {
    const suggestions: AlignmentSuggestion[] = [];
    const existingSet = new Set(
      existingAlignments.map(a => `${a.fromGoalId}:${a.toGoalId}`)
    );

    // Goals that could align (individuals -> team/dept, team -> dept/company)
    const alignableGoals = goals.filter(g =>
      g.type === 'INDIVIDUAL' || g.type === 'TEAM' || g.type === 'OKR_KEY_RESULT'
    );

    const targetGoals = goals.filter(g =>
      g.type === 'TEAM' || g.type === 'DEPARTMENT' || g.type === 'COMPANY' || g.type === 'OKR_OBJECTIVE'
    );

    for (const source of alignableGoals) {
      // Skip if already has parent
      if (source.parentGoalId) continue;

      for (const target of targetGoals) {
        // Skip self-alignment
        if (source.id === target.id) continue;

        // Skip if already aligned
        if (existingSet.has(`${source.id}:${target.id}`)) continue;

        // Skip invalid alignment types
        if (!this.isValidAlignmentType(source.type, target.type)) continue;

        // Calculate similarity
        const similarity = this.calculateSimilarity(source, target);
        if (similarity.score > 0.3) {
          suggestions.push({
            sourceGoalId: source.id,
            sourceGoalTitle: source.title,
            targetGoalId: target.id,
            targetGoalTitle: target.title,
            confidence: Math.round(similarity.score * 100),
            reason: similarity.reason,
          });
        }
      }
    }

    // Sort by confidence descending
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Gets orphan goals that need alignment
   */
  getOrphanGoals(goals: GoalInput[], alignments: AlignmentInput[]): GoalInput[] {
    const alignedGoals = new Set(alignments.map(a => a.fromGoalId));
    const hasParent = new Set(goals.filter(g => g.parentGoalId).map(g => g.id));

    return goals.filter(g =>
      !hasParent.has(g.id) &&
      !alignedGoals.has(g.id) &&
      g.type !== 'COMPANY' &&
      g.type !== 'DEPARTMENT' &&
      g.type !== 'OKR_OBJECTIVE'
    );
  }

  /**
   * Generates D3.js compatible hierarchy data
   */
  toD3Hierarchy(goals: GoalInput[]): object {
    const goalMap = new Map(goals.map(g => [g.id, g]));
    const childrenMap = new Map<string, GoalInput[]>();

    // Build children map
    for (const goal of goals) {
      if (goal.parentGoalId) {
        const siblings = childrenMap.get(goal.parentGoalId) ?? [];
        siblings.push(goal);
        childrenMap.set(goal.parentGoalId, siblings);
      }
    }

    // Find root goals
    const roots = goals.filter(g => !g.parentGoalId);

    const buildNode = (goal: GoalInput): object => {
      const children = childrenMap.get(goal.id) ?? [];
      return {
        id: goal.id,
        name: goal.title,
        type: goal.type,
        status: goal.status,
        progress: goal.progress,
        owner: goal.ownerName,
        value: goal.weight,
        children: children.map(buildNode),
      };
    };

    if (roots.length === 1) {
      return buildNode(roots[0]);
    }

    // Multiple roots - create virtual root
    return {
      id: 'root',
      name: 'Organization Goals',
      type: 'ROOT',
      status: 'ACTIVE',
      progress: goals.reduce((sum, g) => sum + g.progress, 0) / goals.length,
      children: roots.map(buildNode),
    };
  }

  /**
   * Generates D3.js compatible force graph data
   */
  toD3ForceGraph(goals: GoalInput[], alignments: AlignmentInput[]): object {
    const nodes = goals.map(g => ({
      id: g.id,
      name: g.title,
      type: g.type,
      status: g.status,
      progress: g.progress,
      owner: g.ownerName,
      group: this.getTypeGroup(g.type),
      radius: this.getNodeRadius(g.type, g.progress),
    }));

    const links: Array<{ source: string; target: string; type: string; value: number }> = [];

    // Parent-child links
    for (const goal of goals) {
      if (goal.parentGoalId) {
        links.push({
          source: goal.id,
          target: goal.parentGoalId,
          type: 'parent',
          value: goal.weight,
        });
      }
    }

    // Alignment links
    for (const alignment of alignments) {
      links.push({
        source: alignment.fromGoalId,
        target: alignment.toGoalId,
        type: 'alignment',
        value: alignment.weight,
      });
    }

    return { nodes, links };
  }

  // Helper methods
  private isValidAlignmentType(sourceType: string, targetType: string): boolean {
    const validAlignments: Record<string, string[]> = {
      'INDIVIDUAL': ['TEAM', 'DEPARTMENT', 'COMPANY'],
      'TEAM': ['DEPARTMENT', 'COMPANY'],
      'DEPARTMENT': ['COMPANY'],
      'OKR_KEY_RESULT': ['OKR_OBJECTIVE', 'TEAM', 'DEPARTMENT', 'COMPANY'],
    };

    return validAlignments[sourceType]?.includes(targetType) ?? false;
  }

  private calculateSimilarity(source: GoalInput, target: GoalInput): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Same department
    if (source.departmentId && source.departmentId === target.departmentId) {
      score += 0.3;
      reasons.push('same department');
    }

    // Text similarity (simple word overlap)
    const sourceWords = new Set(
      (source.title + ' ' + (source.description ?? '')).toLowerCase().split(/\s+/)
    );
    const targetWords = new Set(
      (target.title + ' ' + (target.description ?? '')).toLowerCase().split(/\s+/)
    );

    const intersection = [...sourceWords].filter(w => targetWords.has(w) && w.length > 3);
    const wordOverlap = intersection.length / Math.max(sourceWords.size, targetWords.size);
    score += wordOverlap * 0.4;
    if (wordOverlap > 0.2) {
      reasons.push('keyword match');
    }

    // Tag overlap
    if (source.tags && target.tags) {
      const sourceTags = new Set(source.tags);
      const tagOverlap = target.tags.filter(t => sourceTags.has(t)).length;
      if (tagOverlap > 0) {
        score += Math.min(tagOverlap * 0.15, 0.3);
        reasons.push('shared tags');
      }
    }

    // Owner relationship (if same owner owns a target)
    if (source.ownerId === target.ownerId) {
      score += 0.1;
      reasons.push('same owner');
    }

    return {
      score: Math.min(score, 1),
      reason: reasons.length > 0 ? reasons.join(', ') : 'potential strategic fit',
    };
  }

  private getTypeGroup(type: string): number {
    const groups: Record<string, number> = {
      'COMPANY': 0,
      'DEPARTMENT': 1,
      'TEAM': 2,
      'OKR_OBJECTIVE': 3,
      'OKR_KEY_RESULT': 4,
      'INDIVIDUAL': 5,
    };
    return groups[type] ?? 5;
  }

  private getNodeRadius(type: string, progress: number): number {
    const baseRadius: Record<string, number> = {
      'COMPANY': 30,
      'DEPARTMENT': 25,
      'TEAM': 20,
      'OKR_OBJECTIVE': 18,
      'OKR_KEY_RESULT': 12,
      'INDIVIDUAL': 10,
    };
    const base = baseRadius[type] ?? 10;
    // Slightly increase radius based on progress
    return base + (progress / 100) * 5;
  }
}

export const goalAlignmentService = new GoalAlignmentService();
