import { useState, useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import clsx from 'clsx';

interface DepartmentEngagement {
  departmentId: string;
  departmentName: string;
  averageScore: number;
  employeeCount: number;
  componentScores: {
    participation: number;
    communication: number;
    collaboration: number;
    initiative: number;
    responsiveness: number;
  };
}

interface DepartmentRadarProps {
  departments: DepartmentEngagement[];
  selectedDeptIds?: string[];
  className?: string;
}

const RADAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];
const AXIS_LABELS: Record<string, string> = {
  participation: 'Participation',
  communication: 'Communication',
  collaboration: 'Collaboration',
  initiative: 'Initiative',
  responsiveness: 'Responsiveness',
};

export function DepartmentRadar({ departments, selectedDeptIds: initialSelected, className }: DepartmentRadarProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelected?.length) return initialSelected.slice(0, 3);
    return departments.slice(0, Math.min(2, departments.length)).map((d) => d.departmentId);
  });

  const selectedDepts = useMemo(
    () => departments.filter((d) => selectedIds.includes(d.departmentId)),
    [departments, selectedIds]
  );

  const chartData = useMemo(() => {
    const axes = Object.keys(AXIS_LABELS) as (keyof DepartmentEngagement['componentScores'])[];
    return axes.map((axis) => {
      const point: Record<string, string | number> = { axis: AXIS_LABELS[axis] };
      selectedDepts.forEach((dept) => {
        point[dept.departmentName] = Number(((dept.componentScores?.[axis] ?? 0) * 100).toFixed(0));
      });
      return point;
    });
  }, [selectedDepts]);

  const toggleDept = (deptId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(deptId)) return prev.filter((id) => id !== deptId);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, deptId];
    });
  };

  if (departments.length === 0) {
    return (
      <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Department Comparison</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-8">No department data available.</p>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-3">Department Comparison</h3>

      {/* Department selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {departments.map((dept, i) => {
          const isSelected = selectedIds.includes(dept.departmentId);
          const colorIdx = isSelected ? selectedIds.indexOf(dept.departmentId) : -1;
          return (
            <button
              key={dept.departmentId}
              onClick={() => toggleDept(dept.departmentId)}
              className={clsx(
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                isSelected
                  ? 'text-white border-transparent'
                  : 'text-secondary-600 dark:text-secondary-400 border-secondary-300 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700'
              )}
              style={isSelected ? { backgroundColor: RADAR_COLORS[colorIdx] || RADAR_COLORS[0] } : undefined}
              disabled={!isSelected && selectedIds.length >= 3}
              title={!isSelected && selectedIds.length >= 3 ? 'Max 3 departments' : undefined}
            >
              {dept.departmentName}
            </button>
          );
        })}
      </div>
      {selectedIds.length >= 3 && (
        <p className="text-[10px] text-secondary-400 dark:text-secondary-500 -mt-2 mb-3">Maximum 3 departments can be compared at once</p>
      )}

      {/* Radar chart */}
      {selectedDepts.length > 0 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid className="stroke-secondary-200 dark:stroke-secondary-700" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fontSize: 11 }}
                className="fill-secondary-600 dark:fill-secondary-400"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
                className="fill-secondary-400 dark:fill-secondary-500"
              />
              {selectedDepts.map((dept, i) => (
                <Radar
                  key={dept.departmentId}
                  name={dept.departmentName}
                  dataKey={dept.departmentName}
                  stroke={RADAR_COLORS[i]}
                  fill={RADAR_COLORS[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  borderColor: 'var(--tooltip-border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-8">
          Select departments above to compare.
        </p>
      )}
    </div>
  );
}
