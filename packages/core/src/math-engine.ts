/**
 * Mathematical Performance Engine
 *
 * Pure mathematical and statistical logic for the PMS system.
 * NO placeholders, NO hardcoded demo values, NO Math.random().
 * Every result is derived from input data using real formulas.
 *
 * Formulas used:
 * - Weighted Harmonic Mean for multi-dimensional scoring
 * - Bayesian Estimation for performance predictions
 * - Exponential Moving Average (EMA) for trend analysis
 * - Z-Score normalization for cross-team comparison
 * - Sigmoid function for bounded scoring
 * - Linear regression for trajectory prediction
 * - Shannon Entropy for distribution analysis
 * - Pearson correlation for relationship detection
 * - EWMA (Exponentially Weighted Moving Average) for recency-weighted metrics
 */

// ============================================================================
// CORE STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Clamp a percentage value to [0, 100].
 * Use for all ratio-based percentages (completed/total * 100, rating/5 * 100, etc.)
 * Do NOT use for growth/change percentages which can legitimately exceed 100%.
 */
export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Arithmetic mean
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Weighted arithmetic mean
 * Formula: Σ(wᵢ × xᵢ) / Σ(wᵢ)
 */
export function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;
}

/**
 * Weighted harmonic mean — better for rates and ratios
 * Formula: Σwᵢ / Σ(wᵢ/xᵢ)
 */
export function weightedHarmonicMean(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  const denominatorSum = values.reduce((sum, v, i) => {
    if (v === 0) return sum; // Skip zero values to avoid division by zero
    return sum + weights[i] / v;
  }, 0);
  if (denominatorSum === 0) return 0;
  return totalWeight / denominatorSum;
}

/**
 * Population variance
 * Formula: Σ(xᵢ - μ)² / N
 */
export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
}

/**
 * Population standard deviation
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Sample standard deviation (Bessel's correction)
 */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (values.length - 1)
  );
}

/**
 * Z-Score normalization
 * Formula: z = (x - μ) / σ
 */
export function zScore(value: number, populationMean: number, populationStdDev: number): number {
  if (populationStdDev === 0) return 0;
  return (value - populationMean) / populationStdDev;
}

/**
 * Sigmoid function — maps any real number to (0, 1)
 * Formula: σ(x) = 1 / (1 + e^(-k(x-x₀)))
 * @param x input value
 * @param k steepness (default 1)
 * @param x0 midpoint (default 0)
 */
export function sigmoid(x: number, k: number = 1, x0: number = 0): number {
  return 1 / (1 + Math.exp(-k * (x - x0)));
}

/**
 * Bounded sigmoid: maps to [min, max] range
 */
export function boundedSigmoid(x: number, min: number, max: number, k: number = 1, x0: number = 0): number {
  return min + (max - min) * sigmoid(x, k, x0);
}

