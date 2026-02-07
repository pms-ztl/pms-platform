"""
ML Service FastAPI Application
Provides ML prediction endpoints for PMS
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uvicorn
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.sentiment_analyzer import SentimentAnalyzer
from models.productivity_predictor import ProductivityPredictor
from models.engagement_scorer import EngagementScorer
from models.anomaly_detector import AnomalyDetector
from models.performance_benchmarker import PerformanceBenchmarker

app = FastAPI(
    title="PMS ML Service",
    description="Machine Learning service for Performance Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models (lazy loading)
_sentiment_analyzer = None
_productivity_predictor = None
_engagement_scorer = None
_anomaly_detector = None
_performance_benchmarker = None

def get_sentiment_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentAnalyzer()
    return _sentiment_analyzer

def get_productivity_predictor():
    global _productivity_predictor
    if _productivity_predictor is None:
        _productivity_predictor = ProductivityPredictor()
        # Load trained model if exists
        model_path = os.getenv("PRODUCTIVITY_MODEL_PATH")
        if model_path and os.path.exists(model_path):
            _productivity_predictor.load_model(model_path)
    return _productivity_predictor

def get_engagement_scorer():
    global _engagement_scorer
    if _engagement_scorer is None:
        _engagement_scorer = EngagementScorer()
    return _engagement_scorer

def get_anomaly_detector():
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
        # Load trained detector if exists
        model_path = os.getenv("ANOMALY_MODEL_PATH")
        if model_path and os.path.exists(model_path):
            _anomaly_detector.load_model(model_path)
    return _anomaly_detector

def get_performance_benchmarker():
    global _performance_benchmarker
    if _performance_benchmarker is None:
        _performance_benchmarker = PerformanceBenchmarker()
    return _performance_benchmarker

# Request/Response Models
class SentimentRequest(BaseModel):
    text: str = Field(..., description="Text to analyze")
    source_type: Optional[str] = Field(None, description="Source type (EMAIL, SLACK, etc.)")

class SentimentResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    confidence: float
    emotions: Dict
    dominant_emotion: Optional[str]
    topics: List[str]
    intent: Optional[str]

class ProductivityRequest(BaseModel):
    features: Dict = Field(..., description="Feature dictionary with productivity metrics")

class ProductivityResponse(BaseModel):
    predicted_score: float
    confidence: float
    confidence_interval: Dict
    positive_factors: List[str]
    negative_factors: List[str]
    recommendations: List[str]

class EngagementRequest(BaseModel):
    metrics: Dict = Field(..., description="Activity metrics dictionary")

class EngagementResponse(BaseModel):
    overall_score: float
    score_level: str
    component_scores: Dict
    trend_direction: Optional[str]
    at_risk: bool
    risk_level: Optional[str]
    risk_factors: List[str]

class AnomalyRequest(BaseModel):
    metrics: Dict = Field(..., description="Performance and behavior metrics")
    entity_type: str = Field("USER", description="USER or TEAM")

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    confidence_score: float
    anomaly_types: List[str]
    severity: str
    risk_level: str
    urgency: str
    recommendations: List[str]
    suggested_actions: List[Dict]

class BenchmarkRequest(BaseModel):
    user_value: float
    metric_name: str
    segment_by: Optional[Dict] = None

class BenchmarkResponse(BaseModel):
    user_value: float
    benchmark_value: float
    percentile_rank: float
    performance_level: str
    relative_position: str
    z_score: float
    strengths: List[str]
    improvement_areas: List[str]
    recommendations: List[str]

# API Endpoints
@app.get("/")
def read_root():
    return {
        "service": "PMS ML Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/ml/sentiment/analyze", response_model=SentimentResponse)
def analyze_sentiment(
    request: SentimentRequest,
    analyzer: SentimentAnalyzer = Depends(get_sentiment_analyzer)
):
    """
    Analyze sentiment of text communication

    Returns sentiment scores, emotions, topics, and intent
    """
    try:
        result = analyzer.analyze(request.text)
        return SentimentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/sentiment/batch", response_model=List[SentimentResponse])
def analyze_sentiment_batch(
    texts: List[str],
    analyzer: SentimentAnalyzer = Depends(get_sentiment_analyzer)
):
    """
    Analyze sentiment for multiple texts in batch
    """
    try:
        results = analyzer.batch_analyze(texts)
        return [SentimentResponse(**r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/productivity/predict", response_model=ProductivityResponse)
def predict_productivity(
    request: ProductivityRequest,
    predictor: ProductivityPredictor = Depends(get_productivity_predictor)
):
    """
    Predict productivity score based on features

    Returns prediction with confidence interval and recommendations
    """
    try:
        result = predictor.predict(request.features)
        return ProductivityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/engagement/score", response_model=EngagementResponse)
def calculate_engagement(
    request: EngagementRequest,
    scorer: EngagementScorer = Depends(get_engagement_scorer)
):
    """
    Calculate engagement score from activity metrics

    Returns overall score, components, and risk assessment
    """
    try:
        result = scorer.calculate_score(request.metrics)
        return EngagementResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/anomaly/detect", response_model=AnomalyResponse)
def detect_anomaly(
    request: AnomalyRequest,
    detector: AnomalyDetector = Depends(get_anomaly_detector)
):
    """
    Detect anomalies in performance/behavior metrics

    Returns anomaly detection with severity and recommendations
    """
    try:
        result = detector.detect(request.metrics, request.entity_type)
        return AnomalyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/benchmark/compare", response_model=BenchmarkResponse)
def compare_to_benchmark(
    request: BenchmarkRequest,
    benchmarker: PerformanceBenchmarker = Depends(get_performance_benchmarker)
):
    """
    Compare user performance to benchmark

    Returns percentile rank, performance level, and insights
    """
    try:
        result = benchmarker.compare_to_benchmark(
            request.user_value,
            request.metric_name,
            request.segment_by
        )
        return BenchmarkResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ml/models/status")
def get_models_status():
    """Get status of all ML models"""
    return {
        "sentiment_analyzer": _sentiment_analyzer is not None,
        "productivity_predictor": _productivity_predictor is not None,
        "engagement_scorer": _engagement_scorer is not None,
        "anomaly_detector": _anomaly_detector is not None,
        "performance_benchmarker": _performance_benchmarker is not None
    }

if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
