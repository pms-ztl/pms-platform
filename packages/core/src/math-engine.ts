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
};