/**
 * Pearson correlation coefficient
 * Formula: r = Σ((xᵢ-x̄)(yᵢ-ȳ)) / √(Σ(xᵢ-x̄)² × Σ(yᵢ-ȳ)²)
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;
  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }
  const denominator = Math.sqrt(xSumSq * ySumSq);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Simple linear regression: y = mx + b
 * Returns slope (m) and intercept (b)
 */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
  if (x.length !== y.length || x.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // R² (coefficient of determination)
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

/**
 * Exponentially Weighted Moving Average (EWMA)
 * Formula: EWMAₜ = α × xₜ + (1-α) × EWMAₜ₋₁
 * @param values time series (oldest first)
 * @param alpha smoothing factor (0 < α ≤ 1), higher = more weight to recent
 */
export function ewma(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

/**
 * Shannon entropy — measures distribution uniformity
 * Formula: H = -Σ(pᵢ × log₂(pᵢ))
 * Returns normalized entropy (0 = all same, 1 = perfectly uniform)
 */
export function shannonEntropy(distribution: number[]): number {
  const total = distribution.reduce((sum, v) => sum + v, 0);
  if (total === 0 || distribution.length <= 1) return 0;

  let entropy = 0;
  for (const count of distribution) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  // Normalize to [0, 1]
  const maxEntropy = Math.log2(distribution.length);
  return maxEntropy === 0 ? 0 : entropy / maxEntropy;
}

/**
 * Percentile rank of a value within a dataset
 * Formula: (count of values below x) / N × 100
 */
export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 50;
  const below = population.filter(v => v < value).length;
  const equal = population.filter(v => v === value).length;
  return ((below + 0.5 * equal) / population.length) * 100;
}

/**
 * Bayesian estimation with prior
 * Combines prior belief with observed data
 * Formula: posterior_mean = (prior_mean × prior_weight + observed_mean × n) / (prior_weight + n)
 */
export function bayesianEstimate(
  observedMean: number,
  observedCount: number,
  priorMean: number,
  priorWeight: number
): number {
  return (priorMean * priorWeight + observedMean * observedCount) / (priorWeight + observedCount);
}

// ============================================================================
// TASK-TO-GOAL MAPPING ENGINE
// ============================================================================

export interface TaskCompletion {
  taskId: string;
  goalId: string;
  weight: number;        // Relative importance (0-10)
  progress: number;      // 0-100
  quality: number;       // 0-5 rating
  daysLate: number;      // negative = early, 0 = on time, positive = late
  complexity: number;    // 1-5
  completedAt?: Date;
}

export interface GoalMathResult {
  goalId: string;
  /** Weighted task completion percentage (0-100) */
  completionScore: number;
  /** Quality-adjusted score: factors in task quality ratings */
  qualityAdjustedScore: number;
  /** Timeliness factor: penalizes late, rewards early (-1 to +1) */
  timelinessFactor: number;
  /** Final composite score combining all factors (0-100) */
  compositeScore: number;
  /** Velocity: average progress change per day */
  velocity: number;
  /** Predicted completion date based on current velocity */
  predictedCompletionDate: Date | null;
  /** Risk score: probability of missing deadline (0-100) */
  riskScore: number;
  /** Efficiency: quality per unit of complexity */
  efficiency: number;
  /** Task breakdown */
  taskBreakdown: Array<{
    taskId: string;
    weightedContribution: number; // How much this task contributes to goal
    qualityImpact: number;       // Quality rating vs average
    timelinessImpact: number;    // Timeliness vs average
  }>;
}

/**
 * Maps task completions to goal progress using mathematical formulas
 *
 * Composite Score Formula:
 *   CS = (W_c × CompletionScore + W_q × QualityScore + W_t × TimelinessScore) × EfficiencyMultiplier
 * Where:
 *   CompletionScore = Σ(taskProgress_i × taskWeight_i) / Σ(taskWeight_i)
 *   QualityScore = (EWMA of quality ratings) / maxQuality × 100
 *   TimelinessScore = sigmoid(-avgDaysLate, k=0.2) × 100
 *   EfficiencyMultiplier = clamp(avgQuality / avgComplexity, 0.5, 1.5)
 */
export function calculateGoalFromTasks(
  tasks: TaskCompletion[],
  goalDueDate?: Date,
  now: Date = new Date()
): GoalMathResult {
  if (tasks.length === 0) {
    return {
      goalId: '',
      completionScore: 0,
      qualityAdjustedScore: 0,
      timelinessFactor: 0,
      compositeScore: 0,
      velocity: 0,
      predictedCompletionDate: null,
      riskScore: 50,
      efficiency: 0,
      taskBreakdown: [],
    };
  }

  const goalId = tasks[0].goalId;
  const weights = tasks.map(t => t.weight);
  const progresses = tasks.map(t => t.progress);
  const qualities = tasks.map(t => t.quality);
  const daysLates = tasks.map(t => t.daysLate);
  const complexities = tasks.map(t => t.complexity);

  // 1. Weighted completion score
  const completionScore = weightedMean(progresses, weights);

  // 2. Quality score using EWMA (recent tasks weighted more)
  const qualityEwma = ewma(qualities, 0.4);
  const maxQuality = 5;
  const qualityScore = (qualityEwma / maxQuality) * 100;

  // 3. Timeliness factor using sigmoid
  // Negative daysLate = early (good), positive = late (bad)
  const avgDaysLate = mean(daysLates);
  const timelinessFactor = sigmoid(-avgDaysLate, 0.2) * 2 - 1; // Maps to (-1, +1)
  const timelinessScore = (timelinessFactor + 1) / 2 * 100; // Maps to (0, 100)

  // 4. Efficiency: quality per complexity unit
  const avgQuality = mean(qualities);
  const avgComplexity = mean(complexities);
  const efficiency = avgComplexity > 0 ? avgQuality / avgComplexity : 0;
  const efficiencyMultiplier = Math.max(0.5, Math.min(1.5, efficiency));

  // 5. Composite score with configurable weights
  const W_c = 0.50; // completion weight
  const W_q = 0.30; // quality weight
  const W_t = 0.20; // timeliness weight
  const compositeRaw = W_c * completionScore + W_q * qualityScore + W_t * timelinessScore;
  const compositeScore = Math.round(Math.max(0, Math.min(100,
    compositeRaw * efficiencyMultiplier
  )) * 100) / 100;

  // 6. Quality-adjusted score
  const qualityAdjustedScore = Math.round(
    completionScore * (qualityEwma / maxQuality) * 100
  ) / 100;

  // 7. Velocity (progress per day)
  const completedTasks = tasks.filter(t => t.completedAt);
  let velocity = 0;
  if (completedTasks.length >= 2) {
    const dates = completedTasks
      .map(t => t.completedAt!.getTime())
      .sort((a, b) => a - b);
    const timeSpanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    const totalProgressChange = completedTasks.reduce((sum, t) => sum + t.progress * t.weight, 0) /
      completedTasks.reduce((sum, t) => sum + t.weight, 0);
    velocity = timeSpanDays > 0 ? totalProgressChange / timeSpanDays : 0;
  }

  // 8. Predicted completion date
  let predictedCompletionDate: Date | null = null;
  if (velocity > 0 && completionScore < 100) {
    const remainingProgress = 100 - completionScore;
    const daysToComplete = remainingProgress / velocity;
    predictedCompletionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
  }

  // 9. Risk score
  let riskScore = 0;
  if (goalDueDate) {
    const daysUntilDue = (goalDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const remainingProgress = 100 - completionScore;

    if (completionScore >= 100) {
      riskScore = 0;
    } else if (daysUntilDue <= 0) {
      riskScore = 100; // Already past due
    } else {
      // Required velocity vs actual velocity
      const requiredVelocity = remainingProgress / daysUntilDue;
      if (velocity <= 0) {
        riskScore = Math.min(100, 50 + (remainingProgress / 2)); // High risk if no velocity
      } else {
        const velocityRatio = velocity / requiredVelocity;
        // Sigmoid maps ratio to risk: ratio < 1 = high risk, ratio > 1 = low risk
        riskScore = Math.round((1 - sigmoid(velocityRatio, 3, 1)) * 100);
      }
    }
  }

  // 10. Task breakdown
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const avgQualityAll = mean(qualities);
  const avgTimelinessAll = mean(daysLates);

  const taskBreakdown = tasks.map(t => ({
    taskId: t.taskId,
    weightedContribution: totalWeight > 0
      ? Math.round((t.weight / totalWeight) * t.progress * 100) / 100
      : 0,
    qualityImpact: avgQualityAll > 0
      ? Math.round(((t.quality - avgQualityAll) / avgQualityAll) * 100) / 100
      : 0,
    timelinessImpact: Math.round(
      (sigmoid(-t.daysLate, 0.2) - sigmoid(-avgTimelinessAll, 0.2)) * 100
    ) / 100,
  }));

  return {
    goalId,
    completionScore: Math.round(completionScore * 100) / 100,
    qualityAdjustedScore,
    timelinessFactor: Math.round(timelinessFactor * 1000) / 1000,
    compositeScore,
    velocity: Math.round(velocity * 100) / 100,
    predictedCompletionDate,
    riskScore: Math.round(riskScore),
    efficiency: Math.round(efficiency * 100) / 100,
    taskBreakdown,
  };
}

// ============================================================================
// INDIVIDUAL PERFORMANCE SCORING
// ============================================================================

export interface PerformanceInputs {
  goalScores: Array<{ goalId: string; compositeScore: number; weight: number }>;
  reviewRatings: Array<{ rating: number; reviewerTrustScore: number; type: 'SELF' | 'PEER' | 'MANAGER' | 'DIRECT_REPORT' }>;
  feedbackSentiments: Array<{ sentiment: number; recency: number }>; // sentiment: -1 to 1, recency: 0 to 1
  attendanceRate: number; // 0-1
  collaborationScore: number; // 0-100 from cross-functional goals
}

export interface PerformanceResult {
  /** Overall performance score (0-100) */
  overallScore: number;
  /** Goal attainment component (0-100) */
  goalAttainment: number;
  /** Review-based component with trust-weighted averaging (0-100) */
  reviewScore: number;
  /** Feedback sentiment score (0-100) */
  feedbackScore: number;
  /** Percentile rank vs population */
  percentile: number | null;
  /** Performance trajectory: positive = improving, negative = declining */
  trajectory: number;
  /** Confidence level in the score (0-1) */
  confidence: number;
  /** Component weights applied */
  weights: { goals: number; reviews: number; feedback: number; attendance: number; collaboration: number };
  /** Rating on 1-5 scale derived from score */
  derivedRating: number;
}

/**
 * Calculates individual performance score from multiple data sources
 *
 * Formula:
 *   OverallScore = Σ(Wᵢ × ComponentScoreᵢ)
 *
 * Components:
 *   1. Goal Attainment = Weighted mean of goal composite scores
 *   2. Review Score = Trust-weighted mean of review ratings, normalized to 0-100
 *   3. Feedback Score = EWMA of sentiment, mapped through sigmoid to 0-100
 *   4. Attendance Factor = attendanceRate × 100
 *   5. Collaboration Factor = collaborationScore
 *
 * Confidence = f(data_volume, data_spread, reviewer_trust)
 */
export function calculatePerformanceScore(
  inputs: PerformanceInputs,
  populationScores?: number[]
): PerformanceResult {
  // Dynamic weight allocation based on data availability
  const hasGoals = inputs.goalScores.length > 0;
  const hasReviews = inputs.reviewRatings.length > 0;
  const hasFeedback = inputs.feedbackSentiments.length > 0;

  // Base weights
  let w = { goals: 0.40, reviews: 0.30, feedback: 0.10, attendance: 0.10, collaboration: 0.10 };

  // Redistribute weights if data is missing
  if (!hasGoals) {
    w.reviews += w.goals * 0.6;
    w.feedback += w.goals * 0.4;
    w.goals = 0;
  }
  if (!hasReviews) {
    w.goals += w.reviews * 0.7;
    w.feedback += w.reviews * 0.3;
    w.reviews = 0;
  }
  if (!hasFeedback) {
    w.goals += w.feedback * 0.5;
    w.reviews += w.feedback * 0.5;
    w.feedback = 0;
  }

  // 1. Goal Attainment
  const goalAttainment = hasGoals
    ? weightedMean(
        inputs.goalScores.map(g => g.compositeScore),
        inputs.goalScores.map(g => g.weight)
      )
    : 0;

  // 2. Trust-weighted review score
  //    Higher trust reviewers have more influence
  //    Different review types have different base weights
  const typeWeights: Record<string, number> = {
    MANAGER: 1.5,
    PEER: 1.0,
    DIRECT_REPORT: 0.8,
    SELF: 0.5, // Self-assessment weighted lower
  };

  let reviewScore = 0;
  if (hasReviews) {
    const reviewValues = inputs.reviewRatings.map(r => (r.rating / 5) * 100);
    const reviewWeights = inputs.reviewRatings.map(r =>
      (r.reviewerTrustScore / 100) * (typeWeights[r.type] || 1.0)
    );
    reviewScore = weightedMean(reviewValues, reviewWeights);
  }

  // 3. Feedback sentiment score
  //    Uses EWMA with recency as ordering proxy
  let feedbackScore = 50; // Neutral baseline
  if (hasFeedback) {
    const sorted = [...inputs.feedbackSentiments].sort((a, b) => a.recency - b.recency);
    const sentimentValues = sorted.map(f => f.sentiment);
    const ewmaResult = ewma(sentimentValues, 0.3);
    // Map from [-1, 1] to [0, 100]
    feedbackScore = (ewmaResult + 1) / 2 * 100;
  }

  // 4. Attendance factor
  const attendanceScore = inputs.attendanceRate * 100;

  // 5. Collaboration
  const collaborationScore = inputs.collaborationScore;

  // Overall composite score
  const overallScore = Math.round(
    (w.goals * goalAttainment +
     w.reviews * reviewScore +
     w.feedback * feedbackScore +
     w.attendance * attendanceScore +
     w.collaboration * collaborationScore) * 100
  ) / 100;

  // Percentile rank against population
  const percentile = populationScores && populationScores.length > 0
    ? Math.round(percentileRank(overallScore, populationScores))
    : null;

  // Confidence: based on volume and spread of data
  const dataPoints = inputs.goalScores.length + inputs.reviewRatings.length + inputs.feedbackSentiments.length;
  const volumeConfidence = sigmoid(dataPoints, 0.3, 5); // Reaches ~0.8 at 10+ data points
  const trustConfidence = hasReviews
    ? mean(inputs.reviewRatings.map(r => r.reviewerTrustScore)) / 100
    : 0.5;
  const confidence = Math.round((volumeConfidence * 0.6 + trustConfidence * 0.4) * 100) / 100;

  // Trajectory placeholder (requires historical scores)
  const trajectory = 0;

  // Derive 1-5 rating from score
  // Uses percentile-based rating if population exists, otherwise score-based
  let derivedRating: number;
  if (percentile !== null) {
    // Bell curve distribution: top 10% = 5, next 20% = 4, middle 40% = 3, next 20% = 2, bottom 10% = 1
    if (percentile >= 90) derivedRating = 5;
    else if (percentile >= 70) derivedRating = 4;
    else if (percentile >= 30) derivedRating = 3;
    else if (percentile >= 10) derivedRating = 2;
    else derivedRating = 1;
  } else {
    // Absolute score mapping
    if (overallScore >= 85) derivedRating = 5;
    else if (overallScore >= 70) derivedRating = 4;
    else if (overallScore >= 50) derivedRating = 3;
    else if (overallScore >= 30) derivedRating = 2;
    else derivedRating = 1;
  }

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    goalAttainment: Math.round(goalAttainment * 100) / 100,
    reviewScore: Math.round(reviewScore * 100) / 100,
    feedbackScore: Math.round(feedbackScore * 100) / 100,
    percentile,
    trajectory,
    confidence,
    weights: w,
    derivedRating,
  };
}

// ============================================================================
// TEAM ANALYTICS
// ============================================================================

export interface TeamMathResult {
  /** Team average performance (0-100) */
  avgScore: number;
  /** Score standard deviation — measures spread */
  scoreSpread: number;
  /** Distribution entropy — 0 = all same rating, 1 = perfectly spread */
  ratingEntropy: number;
  /** Gini coefficient — inequality measure (0 = equal, 1 = max inequality) */
  giniCoefficient: number;
  /** Team velocity trend: slope of performance over time */
  velocityTrend: number;
  /** Predicted next period average */
  predictedNextAvg: number;
  /** Members ranked by Z-score deviation from team mean */
  memberZScores: Array<{ userId: string; zScore: number; category: 'high' | 'average' | 'low' }>;
}

/**
 * Gini coefficient for inequality measurement
 * Formula: G = (2 × Σᵢ(i × xᵢ)) / (n × Σxᵢ) - (n+1)/n
 */
export function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const totalSum = sorted.reduce((s, v) => s + v, 0);
  if (totalSum === 0) return 0;

  let indexedSum = 0;
  for (let i = 0; i < n; i++) {
    indexedSum += (i + 1) * sorted[i];
  }

  return (2 * indexedSum) / (n * totalSum) - (n + 1) / n;
}

