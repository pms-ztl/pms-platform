/**
 * AI Insights Routes
 * API routes for AI/ML features
 */

import { Router } from 'express';
import { AIInsightsController } from '../controllers/ai-insights.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const controller = new AIInsightsController();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

/**
 * @route   POST /api/ai-insights/sentiment/analyze
 * @desc    Analyze sentiment of text communication
 * @access  Private
 */
router.post('/sentiment/analyze', controller.analyzeSentiment);

/**
 * @route   GET /api/ai-insights/sentiment/trend
 * @desc    Get sentiment trend for user
 * @access  Private
 */
router.get('/sentiment/trend', controller.getSentimentTrend);

/**
 * @route   GET /api/ai-insights/sentiment/history
 * @desc    Get sentiment history for user
 * @access  Private
 */
router.get('/sentiment/history', controller.getSentimentHistory);

// ============================================================================
// PRODUCTIVITY PREDICTION
// ============================================================================

/**
 * @route   POST /api/ai-insights/productivity/predict
 * @desc    Predict productivity for entity
 * @access  Private
 */
router.post('/productivity/predict', controller.predictProductivity);

/**
 * @route   POST /api/ai-insights/productivity/extract-features
 * @desc    Extract features for productivity prediction
 * @access  Private
 */
router.post('/productivity/extract-features', controller.extractProductivityFeatures);

/**
 * @route   GET /api/ai-insights/productivity/predictions
 * @desc    Get productivity predictions
 * @access  Private
 */
router.get('/productivity/predictions', controller.getProductivityPredictions);

/**
 * @route   POST /api/ai-insights/productivity/validate
 * @desc    Validate productivity prediction
 * @access  Private
 */
router.post('/productivity/validate', controller.validateProductivityPrediction);

// ============================================================================
// ENGAGEMENT SCORING
// ============================================================================

/**
 * @route   POST /api/ai-insights/engagement/calculate
 * @desc    Calculate engagement score for user
 * @access  Private
 */
router.post('/engagement/calculate', controller.calculateEngagement);

/**
 * @route   POST /api/ai-insights/engagement/track-event
 * @desc    Track engagement event
 * @access  Private
 */
router.post('/engagement/track-event', controller.trackEngagementEvent);

/**
 * @route   GET /api/ai-insights/engagement/history
 * @desc    Get engagement history
 * @access  Private
 */
router.get('/engagement/history', controller.getEngagementHistory);

/**
 * @route   GET /api/ai-insights/engagement/at-risk
 * @desc    Get at-risk users
 * @access  Private
 */
router.get('/engagement/at-risk', controller.getAtRiskUsers);

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * @route   POST /api/ai-insights/anomaly/detect
 * @desc    Detect anomalies for entity
 * @access  Private
 */
router.post('/anomaly/detect', controller.detectAnomalies);

/**
 * @route   POST /api/ai-insights/anomaly/:anomalyId/acknowledge
 * @desc    Acknowledge anomaly
 * @access  Private
 */
router.post('/anomaly/:anomalyId/acknowledge', controller.acknowledgeAnomaly);

/**
 * @route   POST /api/ai-insights/anomaly/:anomalyId/resolve
 * @desc    Resolve anomaly
 * @access  Private
 */
router.post('/anomaly/:anomalyId/resolve', controller.resolveAnomaly);

/**
 * @route   GET /api/ai-insights/anomaly/active
 * @desc    Get active anomalies
 * @access  Private
 */
router.get('/anomaly/active', controller.getActiveAnomalies);

/**
 * @route   GET /api/ai-insights/anomaly/statistics
 * @desc    Get anomaly statistics
 * @access  Private
 */
router.get('/anomaly/statistics', controller.getAnomalyStatistics);

// ============================================================================
// PERFORMANCE BENCHMARKING
// ============================================================================

/**
 * @route   POST /api/ai-insights/benchmark/create
 * @desc    Create or update benchmark
 * @access  Private
 */
router.post('/benchmark/create', controller.createBenchmark);

/**
 * @route   POST /api/ai-insights/benchmark/compare
 * @desc    Compare user to benchmark
 * @access  Private
 */
router.post('/benchmark/compare', controller.compareToBenchmark);

/**
 * @route   GET /api/ai-insights/benchmark/comparisons
 * @desc    Get user's benchmark comparisons
 * @access  Private
 */
router.get('/benchmark/comparisons', controller.getUserComparisons);

/**
 * @route   GET /api/ai-insights/benchmark/team-summary
 * @desc    Get team benchmark summary
 * @access  Private
 */
router.get('/benchmark/team-summary', controller.getTeamBenchmarkSummary);

export default router;
