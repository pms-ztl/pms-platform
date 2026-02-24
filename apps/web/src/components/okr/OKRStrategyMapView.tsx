import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Goal } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusDot(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

// Distinct lane colors per pillar
const laneColors = [
  { bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800', accent: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', line: '#a855f7' },
  { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', accent: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', line: '#3b82f6' },
  { bg: 'bg-teal-50 dark:bg-teal-900/10', border: 'border-teal-200 dark:border-teal-800', accent: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300', line: '#14b8a6' },
  { bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800', accent: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', line: '#f43f5e' },
  { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', accent: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', line: '#f59e0b' },
  { bg: 'bg-cyan-50 dark:bg-cyan-900/10', border: 'border-cyan-200 dark:border-cyan-800', accent: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', line: '#06b6d4' },
];

interface ColumnGoal {
  goal: Goal;
  pillarIdx: number;
  parentId?: string;
}

// ---------------------------------------------------------------------------
// Strategy Node Card
// ---------------------------------------------------------------------------

function StrategyNode({
  goal,
  color,
  refCallback,
  onSelect,
}: {
  goal: Goal;
  color: typeof laneColors[number];
  refCallback?: (el: HTMLDivElement | null) => void;
  onSelect?: (g: Goal) => void;
}) {
  return (
    <div
      ref={refCallback}
      data-goal-id={goal.id}
      onClick={() => onSelect?.(goal)}
      className={clsx(
        'w-56 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md',
        color.bg, color.border
      )}
    >
      <div className="flex items-center gap-2">
        <div className={clsx('h-2.5 w-2.5 rounded-full shrink-0', statusDot(goal.progress))} />
        <p className={clsx('text-xs font-semibold break-words', color.text)}>
          {goal.title}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/50 dark:bg-secondary-700/50 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full', statusDot(goal.progress))}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
        <span className="text-2xs font-bold text-secondary-600 dark:text-secondary-400">
          {Math.round(goal.progress)}%
        </span>
      </div>
      {goal.owner && (
        <p className="text-2xs text-secondary-400 dark:text-secondary-500 mt-1.5 break-words">
          {goal.owner.firstName} {goal.owner.lastName}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

interface OKRStrategyMapViewProps {
  treeData: Goal[];
  onSelect: (goal: Goal) => void;
}

export function OKRStrategyMapView({ treeData, onSelect }: OKRStrategyMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>>([]);

  // Build 3 columns from tree data
  const { pillars, annualGoals, quarterlyOKRs } = useMemo(() => {
    const pList: ColumnGoal[] = [];
    const aList: ColumnGoal[] = [];
    const qList: ColumnGoal[] = [];

    // Company-level goals are pillars
    const companyGoals = treeData.filter(g => g.type === 'COMPANY');

    if (companyGoals.length > 0) {
      companyGoals.forEach((cg, idx) => {
        const pIdx = idx % laneColors.length;
        pList.push({ goal: cg, pillarIdx: pIdx });

        // Children of company goals → annual goals
        (cg.childGoals || []).forEach(child => {
          aList.push({ goal: child, pillarIdx: pIdx, parentId: cg.id });

          // Children of annual goals → quarterly OKRs
          (child.childGoals || []).forEach(grandchild => {
            qList.push({ goal: grandchild, pillarIdx: pIdx, parentId: child.id });
          });
        });
      });
    } else {
      // Fallback: treat top-level OKR_OBJECTIVEs as pillars, their KRs as annual goals
      const topObjectives = treeData.filter(g => g.type === 'OKR_OBJECTIVE');
      topObjectives.forEach((obj, idx) => {
        const pIdx = idx % laneColors.length;
        pList.push({ goal: obj, pillarIdx: pIdx });

        (obj.childGoals || []).forEach(child => {
          aList.push({ goal: child, pillarIdx: pIdx, parentId: obj.id });

          (child.childGoals || []).forEach(grandchild => {
            qList.push({ goal: grandchild, pillarIdx: pIdx, parentId: child.id });
          });
        });
      });
    }

    return { pillars: pList, annualGoals: aList, quarterlyOKRs: qList };
  }, [treeData]);

  // Register node refs
  const setNodeRef = useCallback((goalId: string) => {
    return (el: HTMLDivElement | null) => {
      if (el) nodeRefs.current.set(goalId, el);
      else nodeRefs.current.delete(goalId);
    };
  }, []);

  // Calculate connection lines
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computeLines = () => {
      const containerRect = container.getBoundingClientRect();
      const newLines: typeof lines = [];

      // Pillar → Annual connections
      annualGoals.forEach(ag => {
        if (!ag.parentId) return;
        const parentEl = nodeRefs.current.get(ag.parentId);
        const childEl = nodeRefs.current.get(ag.goal.id);
        if (!parentEl || !childEl) return;

        const pRect = parentEl.getBoundingClientRect();
        const cRect = childEl.getBoundingClientRect();
        const pillar = pillars.find(p => p.goal.id === ag.parentId);
        const color = pillar ? laneColors[pillar.pillarIdx].line : '#94a3b8';

        newLines.push({
          x1: pRect.right - containerRect.left,
          y1: pRect.top + pRect.height / 2 - containerRect.top,
          x2: cRect.left - containerRect.left,
          y2: cRect.top + cRect.height / 2 - containerRect.top,
          color,
        });
      });

      // Annual → Quarterly connections
      quarterlyOKRs.forEach(qo => {
        if (!qo.parentId) return;
        const parentEl = nodeRefs.current.get(qo.parentId);
        const childEl = nodeRefs.current.get(qo.goal.id);
        if (!parentEl || !childEl) return;

        const pRect = parentEl.getBoundingClientRect();
        const cRect = childEl.getBoundingClientRect();
        const pillar = pillars.find(p => p.pillarIdx === qo.pillarIdx);
        const color = pillar ? laneColors[pillar.pillarIdx].line : '#94a3b8';

        newLines.push({
          x1: pRect.right - containerRect.left,
          y1: pRect.top + pRect.height / 2 - containerRect.top,
          x2: cRect.left - containerRect.left,
          y2: cRect.top + cRect.height / 2 - containerRect.top,
          color,
        });
      });

      setLines(newLines);
    };

    // Compute after DOM settle
    const timer = setTimeout(computeLines, 150);
    window.addEventListener('resize', computeLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', computeLines);
    };
  }, [pillars, annualGoals, quarterlyOKRs]);

  if (!treeData || treeData.length === 0) {
    return (
      <div className="text-center py-16">
        <FlagIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No strategy data</h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Create Company goals with child objectives to see the strategy map.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 overflow-x-auto">
      {/* Column headers */}
      <div className="flex gap-12 mb-6 min-w-[780px]">
        <div className="w-56 shrink-0">
          <h3 className="text-xs font-bold text-secondary-500 dark:text-secondary-400 tracking-wider">
            Strategic Pillars
          </h3>
          <p className="text-2xs text-secondary-400 mt-0.5">Company-level goals</p>
        </div>
        <div className="w-56 shrink-0">
          <h3 className="text-xs font-bold text-secondary-500 dark:text-secondary-400 tracking-wider">
            Annual Goals
          </h3>
          <p className="text-2xs text-secondary-400 mt-0.5">Department & team goals</p>
        </div>
        <div className="w-56 shrink-0">
          <h3 className="text-xs font-bold text-secondary-500 dark:text-secondary-400 tracking-wider">
            Quarterly OKRs
          </h3>
          <p className="text-2xs text-secondary-400 mt-0.5">Objectives & key results</p>
        </div>
      </div>

      {/* Map grid with SVG overlay */}
      <div ref={containerRef} className="relative min-w-[780px]">
        {/* SVG connector lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {lines.map((l, i) => (
            <path
              key={i}
              d={`M ${l.x1} ${l.y1} C ${l.x1 + 40} ${l.y1}, ${l.x2 - 40} ${l.y2}, ${l.x2} ${l.y2}`}
              fill="none"
              stroke={l.color}
              strokeWidth="2"
              strokeOpacity="0.4"
            />
          ))}
        </svg>

        {/* 3-column layout */}
        <div className="flex gap-12 relative" style={{ zIndex: 2 }}>
          {/* Col 1: Pillars */}
          <div className="w-56 shrink-0 space-y-4">
            {pillars.map((p) => (
              <StrategyNode
                key={p.goal.id}
                goal={p.goal}
                color={laneColors[p.pillarIdx]}
                refCallback={setNodeRef(p.goal.id)}
                onSelect={onSelect}
              />
            ))}
            {pillars.length === 0 && (
              <p className="text-xs text-secondary-400 italic">No pillars</p>
            )}
          </div>

          {/* Col 2: Annual Goals */}
          <div className="w-56 shrink-0 space-y-4">
            {annualGoals.map((ag) => (
              <StrategyNode
                key={ag.goal.id}
                goal={ag.goal}
                color={laneColors[ag.pillarIdx]}
                refCallback={setNodeRef(ag.goal.id)}
                onSelect={onSelect}
              />
            ))}
            {annualGoals.length === 0 && (
              <p className="text-xs text-secondary-400 italic">No annual goals</p>
            )}
          </div>

          {/* Col 3: Quarterly OKRs */}
          <div className="w-56 shrink-0 space-y-4">
            {quarterlyOKRs.map((qo) => (
              <StrategyNode
                key={qo.goal.id}
                goal={qo.goal}
                color={laneColors[qo.pillarIdx]}
                refCallback={setNodeRef(qo.goal.id)}
                onSelect={onSelect}
              />
            ))}
            {quarterlyOKRs.length === 0 && (
              <p className="text-xs text-secondary-400 italic">No quarterly OKRs</p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06] flex items-center gap-4 flex-wrap">
        <span className="text-2xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-2xs text-secondary-500 dark:text-secondary-400">On Track (&ge;70%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-2xs text-secondary-500 dark:text-secondary-400">At Risk (40-70%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-2xs text-secondary-500 dark:text-secondary-400">Behind (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