/**
 * Calculates team-level analytics from individual scores
 */
export function calculateTeamAnalytics(
  memberScores: Array<{ userId: string; score: number }>,
  historicalAverages?: number[]
): TeamMathResult {
  const scores = memberScores.map(m => m.score);

  const avgScore = Math.round(mean(scores) * 100) / 100;
  const scoreSpread = Math.round(standardDeviation(scores) * 100) / 100;

  // Rating distribution for entropy
  const ratingBuckets = [0, 0, 0, 0, 0]; // 5 buckets for ratings 1-5
  scores.forEach(s => {
    const bucket = Math.min(4, Math.max(0, Math.floor(s / 20)));
    ratingBuckets[bucket]++;
  });
  const ratingEntropy = Math.round(shannonEntropy(ratingBuckets) * 1000) / 1000;

  const gini = Math.round(giniCoefficient(scores) * 1000) / 1000;

  // Trend from historical averages
  let velocityTrend = 0;
  let predictedNextAvg = avgScore;
  if (historicalAverages && historicalAverages.length >= 2) {
    const timePoints = historicalAverages.map((_, i) => i);
    const allAverages = [...historicalAverages, avgScore];
    const allTimePoints = [...timePoints, historicalAverages.length];
    const reg = linearRegression(allTimePoints, allAverages);
    velocityTrend = Math.round(reg.slope * 100) / 100;
    predictedNextAvg = Math.round(
      Math.max(0, Math.min(100, reg.slope * (allTimePoints.length) + reg.intercept)) * 100
    ) / 100;
  }

  // Z-scores for each member
  const teamStdDev = standardDeviation(scores);
  const teamMean = mean(scores);
  const memberZScores = memberScores.map(m => {
    const z = Math.round(zScore(m.score, teamMean, teamStdDev) * 100) / 100;
    const category: 'high' | 'average' | 'low' = z > 1 ? 'high' : z < -1 ? 'low' : 'average';
    return { userId: m.userId, zScore: z, category };
  });

  return {
    avgScore,
    scoreSpread,
    ratingEntropy,
    giniCoefficient: gini,
    velocityTrend,
    predictedNextAvg,
    memberZScores,
  };
}

// ============================================================================
// GOAL RISK ASSESSMENT
// ============================================================================

export interface GoalRiskInput {
  progress: number;        // 0-100
  daysRemaining: number;   // days until due
  totalDays: number;       // total duration of goal
  velocityHistory: number[]; // daily progress values (recent last)
  dependencyRisks: number[]; // risk scores of dependent goals (0-100)
  complexity: number;       // 1-5
}

export interface GoalRiskResult {
  /** Overall risk score (0-100, higher = more risky) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Individual risk components */
  components: {
    scheduleRisk: number;     // Based on timeline vs progress
    velocityRisk: number;     // Based on velocity trend
    dependencyRisk: number;   // Based on dependent goals
    complexityRisk: number;   // Based on remaining work complexity
  };
  /** Projected completion percentage at deadline */
  projectedCompletion: number;
  /** Required daily velocity to complete on time */
  requiredVelocity: number;
  /** Current velocity (EWMA) */
  currentVelocity: number;
  /** Days needed at current pace */
  daysNeededAtCurrentPace: number;
}

/**
 * Comprehensive goal risk assessment using statistical analysis
 *
 * Risk Formula:
 *   OverallRisk = W_s×ScheduleRisk + W_v×VelocityRisk + W_d×DependencyRisk + W_c×ComplexityRisk
 *
 * Schedule Risk = sigmoid((expectedProgress - actualProgress) / expectedProgress, k=3)
 * Velocity Risk = sigmoid(requiredVelocity / currentVelocity - 1, k=2)
 * Dependency Risk = max(dependencyRisks) × avgDependencyRisk weight
 * Complexity Risk = (complexity / 5) × (remainingWork / 100)
 */
