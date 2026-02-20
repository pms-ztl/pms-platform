// ============================================================================
// Performance Simulator API
// ============================================================================

import { api } from './client';

export interface SimulationInput {
  scenarioType: 'rating_change' | 'promotion' | 'career_paths' | 'team_restructure' | 'budget_allocation';
  employeeId?: string;
  teamId?: string;
  parameters: Record<string, any>;
}

export interface SimulationImpact {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  direction: 'positive' | 'negative' | 'neutral';
  value?: number;
}

export interface SimulationResult {
  scenarioType: string;
  confidence: number;
  impacts: SimulationImpact[];
  cascadingEffects: Array<{ trigger: string; effect: string; probability: number }>;
  recommendations: Array<{ title: string; description: string; priority: string }>;
  constraints: Array<{ name: string; violated: boolean; message: string }>;
}

export const simulatorApi = {
  runSimulation: (input: SimulationInput) =>
    api.post<SimulationResult>('/simulator/run', input),
};
