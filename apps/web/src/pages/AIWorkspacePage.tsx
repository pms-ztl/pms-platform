/**
 * AI Workspace Page — The immersive AI experience.
 *
 * This page is rendered in place of the normal dashboard when the user
 * has AI access enabled and toggles into AI mode. It provides a full-screen
 * dark-themed environment with chat, agents, insights, and quick actions.
 */

import { AIWorkspaceLayout } from '@/components/ai-workspace';

export function AIWorkspacePage() {
  return <AIWorkspaceLayout />;
}