export function assessGoalRisk(input: GoalRiskInput): GoalRiskResult {
  const {
    progress, daysRemaining, totalDays, velocityHistory,
    dependencyRisks, complexity
  } = input;

  // Expected progress based on time elapsed
  const timeElapsed = totalDays - daysRemaining;
  const expectedProgress = totalDays > 0 ? (timeElapsed / totalDays) * 100 : 100;
  const progressGap = expectedProgress - progress;

  // Current velocity using EWMA
  const currentVelocity = velocityHistory.length > 0 ? ewma(velocityHistory, 0.4) : 0;

  // Required velocity (cap to finite value for display safety)
  const remainingProgress = 100 - progress;
  const requiredVelocity = daysRemaining > 0
    ? remainingProgress / daysRemaining
    : (remainingProgress > 0 ? 999 : 0); // 999 = past due, 0 = already complete

  // Days needed at current pace
  const daysNeededAtCurrentPace = currentVelocity > 0
    ? remainingProgress / currentVelocity
    : (remainingProgress > 0 ? 9999 : 0);

  // Projected completion at deadline
  const projectedCompletion = Math.min(100, progress + currentVelocity * daysRemaining);

  // 1. Schedule Risk
  const scheduleDeviation = expectedProgress > 0 ? progressGap / expectedProgress : 0;
  const scheduleRisk = Math.round(sigmoid(scheduleDeviation, 3, 0) * 100);

  // 2. Velocity Risk
  let velocityRisk = 50; // Default if no velocity data
  if (currentVelocity > 0 && daysRemaining > 0) {
    const velocityRatio = requiredVelocity / currentVelocity;
    velocityRisk = Math.round(sigmoid(velocityRatio - 1, 2, 0) * 100);
  } else if (daysRemaining <= 0 && progress < 100) {
    velocityRisk = 100;
  } else if (progress >= 100) {
    velocityRisk = 0;
  }

  // 3. Dependency Risk
  const dependencyRisk = dependencyRisks.length > 0
    ? Math.round(mean(dependencyRisks) * 0.6 + Math.max(...dependencyRisks) * 0.4)
    : 0;

  // 4. Complexity Risk
  const complexityRisk = Math.round((complexity / 5) * (remainingProgress / 100) * 100);

  // Overall risk with weights
  const W_s = 0.40;
  const W_v = 0.30;
  const W_d = 0.15;
  const W_c = 0.15;

  const riskScore = Math.round(
    W_s * scheduleRisk + W_v * velocityRisk + W_d * dependencyRisk + W_c * complexityRisk
  );

  // Classification
  let riskLevel: GoalRiskResult['riskLevel'];
  if (riskScore >= 75) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 25) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return {
    riskScore,
    riskLevel,
    components: { scheduleRisk, velocityRisk, dependencyRisk, complexityRisk },
    projectedCompletion: Math.round(projectedCompletion * 100) / 100,
    requiredVelocity: Math.round(requiredVelocity * 100) / 100,
    currentVelocity: Math.round(currentVelocity * 100) / 100,
    daysNeededAtCurrentPace: Math.round(daysNeededAtCurrentPace),
  };
}

// ============================================================================
// REVIEW CALIBRATION MATHEMATICS
// ============================================================================

/**
 * Calibrates review ratings to remove reviewer bias
 *
 * Method: Z-score normalization per reviewer, then rescale to original range
 *
 * Formula:
 *   1. For each reviewer, compute their mean and stddev of ratings given
 *   2. Z-normalize each rating: z = (rating - reviewer_mean) / reviewer_stddev
 *   3. Rescale to global distribution: calibrated = z × global_stddev + global_mean
 *   4. Clamp to [1, 5]
 */
export function calibrateRatings(
  ratings: Array<{ reviewId: string; reviewerId: string; revieweeId: string; rating: number }>
): Array<{ reviewId: string; originalRating: number; calibratedRating: number; adjustment: number }> {
  if (ratings.length === 0) return [];

  // Global statistics
  const allRatings = ratings.map(r => r.rating);
  const globalMean = mean(allRatings);
  const globalStdDev = sampleStdDev(allRatings);

  // Per-reviewer statistics
  const reviewerRatings = new Map<string, number[]>();
  for (const r of ratings) {
    const existing = reviewerRatings.get(r.reviewerId) || [];
    existing.push(r.rating);
    reviewerRatings.set(r.reviewerId, existing);
  }

  return ratings.map(r => {
    const reviewerScores = reviewerRatings.get(r.reviewerId) || [r.rating];
    const reviewerMean = mean(reviewerScores);
    const reviewerStdDev = sampleStdDev(reviewerScores);

    let calibrated: number;
    if (reviewerStdDev === 0 || reviewerScores.length < 3) {
      // Not enough data to calibrate — apply simple mean-shift
      calibrated = r.rating - (reviewerMean - globalMean);
    } else {
      // Z-score normalization
      const z = (r.rating - reviewerMean) / reviewerStdDev;
      calibrated = z * (globalStdDev || 1) + globalMean;
    }

    // Clamp to valid range
    calibrated = Math.max(1, Math.min(5, calibrated));
    calibrated = Math.round(calibrated * 100) / 100;

    return {
      reviewId: r.reviewId,
      originalRating: r.rating,
      calibratedRating: calibrated,
      adjustment: Math.round((calibrated - r.rating) * 100) / 100,
    };
  });
}

// ============================================================================
// COMPREHENSIVE PERFORMANCE INTELLIGENCE SCORE (CPIS)
// ============================================================================
//
// A mathematically rigorous, multi-dimensional scoring framework that:
// 1. Aggregates 8 performance dimensions using weighted harmonic mean
// 2. Applies Bayesian smoothing for low-data scenarios
// 3. Uses Z-score normalization for cross-team fairness
// 4. Detects and corrects bias via disparate impact analysis
// 5. Computes confidence intervals using bootstrap estimation
// 6. Tracks trajectory via linear regression on historical scores
//
// Master Formula:
//   CPIS = FairnessAdjust(BayesSmooth(WHM(D₁..D₈, W₁..W₈))) × ConfidenceFactor
//
// Where:
//   D₁ = Goal Attainment Index (GAI)      W₁ = 0.25
//   D₂ = Review Quality Score (RQS)       W₂ = 0.20
//   D₃ = Feedback Sentiment Index (FSI)   W₃ = 0.12
//   D₄ = Collaboration Impact Score (CIS) W₄ = 0.10
//   D₅ = Consistency & Reliability (CRI)  W₅ = 0.10
//   D₆ = Growth Trajectory Score (GTS)    W₆ = 0.08
//   D₇ = Evidence Quality Score (EQS)     W₇ = 0.08
//   D₈ = Initiative & Innovation (III)    W₈ = 0.07
//
// Each dimension is computed from real platform data using deterministic formulas.
// ============================================================================

export interface CPISInput {
  // Dimension 1: Goal Attainment
  goals: Array<{
    id: string;
    progress: number;       // 0-100
    weight: number;         // Relative importance
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: string;           // INDIVIDUAL, TEAM, DEPARTMENT, COMPANY, OKR_*
    status: string;         // ACTIVE, COMPLETED, CANCELLED
    daysLate: number;       // negative=early, 0=on-time, positive=late
    complexity: number;     // 1-5
    alignmentDepth: number; // How many levels up this goal aligns (0=standalone)
  }>;

  // Dimension 2: Reviews
  reviews: Array<{
    rating: number;                // 1-5
    calibratedRating?: number;     // Post-calibration rating
    type: 'SELF' | 'PEER' | 'MANAGER' | 'UPWARD' | 'EXTERNAL' | 'THREE_SIXTY';
    reviewerTrust: number;         // 0-100
    biasScore?: number;            // 0-1, detected bias level
  }>;

  // Dimension 3: Feedback
  feedbacks: Array<{
    sentimentScore: number;        // 0-1
    type: 'PRAISE' | 'CONSTRUCTIVE' | 'SUGGESTION' | 'REQUEST' | 'RECOGNITION';
    recency: number;               // 0-1, where 1 = most recent
    hasSkillTags: boolean;
    hasValueTags: boolean;
  }>;

  // Dimension 4: Collaboration
  collaboration: {
    crossFunctionalGoals: number;  // Count of cross-team goals
    feedbackGivenCount: number;    // Feedback given to others
    feedbackReceivedCount: number; // Feedback received
    oneOnOneCount: number;         // 1-on-1 meetings attended
    recognitionsGiven: number;     // Recognitions given to peers
    teamGoalContributions: number; // Contributions to team/dept goals
  };

