/**
 * What-If Simulator UI Components
 *
 * Interactive simulation tools for exploring hypothetical scenarios
 * in performance management, compensation, goals, and team planning.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  useRef,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationVariable {
  id: string;
  name: string;
  description?: string;
  type: 'number' | 'percentage' | 'currency' | 'rating' | 'boolean' | 'select';
  currentValue: number | boolean | string;
  simulatedValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  unit?: string;
  category?: string;
  impact?: 'high' | 'medium' | 'low';
  locked?: boolean;
  dependencies?: string[];
}

export interface SimulationOutcome {
  id: string;
  name: string;
  description?: string;
  baselineValue: number;
  simulatedValue: number;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'rating';
  trend?: 'increase' | 'decrease' | 'stable';
  confidence?: number;
  breakdown?: { label: string; value: number; change: number }[];
}

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, number | boolean | string>;
  outcomes?: SimulationOutcome[];
  createdAt: Date;
  isSaved?: boolean;
  tags?: string[];
}

export interface SimulationConstraint {
  id: string;
  type: 'min' | 'max' | 'equals' | 'range' | 'custom';
  targetVariable?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  message: string;
  validate: (variables: Record<string, unknown>) => boolean;
}

export interface SimulationConfig {
  title: string;
  description?: string;
  variables: SimulationVariable[];
  outcomes: Omit<SimulationOutcome, 'simulatedValue'>[];
  constraints?: SimulationConstraint[];
  calculateOutcomes: (variables: Record<string, unknown>) => SimulationOutcome[];
  presetScenarios?: SimulationScenario[];
}

// ============================================================================
// SIMULATION CONTEXT
// ============================================================================

interface SimulationState {
  variables: SimulationVariable[];
  outcomes: SimulationOutcome[];
  scenarios: SimulationScenario[];
  activeScenarioId: string | null;
  constraints: SimulationConstraint[];
  constraintViolations: string[];
  isSimulating: boolean;
  showComparison: boolean;
  history: { variables: Record<string, unknown>; timestamp: Date }[];
}

type SimulationAction =
  | { type: 'SET_VARIABLE'; id: string; value: number | boolean | string }
  | { type: 'RESET_VARIABLE'; id: string }
  | { type: 'RESET_ALL' }
  | { type: 'LOCK_VARIABLE'; id: string; locked: boolean }
  | { type: 'SET_OUTCOMES'; outcomes: SimulationOutcome[] }
  | { type: 'SAVE_SCENARIO'; scenario: SimulationScenario }
  | { type: 'LOAD_SCENARIO'; scenarioId: string }
  | { type: 'DELETE_SCENARIO'; scenarioId: string }
  | { type: 'SET_CONSTRAINT_VIOLATIONS'; violations: string[] }
  | { type: 'SET_SIMULATING'; isSimulating: boolean }
  | { type: 'TOGGLE_COMPARISON' }
  | { type: 'ADD_TO_HISTORY' };

function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'SET_VARIABLE': {
      const variables = state.variables.map(v =>
        v.id === action.id ? { ...v, simulatedValue: action.value } : v
      );
      return { ...state, variables };
    }
    case 'RESET_VARIABLE': {
      const variables = state.variables.map(v =>
        v.id === action.id ? { ...v, simulatedValue: v.currentValue } : v
      );
      return { ...state, variables };
    }
    case 'RESET_ALL': {
      const variables = state.variables.map(v => ({
        ...v,
        simulatedValue: v.currentValue,
      }));
      return { ...state, variables, activeScenarioId: null };
    }
    case 'LOCK_VARIABLE': {
      const variables = state.variables.map(v =>
        v.id === action.id ? { ...v, locked: action.locked } : v
      );
      return { ...state, variables };
    }
    case 'SET_OUTCOMES':
      return { ...state, outcomes: action.outcomes };
    case 'SAVE_SCENARIO':
      return {
        ...state,
        scenarios: [...state.scenarios, action.scenario],
        activeScenarioId: action.scenario.id,
      };
    case 'LOAD_SCENARIO': {
      const scenario = state.scenarios.find(s => s.id === action.scenarioId);
      if (!scenario) return state;
      const variables = state.variables.map(v => ({
        ...v,
        simulatedValue: scenario.variables[v.id] ?? v.currentValue,
      }));
      return { ...state, variables, activeScenarioId: action.scenarioId };
    }
    case 'DELETE_SCENARIO': {
      const scenarios = state.scenarios.filter(s => s.id !== action.scenarioId);
      const activeScenarioId =
        state.activeScenarioId === action.scenarioId ? null : state.activeScenarioId;
      return { ...state, scenarios, activeScenarioId };
    }
    case 'SET_CONSTRAINT_VIOLATIONS':
      return { ...state, constraintViolations: action.violations };
    case 'SET_SIMULATING':
      return { ...state, isSimulating: action.isSimulating };
    case 'TOGGLE_COMPARISON':
      return { ...state, showComparison: !state.showComparison };
    case 'ADD_TO_HISTORY': {
      const variableValues: Record<string, unknown> = {};
      state.variables.forEach(v => {
        variableValues[v.id] = v.simulatedValue;
      });
      return {
        ...state,
        history: [...state.history, { variables: variableValues, timestamp: new Date() }].slice(-50),
      };
    }
    default:
      return state;
  }
}

interface SimulationContextValue {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
  setVariable: (id: string, value: number | boolean | string) => void;
  resetVariable: (id: string) => void;
  resetAll: () => void;
  lockVariable: (id: string, locked: boolean) => void;
  saveScenario: (name: string, description?: string) => void;
  loadScenario: (scenarioId: string) => void;
  deleteScenario: (scenarioId: string) => void;
  runSimulation: () => Promise<void>;
  getVariableValue: (id: string) => unknown;
  hasChanges: boolean;
  changedVariables: SimulationVariable[];
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

// ============================================================================
// SIMULATION PROVIDER
// ============================================================================

interface SimulationProviderProps {
  config: SimulationConfig;
  children: React.ReactNode;
  onSimulate?: (variables: Record<string, unknown>) => Promise<SimulationOutcome[]>;
  autoSimulate?: boolean;
  debounceMs?: number;
}

export function SimulationProvider({
  config,
  children,
  onSimulate,
  autoSimulate = true,
  debounceMs = 300,
}: SimulationProviderProps): React.ReactElement {
  const initialState: SimulationState = {
    variables: config.variables.map(v => ({
      ...v,
      simulatedValue: v.simulatedValue ?? v.currentValue,
    })),
    outcomes: config.outcomes.map(o => ({ ...o, simulatedValue: o.baselineValue })),
    scenarios: config.presetScenarios || [],
    activeScenarioId: null,
    constraints: config.constraints || [],
    constraintViolations: [],
    isSimulating: false,
    showComparison: true,
    history: [],
  };

  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const debounceRef = useRef<NodeJS.Timeout>();

  const hasChanges = useMemo(() => {
    return state.variables.some(v => v.simulatedValue !== v.currentValue);
  }, [state.variables]);

  const changedVariables = useMemo(() => {
    return state.variables.filter(v => v.simulatedValue !== v.currentValue);
  }, [state.variables]);

  const runSimulation = useCallback(async () => {
    dispatch({ type: 'SET_SIMULATING', isSimulating: true });

    const variableValues: Record<string, unknown> = {};
    state.variables.forEach(v => {
      variableValues[v.id] = v.simulatedValue;
    });

    // Check constraints
    const violations = state.constraints
      .filter(c => !c.validate(variableValues))
      .map(c => c.id);
    dispatch({ type: 'SET_CONSTRAINT_VIOLATIONS', violations });

    try {
      let outcomes: SimulationOutcome[];
      if (onSimulate) {
        outcomes = await onSimulate(variableValues);
      } else {
        outcomes = config.calculateOutcomes(variableValues);
      }
      dispatch({ type: 'SET_OUTCOMES', outcomes });
      dispatch({ type: 'ADD_TO_HISTORY' });
    } finally {
      dispatch({ type: 'SET_SIMULATING', isSimulating: false });
    }
  }, [state.variables, state.constraints, onSimulate, config]);

  // Auto-simulate when variables change
  useEffect(() => {
    if (!autoSimulate) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      runSimulation();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.variables, autoSimulate, debounceMs, runSimulation]);

  const setVariable = useCallback((id: string, value: number | boolean | string) => {
    const variable = state.variables.find(v => v.id === id);
    if (variable?.locked) return;
    dispatch({ type: 'SET_VARIABLE', id, value });
  }, [state.variables]);

  const resetVariable = useCallback((id: string) => {
    dispatch({ type: 'RESET_VARIABLE', id });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const lockVariable = useCallback((id: string, locked: boolean) => {
    dispatch({ type: 'LOCK_VARIABLE', id, locked });
  }, []);

  const saveScenario = useCallback((name: string, description?: string) => {
    const variableValues: Record<string, number | boolean | string> = {};
    state.variables.forEach(v => {
      variableValues[v.id] = v.simulatedValue;
    });

    const scenario: SimulationScenario = {
      id: `scenario-${Date.now()}`,
      name,
      description,
      variables: variableValues,
      outcomes: state.outcomes,
      createdAt: new Date(),
      isSaved: true,
    };

    dispatch({ type: 'SAVE_SCENARIO', scenario });
  }, [state.variables, state.outcomes]);

  const loadScenario = useCallback((scenarioId: string) => {
    dispatch({ type: 'LOAD_SCENARIO', scenarioId });
  }, []);

  const deleteScenario = useCallback((scenarioId: string) => {
    dispatch({ type: 'DELETE_SCENARIO', scenarioId });
  }, []);

  const getVariableValue = useCallback((id: string) => {
    const variable = state.variables.find(v => v.id === id);
    return variable?.simulatedValue;
  }, [state.variables]);

  const value: SimulationContextValue = {
    state,
    dispatch,
    setVariable,
    resetVariable,
    resetAll,
    lockVariable,
    saveScenario,
    loadScenario,
    deleteScenario,
    runSimulation,
    getVariableValue,
    hasChanges,
    changedVariables,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

// ============================================================================
// SIMULATION PANEL
// ============================================================================

interface SimulationPanelProps {
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function SimulationPanel({
  className = '',
  layout = 'horizontal',
}: SimulationPanelProps): React.ReactElement {
  const { state, resetAll, hasChanges } = useSimulation();

  const groupedVariables = useMemo(() => {
    const groups: Record<string, SimulationVariable[]> = {};
    state.variables.forEach(v => {
      const category = v.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(v);
    });
    return groups;
  }, [state.variables]);

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">What-If Simulator</h2>
          <p className="text-sm text-gray-500 mt-1">
            Adjust variables to see projected outcomes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              {state.variables.filter(v => v.simulatedValue !== v.currentValue).length} changes
            </span>
          )}
          <button
            onClick={resetAll}
            disabled={!hasChanges}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Constraint violations */}
      {state.constraintViolations.length > 0 && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">Constraint Violations:</p>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {state.constraintViolations.map(id => {
              const constraint = state.constraints.find(c => c.id === id);
              return <li key={id}>{constraint?.message}</li>;
            })}
          </ul>
        </div>
      )}

      {/* Variables and outcomes */}
      <div className={`${layout === 'horizontal' ? 'flex' : 'flex flex-col'} divide-gray-200 ${layout === 'horizontal' ? 'divide-x' : 'divide-y'}`}>
        {/* Variables */}
        <div className={`${layout === 'horizontal' ? 'w-1/2' : ''} p-4 overflow-y-auto`}>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Variables</h3>

          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h4>
              <div className="space-y-4">
                {variables.map(variable => (
                  <VariableControl key={variable.id} variable={variable} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Outcomes */}
        <div className={`${layout === 'horizontal' ? 'w-1/2' : ''} p-4 bg-gray-50`}>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Projected Outcomes</h3>

          {state.isSimulating ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {state.outcomes.map(outcome => (
                <OutcomeCard key={outcome.id} outcome={outcome} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VARIABLE CONTROL
// ============================================================================

interface VariableControlProps {
  variable: SimulationVariable;
  compact?: boolean;
}

export function VariableControl({
  variable,
  compact = false,
}: VariableControlProps): React.ReactElement {
  const { setVariable, resetVariable, lockVariable } = useSimulation();

  const hasChanged = variable.simulatedValue !== variable.currentValue;

  const formatValue = (value: number | boolean | string): string => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string') return value;
    if (variable.type === 'percentage') return `${value}%`;
    if (variable.type === 'currency') return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const handleChange = (newValue: number | boolean | string) => {
    setVariable(variable.id, newValue);
  };

  const renderInput = () => {
    switch (variable.type) {
      case 'boolean':
        return (
          <button
            onClick={() => handleChange(!variable.simulatedValue)}
            disabled={variable.locked}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              variable.simulatedValue ? 'bg-blue-600' : 'bg-gray-300'
            } ${variable.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                variable.simulatedValue ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );

      case 'select':
        return (
          <select
            value={String(variable.simulatedValue)}
            onChange={e => handleChange(e.target.value)}
            disabled={variable.locked}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {variable.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => handleChange(rating)}
                disabled={variable.locked}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  Number(variable.simulatedValue) >= rating
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-200 text-gray-600'
                } ${variable.locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-300'}`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={variable.min ?? 0}
              max={variable.max ?? 100}
              step={variable.step ?? 1}
              value={Number(variable.simulatedValue)}
              onChange={e => handleChange(Number(e.target.value))}
              disabled={variable.locked}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <input
                type="number"
                min={variable.min ?? 0}
                max={variable.max ?? 100}
                step={variable.step ?? 1}
                value={Number(variable.simulatedValue)}
                onChange={e => handleChange(Number(e.target.value))}
                disabled={variable.locked}
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              {variable.unit && (
                <span className="text-sm text-gray-500">{variable.unit}</span>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`${compact ? 'py-2' : 'p-3'} rounded-lg ${hasChanged ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900">{variable.name}</h4>
            {variable.impact && (
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                variable.impact === 'high'
                  ? 'bg-red-100 text-red-700'
                  : variable.impact === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {variable.impact}
              </span>
            )}
          </div>
          {variable.description && !compact && (
            <p className="text-xs text-gray-500 mt-0.5">{variable.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasChanged && (
            <button
              onClick={() => resetVariable(variable.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Reset to current value"
            >
              ↺
            </button>
          )}
          <button
            onClick={() => lockVariable(variable.id, !variable.locked)}
            className={`p-1 ${variable.locked ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            title={variable.locked ? 'Unlock variable' : 'Lock variable'}
          >
            {variable.locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Current vs simulated */}
      {hasChanged && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="text-gray-500">
            Current: {formatValue(variable.currentValue)}
          </span>
          <span className="text-blue-600">→</span>
          <span className="text-blue-600 font-medium">
            Simulated: {formatValue(variable.simulatedValue)}
          </span>
        </div>
      )}

      {renderInput()}
    </div>
  );
}

// ============================================================================
// OUTCOME CARD
// ============================================================================

interface OutcomeCardProps {
  outcome: SimulationOutcome;
  showBreakdown?: boolean;
}

export function OutcomeCard({
  outcome,
  showBreakdown = true,
}: OutcomeCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  const change = outcome.simulatedValue - outcome.baselineValue;
  const changePercent = outcome.baselineValue !== 0
    ? (change / outcome.baselineValue) * 100
    : 0;

  const formatValue = (value: number): string => {
    switch (outcome.format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'rating':
        return value.toFixed(2);
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">{outcome.name}</h4>
            {outcome.description && (
              <p className="text-xs text-gray-500 mt-0.5">{outcome.description}</p>
            )}
          </div>

          {showBreakdown && outcome.breakdown && (
            <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
          )}
        </div>

        <div className="mt-3 flex items-end gap-4">
          {/* Baseline */}
          <div>
            <p className="text-xs text-gray-500">Baseline</p>
            <p className="text-lg font-medium text-gray-600">
              {formatValue(outcome.baselineValue)}
            </p>
          </div>

          {/* Arrow */}
          <div className={`text-2xl ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            →
          </div>

          {/* Simulated */}
          <div>
            <p className="text-xs text-gray-500">Projected</p>
            <p className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatValue(outcome.simulatedValue)}
            </p>
          </div>

          {/* Change */}
          <div className={`px-2 py-1 rounded ${change >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className={`text-sm font-medium ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Confidence */}
        {outcome.confidence !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${outcome.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {Math.round(outcome.confidence * 100)}% confidence
            </span>
          </div>
        )}
      </button>

      {/* Breakdown */}
      {expanded && outcome.breakdown && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3">Breakdown</h5>
          <div className="space-y-2">
            {outcome.breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatValue(item.value)}</span>
                  <span className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENARIO MANAGER
// ============================================================================

interface ScenarioManagerProps {
  className?: string;
}

export function ScenarioManager({ className = '' }: ScenarioManagerProps): React.ReactElement {
  const { state, saveScenario, loadScenario, deleteScenario, hasChanges } = useSimulation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');

  const handleSave = () => {
    if (newScenarioName.trim()) {
      saveScenario(newScenarioName.trim(), newScenarioDescription.trim() || undefined);
      setNewScenarioName('');
      setNewScenarioDescription('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Saved Scenarios</h3>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!hasChanges}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Current
        </button>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Scenario name"
              value={newScenarioName}
              onChange={e => setNewScenarioName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newScenarioDescription}
              onChange={e => setNewScenarioDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newScenarioName.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario list */}
      <div className="divide-y divide-gray-200">
        {state.scenarios.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No saved scenarios yet
          </div>
        ) : (
          state.scenarios.map(scenario => (
            <div
              key={scenario.id}
              className={`p-4 hover:bg-gray-50 ${state.activeScenarioId === scenario.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  {scenario.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{scenario.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {scenario.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadScenario(scenario.id)}
                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deleteScenario(scenario.id)}
                    className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIMULATION COMPARISON
// ============================================================================

interface SimulationComparisonProps {
  scenarios: SimulationScenario[];
  className?: string;
}

export function SimulationComparison({
  scenarios,
  className = '',
}: SimulationComparisonProps): React.ReactElement {
  const { state } = useSimulation();

  if (scenarios.length < 2) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 text-center text-gray-500 ${className}`}>
        Select at least 2 scenarios to compare
      </div>
    );
  }

  const allOutcomeIds = new Set<string>();
  scenarios.forEach(s => {
    s.outcomes?.forEach(o => allOutcomeIds.add(o.id));
  });

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Scenario Comparison</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Outcome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Baseline
              </th>
              {scenarios.map(scenario => (
                <th
                  key={scenario.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {scenario.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from(allOutcomeIds).map(outcomeId => {
              const baseOutcome = state.outcomes.find(o => o.id === outcomeId);
              if (!baseOutcome) return null;

              return (
                <tr key={outcomeId}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {baseOutcome.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {baseOutcome.baselineValue.toLocaleString()}
                  </td>
                  {scenarios.map(scenario => {
                    const outcome = scenario.outcomes?.find(o => o.id === outcomeId);
                    if (!outcome) return <td key={scenario.id} className="px-4 py-3">-</td>;

                    const change = outcome.simulatedValue - baseOutcome.baselineValue;
                    const changePercent = baseOutcome.baselineValue !== 0
                      ? (change / baseOutcome.baselineValue) * 100
                      : 0;

                    return (
                      <td key={scenario.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {outcome.simulatedValue.toLocaleString()}
                          </span>
                          <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

interface SensitivityAnalysisProps {
  variableId: string;
  outcomeId: string;
  steps?: number;
  className?: string;
}

export function SensitivityAnalysis({
  variableId,
  outcomeId,
  steps = 10,
  className = '',
}: SensitivityAnalysisProps): React.ReactElement {
  const { state } = useSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const variable = state.variables.find(v => v.id === variableId);
  const outcome = state.outcomes.find(o => o.id === outcomeId);

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    if (!variable || variable.type === 'boolean' || variable.type === 'select') return [];

    const min = variable.min ?? 0;
    const max = variable.max ?? 100;
    const stepSize = (max - min) / steps;

    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = min + stepSize * i;
      // In a real implementation, this would call the simulation function
      const simulatedOutcome = outcome?.baselineValue ?? 0 * (1 + (value - Number(variable.currentValue)) / 100 * 0.5);
      return { value, outcome: simulatedOutcome };
    });
  }, [variable, outcome, steps]);

  // Draw sensitivity chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sensitivityData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const minX = sensitivityData[0].value;
    const maxX = sensitivityData[sensitivityData.length - 1].value;
    const minY = Math.min(...sensitivityData.map(d => d.outcome));
    const maxY = Math.max(...sensitivityData.map(d => d.outcome));

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    sensitivityData.forEach((point, i) => {
      const x = padding.left + ((point.value - minX) / (maxX - minX)) * chartWidth;
      const y = padding.top + ((maxY - point.outcome) / (maxY - minY || 1)) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current value marker
    if (variable) {
      const currentX = padding.left + ((Number(variable.currentValue) - minX) / (maxX - minX)) * chartWidth;
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentX, padding.top);
      ctx.lineTo(currentX, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(variable?.name || 'Variable', rect.width / 2, rect.height - 5);

  }, [sensitivityData, variable]);

  if (!variable || !outcome) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <p className="text-gray-500">Variable or outcome not found</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Sensitivity Analysis</h3>
        <p className="text-sm text-gray-500 mt-1">
          Impact of {variable.name} on {outcome.name}
        </p>
      </div>
      <div className="p-4">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 200 }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SimulationProvider,
  SimulationPanel,
  VariableControl,
  OutcomeCard,
  ScenarioManager,
  SimulationComparison,
  SensitivityAnalysis,
  useSimulation,
};
