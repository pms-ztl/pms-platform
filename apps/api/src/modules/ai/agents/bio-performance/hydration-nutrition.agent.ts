/**
 * Hydration-Nutrition Agent -- hydration tracking & cognitive nutrition advice.
 *
 * Covers Features:
 * - Hydration Reminder Scheduling
 * - Cognitive Nutrition Optimization
 * - Meal Timing Recommendations
 * - Energy Dip Prevention
 * - Break-Time Nutrition Tips
 *
 * Roles: Employee, Manager
 * Analyzes session patterns (break frequency, session lengths) to time
 * hydration and nutrition reminders for optimal cognitive performance.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySessionActivity } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a workplace hydration and cognitive nutrition specialist integrated into a Performance Management System.

Your mission is to help employees maintain optimal hydration and nutrition habits that support sustained cognitive performance throughout the workday.

IMPORTANT DISCLAIMER: You are NOT a dietitian or medical professional. You provide general wellness guidance based on established nutritional science for cognitive performance. Always recommend consulting a healthcare provider for specific dietary needs or medical conditions.

Your capabilities:
1. **Hydration Reminder Scheduling**: Analyze session and break patterns to schedule water intake reminders. Target 8-10 glasses per workday, timed to natural break points.
2. **Cognitive Nutrition Optimization**: Recommend brain-supporting foods and nutrients (omega-3s, antioxidants, complex carbohydrates, B-vitamins) contextualized to workday timing. Suggest snacks that sustain focus without sugar crashes.
3. **Meal Timing Recommendations**: Based on session patterns, recommend optimal meal times that prevent post-lunch energy dips. Suggest eating windows that align with the user's active work periods.
4. **Energy Dip Prevention**: Identify afternoon slump patterns from session data and recommend proactive nutritional strategies (e.g., protein-rich mid-morning snack to prevent 2 PM crash).
5. **Break-Time Nutrition Tips**: Turn break periods into nutrition opportunities. Suggest quick, healthy snack options that can be consumed during micro-breaks.

Coaching principles:
- Reference actual session patterns (e.g., "You typically have a 15-min break at 11 AM -- perfect for a hydration + snack checkpoint").
- Keep recommendations simple and practical -- office/remote-friendly food suggestions.
- Use visual cues: [HYDRATE] [SNACK] [MEAL] [ENERGY DIP].
- Respect dietary preferences and restrictions -- ask before assuming.
- Focus on cognitive performance benefits, not weight management.
- Provide a daily hydration/nutrition schedule template when appropriate.
- Acknowledge that individual needs vary significantly.`;

// -- Agent Class -------------------------------------------------------------

export class HydrationNutritionAgent extends AgenticBaseAgent {
  constructor() {
    super('hydration_nutrition', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Determine session data window based on query intent
    const needsHistory =
      lower.includes('trend') ||
      lower.includes('history') ||
      lower.includes('month') ||
      lower.includes('pattern') ||
      lower.includes('over time') ||
      lower.includes('track');

    const days = needsHistory ? 30 : 7;

    // Fetch session activity for break pattern analysis and timing recommendations
    const sessions = await querySessionActivity(context.tenantId, context.userId, {
      days,
    });
    data.sessionActivity = sessions.data;

    // Add context hints so the LLM tailors nutritional advice to the focus area
    if (
      lower.includes('hydrat') ||
      lower.includes('water') ||
      lower.includes('drink') ||
      lower.includes('thirst')
    ) {
      data.focusArea = 'hydration';
    } else if (
      lower.includes('meal') ||
      lower.includes('lunch') ||
      lower.includes('breakfast') ||
      lower.includes('dinner') ||
      lower.includes('eating')
    ) {
      data.focusArea = 'meal_timing';
    } else if (
      lower.includes('snack') ||
      lower.includes('energy') ||
      lower.includes('crash') ||
      lower.includes('slump') ||
      lower.includes('afternoon')
    ) {
      data.focusArea = 'energy_management';
    } else if (
      lower.includes('caffeine') ||
      lower.includes('coffee') ||
      lower.includes('tea')
    ) {
      data.focusArea = 'caffeine_management';
    } else if (
      lower.includes('brain') ||
      lower.includes('cognitive') ||
      lower.includes('focus') ||
      lower.includes('concentrat')
    ) {
      data.focusArea = 'cognitive_nutrition';
    }

    return data;
  }
}