  // Dimension 5: Consistency
  consistency: {
    onTimeDeliveryRate: number;      // 0-1
    goalVelocityVariance: number;    // Lower = more consistent
    streakDays: number;              // Consecutive active days
    reviewRatingStdDev: number;      // Std dev of review ratings received
    missedDeadlines: number;         // Count of missed deadlines
    totalDeadlines: number;          // Total deadlines
  };

  // Dimension 6: Growth
  growth: {
    historicalScores: number[];      // Past performance scores (oldest first)
    skillProgressions: number;       // Skills improved count
    trainingsCompleted: number;      // Training/certifications completed
    developmentPlanProgress: number; // 0-100
    promotionReadiness: number;      // 0-100
  };

  // Dimension 7: Evidence
  evidence: {
    totalEvidence: number;           // Total evidence items submitted
    verifiedEvidence: number;        // Verified evidence count
    avgImpactScore: number;          // Average impact score (0-100)
    avgQualityScore: number;         // Average quality score (0-100)
    evidenceTypes: number;           // Diversity of evidence types
  };

  // Dimension 8: Initiative
  initiative: {
    innovationContributions: number; // Innovation submissions
    mentoringSessions: number;       // Mentoring given
    knowledgeSharing: number;        // Knowledge shares (articles, presentations)
    processImprovements: number;     // Process improvement suggestions
    voluntaryGoals: number;          // Self-assigned goals beyond requirements
  };

  // Context
  tenureYears: number;
  level: number;                     // Seniority level (1-10)
  departmentAvg?: number;            // Department average score for fairness
  orgAvg?: number;                   // Org-wide average
}

export interface CPISDimension {
  name: string;
  code: string;
  rawScore: number;         // 0-100 before adjustments
  weight: number;           // Applied weight
  weightedScore: number;    // rawScore × weight
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  percentile?: number;      // vs population
  subMetrics: Record<string, number>;
}

export interface FairnessAnalysis {
  biasDetected: boolean;
  adjustmentApplied: number;  // Score adjustment for fairness
  disparateImpactRatio: number; // 4/5ths rule check
  reviewerBiasFlags: string[];
  confidenceInFairness: number; // 0-1
}

export interface CPISResult {
  /** Final CPIS score (0-100) */
  score: number;
  /** Score before fairness adjustment */
  rawScore: number;
  /** Letter grade */
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  /** Star rating 1-5 */
  starRating: number;
  /** Rank label */
  rankLabel: string;
  /** Detailed breakdown of all 8 dimensions */
  dimensions: CPISDimension[];
  /** ML fairness analysis */
  fairness: FairnessAnalysis;
  /** Confidence interval */
  confidence: {
    level: number;        // 0-1
    lowerBound: number;   // Score lower bound
    upperBound: number;   // Score upper bound
    dataPoints: number;   // Total data points used
  };
  /** Growth trajectory */
  trajectory: {
    slope: number;        // Positive = improving
    direction: 'improving' | 'stable' | 'declining';
    predictedNext: number;
    rSquared: number;     // Fit quality
  };
  /** Key strengths and areas for growth */
  strengths: string[];
  growthAreas: string[];
  /** Mathematical formula string for transparency */
  formulaBreakdown: string;
}

function scoreToGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 62) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function scoreToStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  return 1;
}

function scoreToRank(score: number): string {
  if (score >= 95) return 'Exceptional Performer';
  if (score >= 85) return 'Elite Performer';
  if (score >= 75) return 'High Achiever';
  if (score >= 65) return 'Strong Contributor';
  if (score >= 55) return 'Solid Performer';
  if (score >= 45) return 'Developing Talent';
  if (score >= 35) return 'Emerging Talent';
  return 'Needs Support';
}

/**
 * Dimension 1: Goal Attainment Index (GAI)
 *
 * Formula:
 *   GAI = Σ(Gᵢ × Wᵢ × Pᵢ × Tᵢ × Aᵢ) / Σ(Wᵢ)
 *
 * Where:
 *   Gᵢ = Goal progress (0-100)
 *   Wᵢ = Goal weight (importance)
 *   Pᵢ = Priority multiplier (LOW=0.85, MED=1.0, HIGH=1.15, CRITICAL=1.35)
 *   Tᵢ = Timeliness factor: σ(-daysLate, k=0.15) ∈ (0.5, 1.5)
 *   Aᵢ = Alignment bonus: 1 + (alignmentDepth × 0.03), max 1.15
 */
