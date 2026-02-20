/**
 * AIWorkspaceLayout - Entry point for the AI Workspace experience.
 *
 * Routes to the Neural Swarm Layout which provides the 3-mode UI:
 *   1. Swarm Overview — Neural map dashboard with all 65 agents
 *   2. Swarm Chat — Direct 1:1 agent conversation
 *   3. Swarm Orchestration — Multi-agent collaboration (up to 5 agents)
 */

import { NeuralSwarmLayout } from './NeuralSwarmLayout';

export function AIWorkspaceLayout() {
  return <NeuralSwarmLayout />;
}