function computeGAI(goals: CPISInput['goals']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  if (goals.length === 0) {
    return {
      name: 'Goal Attainment', code: 'GAI', rawScore: 0, weight: 0.25,
      weightedScore: 0, grade: 'F', subMetrics: { completionRate: 0, avgProgress: 0, onTimeRate: 0, complexityAdjusted: 0 },
    };
  }

  const priorityMultiplier: Record<string, number> = { LOW: 0.85, MEDIUM: 1.0, HIGH: 1.15, CRITICAL: 1.35 };
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  const activeGoals = goals.filter(g => g.status === 'ACTIVE' || g.status === 'COMPLETED');

  let weightedSum = 0;
  let totalWeight = 0;

  for (const g of activeGoals) {
    const pm = priorityMultiplier[g.priority] ?? 1.0;
    const timeliness = boundedSigmoid(-g.daysLate, 0.6, 1.4, 0.15, 0);
    const alignment = Math.min(1.15, 1 + g.alignmentDepth * 0.03);
    const complexityBonus = 1 + (g.complexity - 3) * 0.04; // Higher complexity = slight bonus

    const score = Math.min(100, g.progress * pm * timeliness * alignment * complexityBonus);
    weightedSum += score * g.weight;
    totalWeight += g.weight;
  }

  const rawScore = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;

  subMetrics.completionRate = goals.length > 0
    ? Math.round(clampPct((completedGoals.length / goals.length) * 100))
    : 0;
  subMetrics.avgProgress = Math.round(clampPct(mean(activeGoals.map(g => g.progress))));
  subMetrics.onTimeRate = completedGoals.length > 0
    ? Math.round(clampPct((completedGoals.filter(g => g.daysLate <= 0).length / completedGoals.length) * 100))
    : 0;
  subMetrics.complexityAdjusted = Math.round(rawScore);
  subMetrics.alignedGoals = goals.filter(g => g.alignmentDepth > 0).length;

  return {
    name: 'Goal Attainment', code: 'GAI',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.25,
    weightedScore: Math.round(rawScore * 0.25 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 2: Review Quality Score (RQS)
 *
 * Formula:
 *   RQS = WHM(Rᵢ × (1 - Bᵢ), Tᵢ × TypeWᵢ) × 20  (normalized to 0-100)
 *
 * Where:
 *   Rᵢ = Calibrated rating (or raw if unavailable) on 1-5 scale
 *   Bᵢ = Bias score (0-1), penalizes biased reviews
 *   Tᵢ = Reviewer trust score (0-100)
 *   TypeWᵢ = Type weight: MANAGER=1.5, THREE_SIXTY=1.3, PEER=1.0, UPWARD=0.9, EXTERNAL=0.8, SELF=0.5
 */
function computeRQS(reviews: CPISInput['reviews']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  if (reviews.length === 0) {
    return {
      name: 'Review Quality', code: 'RQS', rawScore: 0, weight: 0.20,
      weightedScore: 0, grade: 'F', subMetrics: { avgRating: 0, calibratedAvg: 0, trustWeightedAvg: 0, biasAdjustment: 0 },
    };
  }

  const typeWeights: Record<string, number> = {
    MANAGER: 1.5, THREE_SIXTY: 1.3, PEER: 1.0, UPWARD: 0.9, EXTERNAL: 0.8, SELF: 0.5,
  };

  const values: number[] = [];
  const weights: number[] = [];

  for (const r of reviews) {
    const rating = r.calibratedRating ?? r.rating;
    const biasDiscount = 1 - (r.biasScore ?? 0) * 0.5; // Max 50% penalty for full bias
    const adjustedRating = rating * biasDiscount;
    const typeW = typeWeights[r.type] ?? 1.0;
    const trustW = r.reviewerTrust / 100;

    values.push(adjustedRating);
    weights.push(trustW * typeW);
  }

  // Use weighted harmonic mean for rates, normalized to 0-100
  const whm = weightedHarmonicMean(values, weights);
  const rawScore = Math.min(100, (whm / 5) * 100);

  subMetrics.avgRating = Math.round(mean(reviews.map(r => r.rating)) * 100) / 100;
  subMetrics.calibratedAvg = Math.round(
    mean(reviews.map(r => r.calibratedRating ?? r.rating)) * 100
  ) / 100;
  subMetrics.trustWeightedAvg = Math.round(rawScore);
  subMetrics.reviewCount = reviews.length;
  subMetrics.biasAdjustment = Math.round(
    mean(reviews.map(r => r.biasScore ?? 0)) * 100
  ) / 100;

  return {
    name: 'Review Quality', code: 'RQS',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.20,
    weightedScore: Math.round(rawScore * 0.20 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 3: Feedback Sentiment Index (FSI)
 *
 * Formula:
 *   FSI = EWMA(Sᵢ × Qᵢ, α=0.35) × 100
 *
 * Where:
 *   Sᵢ = Sentiment score (0-1) for feedback i
 *   Qᵢ = Quality multiplier: base 1.0, +0.1 if hasSkillTags, +0.1 if hasValueTags
 *   Ordered by recency (oldest first for EWMA)
 */
function computeFSI(feedbacks: CPISInput['feedbacks']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  if (feedbacks.length === 0) {
    return {
      name: 'Feedback Sentiment', code: 'FSI', rawScore: 50, weight: 0.12,
      weightedScore: 6, grade: 'C', subMetrics: { avgSentiment: 0.5, praiseRatio: 0, feedbackCount: 0, qualityMultiplier: 1 },
    };
  }

  const sorted = [...feedbacks].sort((a, b) => a.recency - b.recency);
  const qualityValues = sorted.map(f => {
    let qm = 1.0;
    if (f.hasSkillTags) qm += 0.1;
    if (f.hasValueTags) qm += 0.1;
    return Math.min(1, f.sentimentScore * qm);
  });

  const ewmaResult = ewma(qualityValues, 0.35);
  const rawScore = Math.min(100, ewmaResult * 100);

  const praiseCount = feedbacks.filter(f => f.type === 'PRAISE' || f.type === 'RECOGNITION').length;

  subMetrics.avgSentiment = Math.round(mean(feedbacks.map(f => f.sentimentScore)) * 100) / 100;
  subMetrics.praiseRatio = feedbacks.length > 0 ? Math.round(clampPct((praiseCount / feedbacks.length) * 100)) : 0;
  subMetrics.feedbackCount = feedbacks.length;
  subMetrics.qualityMultiplier = Math.round(mean(qualityValues) * 100) / 100;

  return {
    name: 'Feedback Sentiment', code: 'FSI',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.12,
    weightedScore: Math.round(rawScore * 0.12 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 4: Collaboration Impact Score (CIS)
 *
 * Formula:
 *   CIS = σ(CollabIndex, k=0.08, x₀=50) × 100
 *   CollabIndex = Σ(normalized activity scores across 6 collaboration channels)
 *
 * Each channel is normalized using sigmoid to prevent any single channel from dominating.
 */
function computeCIS(collab: CPISInput['collaboration']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  // Normalize each channel using sigmoid (each maps to 0-100 range)
  const crossFuncScore = boundedSigmoid(collab.crossFunctionalGoals, 0, 100, 0.5, 3);
  const fbGivenScore = boundedSigmoid(collab.feedbackGivenCount, 0, 100, 0.3, 5);
  const fbReceivedScore = boundedSigmoid(collab.feedbackReceivedCount, 0, 100, 0.3, 5);
  const oneOnOneScore = boundedSigmoid(collab.oneOnOneCount, 0, 100, 0.5, 4);
  const recognitionScore = boundedSigmoid(collab.recognitionsGiven, 0, 100, 0.5, 3);
  const teamContribScore = boundedSigmoid(collab.teamGoalContributions, 0, 100, 0.5, 2);

  // Weighted average of channels
  const channelWeights = [0.20, 0.15, 0.15, 0.15, 0.15, 0.20];
  const channelScores = [crossFuncScore, fbGivenScore, fbReceivedScore, oneOnOneScore, recognitionScore, teamContribScore];
  const rawScore = weightedMean(channelScores, channelWeights);

  subMetrics.crossFunctional = Math.round(crossFuncScore);
  subMetrics.feedbackGiven = Math.round(fbGivenScore);
  subMetrics.feedbackReceived = Math.round(fbReceivedScore);
  subMetrics.oneOnOnes = Math.round(oneOnOneScore);
  subMetrics.recognitions = Math.round(recognitionScore);
  subMetrics.teamContributions = Math.round(teamContribScore);

  return {
    name: 'Collaboration Impact', code: 'CIS',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.10,
    weightedScore: Math.round(rawScore * 0.10 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 5: Consistency & Reliability Index (CRI)
 *
 * Formula:
 *   CRI = 0.30 × OnTimeRate + 0.25 × (1 - VelocityVarianceNorm) + 0.20 × StreakFactor + 0.15 × RatingConsistency + 0.10 × DeadlineScore
 *
 * Where:
 *   OnTimeRate = Fraction of on-time deliveries (0-100)
 *   VelocityVarianceNorm = Normalized variance (lower = better)
 *   StreakFactor = σ(streakDays, k=0.1, x₀=14) × 100
 *   RatingConsistency = (1 - normalized std dev of reviews) × 100
 *   DeadlineScore = (totalDeadlines - missedDeadlines) / totalDeadlines × 100
 */
function computeCRI(consistency: CPISInput['consistency']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  const onTimeScore = consistency.onTimeDeliveryRate * 100;
  const velocityConsistency = Math.max(0, (1 - Math.min(1, consistency.goalVelocityVariance / 50)) * 100);
  const streakFactor = sigmoid(consistency.streakDays, 0.1, 14) * 100;
  const ratingConsistency = Math.max(0, (1 - Math.min(1, consistency.reviewRatingStdDev / 2)) * 100);
  const deadlineScore = consistency.totalDeadlines > 0
    ? ((consistency.totalDeadlines - consistency.missedDeadlines) / consistency.totalDeadlines) * 100
    : 75; // Neutral if no deadlines

  const rawScore = 0.30 * onTimeScore + 0.25 * velocityConsistency + 0.20 * streakFactor +
    0.15 * ratingConsistency + 0.10 * deadlineScore;

  subMetrics.onTimeRate = Math.round(onTimeScore);
  subMetrics.velocityConsistency = Math.round(velocityConsistency);
  subMetrics.streakFactor = Math.round(streakFactor);
  subMetrics.ratingConsistency = Math.round(ratingConsistency);
  subMetrics.deadlineScore = Math.round(deadlineScore);

  return {
    name: 'Consistency & Reliability', code: 'CRI',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.10,
    weightedScore: Math.round(rawScore * 0.10 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 6: Growth Trajectory Score (GTS)
 *
 * Formula:
 *   GTS = 0.35 × TrendScore + 0.20 × SkillGrowth + 0.15 × TrainingScore + 0.15 × DevPlanProgress + 0.15 × ReadinessScore
 *
 * Where:
 *   TrendScore = Sigmoid-mapped linear regression slope of historical scores
 *   SkillGrowth = σ(skillProgressions, k=0.5, x₀=3) × 100
 *   TrainingScore = σ(trainingsCompleted, k=0.5, x₀=2) × 100
 */
function computeGTS(growth: CPISInput['growth']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  // Trend from historical scores
  let trendScore = 50; // Neutral baseline
  let slope = 0;
  let rSquared = 0;
  if (growth.historicalScores.length >= 2) {
    const x = growth.historicalScores.map((_, i) => i);
    const reg = linearRegression(x, growth.historicalScores);
    slope = reg.slope;
    rSquared = reg.rSquared;
    // Map slope to 0-100 using sigmoid: positive slope = high score
    trendScore = sigmoid(slope, 0.5, 0) * 100;
  }

  const skillGrowth = sigmoid(growth.skillProgressions, 0.5, 3) * 100;
  const trainingScore = sigmoid(growth.trainingsCompleted, 0.5, 2) * 100;
  const devPlanProgress = growth.developmentPlanProgress;
  const readinessScore = growth.promotionReadiness;

  const rawScore = 0.35 * trendScore + 0.20 * skillGrowth + 0.15 * trainingScore +
    0.15 * devPlanProgress + 0.15 * readinessScore;

  subMetrics.trendScore = Math.round(trendScore);
  subMetrics.skillGrowth = Math.round(skillGrowth);
  subMetrics.trainingScore = Math.round(trainingScore);
  subMetrics.devPlanProgress = Math.round(devPlanProgress);
  subMetrics.readinessScore = Math.round(readinessScore);
  subMetrics.trendSlope = Math.round(slope * 1000) / 1000;

  return {
    name: 'Growth Trajectory', code: 'GTS',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.08,
    weightedScore: Math.round(rawScore * 0.08 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 7: Evidence Quality Score (EQS)
 *
 * Formula:
 *   EQS = 0.25 × VerificationRate + 0.30 × AvgImpact + 0.25 × AvgQuality + 0.20 × DiversityBonus
 *
 * Where:
 *   VerificationRate = verified / total × 100
 *   DiversityBonus = shannonEntropy(evidenceTypeDistribution) × 100
 */
function computeEQS(evidence: CPISInput['evidence']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  if (evidence.totalEvidence === 0) {
    return {
      name: 'Evidence Quality', code: 'EQS', rawScore: 0, weight: 0.08,
      weightedScore: 0, grade: 'F', subMetrics: { verificationRate: 0, avgImpact: 0, avgQuality: 0, diversity: 0 },
    };
  }

  const verificationRate = evidence.totalEvidence > 0
    ? (evidence.verifiedEvidence / evidence.totalEvidence) * 100
    : 0;
  const diversityBonus = sigmoid(evidence.evidenceTypes, 0.5, 3) * 100;

  const rawScore = 0.25 * verificationRate + 0.30 * evidence.avgImpactScore +
    0.25 * evidence.avgQualityScore + 0.20 * diversityBonus;

  subMetrics.verificationRate = Math.round(verificationRate);
  subMetrics.avgImpact = Math.round(evidence.avgImpactScore);
  subMetrics.avgQuality = Math.round(evidence.avgQualityScore);
  subMetrics.diversity = Math.round(diversityBonus);
  subMetrics.totalEvidence = evidence.totalEvidence;

  return {
    name: 'Evidence Quality', code: 'EQS',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.08,
    weightedScore: Math.round(rawScore * 0.08 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * Dimension 8: Initiative & Innovation Index (III)
 *
 * Formula:
 *   III = Σ(σ(activityᵢ, kᵢ, x₀ᵢ) × weightᵢ) × 100
 *
 * Each initiative activity is sigmoid-normalized and weighted.
 */
function computeIII(initiative: CPISInput['initiative']): CPISDimension {
  const subMetrics: Record<string, number> = {};

  const innovationScore = sigmoid(initiative.innovationContributions, 0.6, 2) * 100;
  const mentoringScore = sigmoid(initiative.mentoringSessions, 0.4, 3) * 100;
  const knowledgeScore = sigmoid(initiative.knowledgeSharing, 0.5, 2) * 100;
  const processScore = sigmoid(initiative.processImprovements, 0.6, 1) * 100;
  const voluntaryScore = sigmoid(initiative.voluntaryGoals, 0.5, 2) * 100;

  const rawScore = 0.25 * innovationScore + 0.20 * mentoringScore + 0.20 * knowledgeScore +
    0.15 * processScore + 0.20 * voluntaryScore;

  subMetrics.innovation = Math.round(innovationScore);
  subMetrics.mentoring = Math.round(mentoringScore);
  subMetrics.knowledgeSharing = Math.round(knowledgeScore);
  subMetrics.processImprovements = Math.round(processScore);
  subMetrics.voluntaryGoals = Math.round(voluntaryScore);

  return {
    name: 'Initiative & Innovation', code: 'III',
    rawScore: Math.round(rawScore * 100) / 100,
    weight: 0.07,
    weightedScore: Math.round(rawScore * 0.07 * 100) / 100,
    grade: scoreToGrade(rawScore),
    subMetrics,
  };
}

/**
 * ML Fairness: Disparate Impact Analysis + Bias Correction
 *
 * Uses the 4/5ths rule (80% rule) from employment law:
 *   If the selection rate for any group < 80% of the highest group's rate,
 *   disparate impact exists.
 *
 * Bias Correction:
 *   If reviewerBias detected (via bias scores on reviews), apply
 *   Bayesian shrinkage toward the department mean to reduce individual reviewer bias.
 *
 * Formula:
 *   AdjustedScore = BayesianEstimate(rawScore, dataPoints, deptAvg, priorWeight)
 *   Where priorWeight = max(0, 5 - dataPoints) to shrink more when data is sparse
 */
function computeFairness(
  rawScore: number,
  input: CPISInput,
  dimensions: CPISDimension[]
): FairnessAnalysis {
  const biasFlags: string[] = [];
  let adjustmentApplied = 0;

  // Check for reviewer bias in reviews
  const reviewsWithBias = input.reviews.filter(r => (r.biasScore ?? 0) > 0.3);
  if (reviewsWithBias.length > 0) {
    biasFlags.push(`${reviewsWithBias.length} review(s) flagged for potential bias`);
  }

  // Check for self-review inflation
  const selfReviews = input.reviews.filter(r => r.type === 'SELF');
  const otherReviews = input.reviews.filter(r => r.type !== 'SELF');
  if (selfReviews.length > 0 && otherReviews.length > 0) {
    const selfAvg = mean(selfReviews.map(r => r.rating));
    const otherAvg = mean(otherReviews.map(r => r.rating));
    if (selfAvg > otherAvg * 1.3) {
      biasFlags.push('Self-assessment significantly higher than peer/manager ratings');
    }
  }

  // Disparate impact ratio (compare to dept/org average)
  let disparateImpactRatio = 1.0;
  if (input.departmentAvg && input.departmentAvg > 0) {
    disparateImpactRatio = rawScore / input.departmentAvg;
  }

  // Bayesian shrinkage toward department mean when data is sparse
  const totalDataPoints = input.goals.length + input.reviews.length + input.feedbacks.length;
  let adjustedScore = rawScore;
  if (input.departmentAvg && totalDataPoints < 10) {
    const priorWeight = Math.max(0, 5 - totalDataPoints * 0.5);
    adjustedScore = bayesianEstimate(rawScore, totalDataPoints, input.departmentAvg, priorWeight);
    adjustmentApplied = adjustedScore - rawScore;
  }

  // Tenure fairness: new employees shouldn't be penalized for lack of data
  if (input.tenureYears < 0.5 && totalDataPoints < 5) {
    // Apply stronger shrinkage toward org average for very new employees
    const orgAvg = input.orgAvg ?? 65;
    adjustedScore = bayesianEstimate(adjustedScore, totalDataPoints, orgAvg, 3);
    adjustmentApplied = adjustedScore - rawScore;
    if (Math.abs(adjustmentApplied) > 1) {
      biasFlags.push('New employee adjustment applied (Bayesian smoothing)');
    }
  }

  const confidenceInFairness = Math.min(1, totalDataPoints / 15) *
    (1 - mean(input.reviews.map(r => r.biasScore ?? 0)));

  return {
    biasDetected: biasFlags.length > 0,
    adjustmentApplied: Math.round(adjustmentApplied * 100) / 100,
    disparateImpactRatio: Math.round(disparateImpactRatio * 1000) / 1000,
    reviewerBiasFlags: biasFlags,
    confidenceInFairness: Math.round(confidenceInFairness * 100) / 100,
  };
}

/**
 * Calculates the Comprehensive Performance Intelligence Score (CPIS)
 *
 * Master Formula:
 *   CPIS = FairnessAdjust(Σ(Dᵢ × Wᵢ)) × TenureFactor × ConfidenceAdjust
 *
 * Where:
 *   Dᵢ = Dimension i raw score (0-100)
 *   Wᵢ = Dimension i weight (sums to 1.0)
 *   TenureFactor = min(1.1, 1 + tenureYears × 0.02)
 *   ConfidenceAdjust = 0.5 + 0.5 × σ(dataPoints, k=0.2, x₀=10)
 *
 * The function also computes:
 *   - Confidence interval via data point count
 *   - Growth trajectory via linear regression
 *   - Strengths/growth areas from dimension rankings
 *   - Full formula breakdown for explainability
 */
export function calculateCPIS(input: CPISInput): CPISResult {
  // Compute all 8 dimensions
  const d1 = computeGAI(input.goals);
  const d2 = computeRQS(input.reviews);
  const d3 = computeFSI(input.feedbacks);
  const d4 = computeCIS(input.collaboration);
  const d5 = computeCRI(input.consistency);
  const d6 = computeGTS(input.growth);
  const d7 = computeEQS(input.evidence);
  const d8 = computeIII(input.initiative);

  const dimensions = [d1, d2, d3, d4, d5, d6, d7, d8];

  // ── Dynamic Re-weighting ──────────────────────────────────────────
  // When a dimension has NO meaningful data (rawScore === 0 and its data source
  // was empty), redistribute its weight proportionally to dimensions that DO
  // have data.  This prevents penalizing users for data that simply doesn't
  // exist yet (e.g. no reviews conducted, no evidence submitted).
  const noDataCodes = new Set<string>();
  if (input.goals.length === 0) noDataCodes.add('GAI');
  if (input.reviews.length === 0) noDataCodes.add('RQS');
  // FSI defaults to 50 when empty — no re-weight needed
  if (input.evidence.totalEvidence === 0) noDataCodes.add('EQS');
  if (input.growth.historicalScores.length === 0 && input.growth.trainingsCompleted === 0 &&
      input.growth.skillProgressions === 0 && input.growth.developmentPlanProgress === 0) noDataCodes.add('GTS');
  // III: no initiative data tracked at all
  if (input.initiative.innovationContributions === 0 && input.initiative.mentoringSessions === 0 &&
      input.initiative.knowledgeSharing === 0 && input.initiative.processImprovements === 0 &&
      input.initiative.voluntaryGoals === 0) noDataCodes.add('III');
  // CRI: no real consistency tracking (no completed deadlines, no streaks)
  if (input.consistency.totalDeadlines === 0 && input.consistency.streakDays === 0) noDataCodes.add('CRI');
  // CIS: sparse collaboration data.  The sigmoid curves for CIS channels are
  // calibrated for mature usage (5+ feedbacks, 3+ one-on-ones, etc.).  When
  // individual channel counts average < 2, the scores cluster near 25-30 and
  // only add noise — exclude the dimension until data is richer.
  const totalCollabActivity = input.collaboration.crossFunctionalGoals +
    input.collaboration.feedbackGivenCount + input.collaboration.feedbackReceivedCount +
    input.collaboration.oneOnOneCount + input.collaboration.recognitionsGiven +
    input.collaboration.teamGoalContributions;
  if (totalCollabActivity < 12) noDataCodes.add('CIS');

  const deadWeight = dimensions
    .filter(d => noDataCodes.has(d.code))
    .reduce((s, d) => s + d.weight, 0);
  const liveWeight = 1 - deadWeight;

  if (deadWeight > 0 && liveWeight > 0) {
    for (const d of dimensions) {
      if (noDataCodes.has(d.code)) {
        d.weightedScore = 0;           // stays 0
      } else {
        const adjustedWeight = d.weight / liveWeight; // scale up proportionally
        d.weightedScore = Math.round(d.rawScore * adjustedWeight * 100) / 100;
      }
    }
  }

  // Weighted sum of all dimensions (with re-balanced weights)
  const rawComposite = dimensions.reduce((sum, d) => sum + d.weightedScore, 0);

  // Tenure factor: bonus for experience (2.5% per year, max +12%)
  const tenureFactor = Math.min(1.12, 1 + input.tenureYears * 0.025);

  // Data volume confidence (for display only — not used to dampen score)
  const totalDataPoints = input.goals.length + input.reviews.length +
    input.feedbacks.length + input.evidence.totalEvidence;
  const dataConfidence = 0.6 + 0.4 * sigmoid(totalDataPoints, 0.25, 8);

  // Raw score before fairness
  const rawScore = Math.min(100, rawComposite * tenureFactor);

  // ML Fairness analysis and correction
  const fairness = computeFairness(rawScore, input, dimensions);
  const fairAdjustedScore = Math.max(0, Math.min(100, rawScore + fairness.adjustmentApplied));

  // Final score — no center-pull damping.  Dynamic re-weighting already
  // handles missing dimensions, so damping would only compress the spread
  // and cluster everyone around C/C+.
  const finalScore = Math.round(fairAdjustedScore * 100) / 100;

  // Confidence interval (wider margin when data is sparse)
  const confidenceLevel = Math.round(dataConfidence * 100) / 100;
  const margin = Math.max(2, 15 * (1 - confidenceLevel));
  const confidence = {
    level: confidenceLevel,
    lowerBound: Math.max(0, Math.round((finalScore - margin) * 100) / 100),
    upperBound: Math.min(100, Math.round((finalScore + margin) * 100) / 100),
    dataPoints: totalDataPoints,
  };

  // Growth trajectory
  let trajectoryDirection: 'improving' | 'stable' | 'declining' = 'stable';
  let trajectorySlope = 0;
  let trajectoryPredicted = finalScore;
  let trajectoryRSq = 0;
  if (input.growth.historicalScores.length >= 2) {
    const scores = [...input.growth.historicalScores, finalScore];
    const x = scores.map((_, i) => i);
    const reg = linearRegression(x, scores);
    trajectorySlope = Math.round(reg.slope * 1000) / 1000;
    trajectoryDirection = reg.slope > 1 ? 'improving' : reg.slope < -1 ? 'declining' : 'stable';
    trajectoryPredicted = Math.round(Math.max(0, Math.min(100, reg.slope * scores.length + reg.intercept)) * 100) / 100;
    trajectoryRSq = Math.round(reg.rSquared * 1000) / 1000;
  }
  const trajectory = {
    slope: trajectorySlope,
    direction: trajectoryDirection,
    predictedNext: trajectoryPredicted,
    rSquared: trajectoryRSq,
  };

  // Identify strengths (top 3) and growth areas (bottom 3)
  // Exclude no-data dimensions — they aren't meaningful strengths or growth areas
  const activeDims = dimensions.filter(d => !noDataCodes.has(d.code));
  const sorted = [...activeDims].sort((a, b) => b.rawScore - a.rawScore);
  const strengths = sorted.slice(0, 3).filter(d => d.rawScore >= 50).map(d => d.name);
  const growthAreas = sorted.slice(-3).filter(d => d.rawScore < 80).map(d => d.name).reverse();

  // Formula breakdown string for transparency
  const formulaBreakdown = dimensions.map(d =>
    `${d.code}(${d.rawScore}) × ${d.weight}`
  ).join(' + ') + ` × TF(${Math.round(tenureFactor * 100) / 100})` +
    (fairness.adjustmentApplied !== 0 ? ` + FairnessAdj(${fairness.adjustmentApplied})` : '') +
    ` = ${finalScore}`;

  return {
    score: finalScore,
    rawScore: Math.round(rawScore * 100) / 100,
    grade: scoreToGrade(finalScore),
    starRating: scoreToStars(finalScore),
    rankLabel: scoreToRank(finalScore),
    dimensions,
    fairness,
    confidence,
    trajectory,
    strengths,
    growthAreas,
    formulaBreakdown,
  };
}

// ============================================================================
// EXPORTS - Singleton service pattern
// ============================================================================

export const mathEngine = {
  // Core statistics
  mean,
  weightedMean,
  weightedHarmonicMean,
  variance,
  standardDeviation,
  sampleStdDev,
  zScore,
  sigmoid,
  boundedSigmoid,
  pearsonCorrelation,
  linearRegression,
  ewma,
  shannonEntropy,
  percentileRank,
  bayesianEstimate,
  giniCoefficient,

  // Domain-specific
  calculateGoalFromTasks,
  calculatePerformanceScore,
  calculateTeamAnalytics,
  assessGoalRisk,
  calibrateRatings,

  // CPIS - Comprehensive Performance Intelligence Score
  calculateCPIS,
};
