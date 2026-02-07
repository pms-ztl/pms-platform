"""
Anomaly Detection & Risk Flagging
Pattern recognition for burnout, disengagement, and performance decline
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from pyod.models.lof import LOF
from pyod.models.knn import KNN
import joblib

class AnomalyDetector:
    """
    Multi-method anomaly detection for employee performance and wellbeing
    """

    def __init__(self, method: str = "isolation_forest", contamination: float = 0.1):
        """
        Initialize anomaly detector

        Args:
            method: Detection method (isolation_forest, lof, knn)
            contamination: Expected proportion of anomalies
        """
        self.method = method
        self.contamination = contamination
        self.scaler = StandardScaler()
        self.model = None
        self.baseline_stats = {}

        # Initialize detector based on method
        if method == "isolation_forest":
            self.model = IsolationForest(
                contamination=contamination,
                random_state=42,
                n_estimators=100
            )
        elif method == "lof":
            self.model = LOF(contamination=contamination)
        elif method == "knn":
            self.model = KNN(contamination=contamination)

    def fit(self, historical_data: pd.DataFrame):
        """
        Fit anomaly detector on historical normal data

        Args:
            historical_data: DataFrame with historical metrics
        """
        # Scale features
        X_scaled = self.scaler.fit_transform(historical_data)

        # Fit model
        if self.method == "isolation_forest":
            self.model.fit(X_scaled)
        else:
            self.model.fit(X_scaled)

        # Store baseline statistics
        self.baseline_stats = {
            'mean': historical_data.mean().to_dict(),
            'std': historical_data.std().to_dict(),
            'min': historical_data.min().to_dict(),
            'max': historical_data.max().to_dict()
        }

    def detect(self, metrics: Dict, entity_type: str = "USER") -> Dict:
        """
        Detect anomalies in current metrics

        Args:
            metrics: Current performance/behavior metrics
            entity_type: USER or TEAM

        Returns:
            Anomaly detection results with risk assessment
        """
        # Extract features
        features = self._extract_features(metrics)
        X = np.array(list(features.values())).reshape(1, -1)

        # Scale features
        X_scaled = self.scaler.transform(X)

        # Detect anomaly
        if self.method == "isolation_forest":
            anomaly_score = -self.model.score_samples(X_scaled)[0]  # Higher = more anomalous
            is_anomaly = self.model.predict(X_scaled)[0] == -1
        else:
            is_anomaly = self.model.predict(X_scaled)[0] == 1
            anomaly_score = self.model.decision_function(X_scaled)[0]

        # Normalize anomaly score to 0-100
        normalized_score = min(max(anomaly_score * 50 + 50, 0), 100)

        # Detect specific anomaly types
        anomaly_types = self._classify_anomaly_type(metrics, features)

        # Assess severity
        severity = self._assess_severity(normalized_score, anomaly_types)

        # Calculate deviations
        deviations = self._calculate_deviations(features)

        # Identify contributing factors
        factors = self._identify_contributing_factors(features, deviations)

        # Generate recommendations
        recommendations = self._generate_recommendations(anomaly_types, factors)

        # Assess urgency
        urgency = self._assess_urgency(severity, anomaly_types)

        return {
            'is_anomaly': bool(is_anomaly),
            'anomaly_score': round(normalized_score, 2),
            'confidence_score': round(min(abs(anomaly_score) / 2, 1.0), 2),
            'anomaly_types': anomaly_types,
            'severity': severity,
            'detection_method': self.method,
            'current_metrics': features,
            'deviations': deviations,
            'contributing_factors': factors,
            'risk_level': self._get_risk_level(normalized_score, anomaly_types),
            'urgency': urgency,
            'recommendations': recommendations,
            'suggested_actions': self._suggest_actions(anomaly_types, severity)
        }

    def _extract_features(self, metrics: Dict) -> Dict:
        """Extract relevant features for anomaly detection"""
        return {
            'productivity_score': metrics.get('productivity_score', 50),
            'engagement_score': metrics.get('engagement_score', 50),
            'sentiment_score': metrics.get('sentiment_score', 0),
            'hours_worked': metrics.get('hours_worked', 40),
            'tasks_completed': metrics.get('tasks_completed', 0),
            'meeting_hours': metrics.get('meeting_hours', 0),
            'response_time': metrics.get('avg_response_time_hours', 4),
            'collaboration_score': metrics.get('collaboration_score', 50),
            'code_quality': metrics.get('code_quality_score', 70),
            'bug_rate': metrics.get('bug_rate', 0)
        }

    def _classify_anomaly_type(self, metrics: Dict, features: Dict) -> List[str]:
        """
        Classify specific types of anomalies

        Returns:
            List of detected anomaly types
        """
        anomalies = []

        # Burnout indicators
        if (features['hours_worked'] > 55 and
            features['productivity_score'] < 40 and
            features['sentiment_score'] < -0.3):
            anomalies.append("BURNOUT")

        # Disengagement indicators
        if (features['engagement_score'] < 30 and
            features['response_time'] > 24 and
            metrics.get('meeting_attendance_rate', 1.0) < 0.5):
            anomalies.append("DISENGAGEMENT")

        # Performance decline
        productivity_trend = metrics.get('productivity_trend_30d', 0)
        if (features['productivity_score'] < 40 and productivity_trend < -10):
            anomalies.append("PERFORMANCE_DECLINE")

        # Overwork/stress
        if (features['hours_worked'] > 60 or
            features['meeting_hours'] > 30):
            anomalies.append("OVERWORK")

        # Quality issues
        if (features['bug_rate'] > 0.15 or
            features['code_quality'] < 50):
            anomalies.append("QUALITY_DECLINE")

        # Social withdrawal
        if (features['collaboration_score'] < 30 and
            metrics.get('communication_frequency', 0) < 10):
            anomalies.append("SOCIAL_WITHDRAWAL")

        # Sentiment decline
        sentiment_trend = metrics.get('sentiment_trend_30d', 0)
        if (features['sentiment_score'] < -0.5 or sentiment_trend < -0.3):
            anomalies.append("NEGATIVE_SENTIMENT_SPIKE")

        return anomalies if anomalies else ["GENERAL_ANOMALY"]

    def _assess_severity(self, anomaly_score: float, anomaly_types: List[str]) -> str:
        """
        Assess severity of detected anomalies

        Returns:
            Severity level
        """
        # Base severity on anomaly score
        if anomaly_score > 80:
            base_severity = "CRITICAL"
        elif anomaly_score > 60:
            base_severity = "HIGH"
        elif anomaly_score > 40:
            base_severity = "MEDIUM"
        else:
            base_severity = "LOW"

        # Escalate for specific critical types
        critical_types = {"BURNOUT", "SEVERE_DISENGAGEMENT", "MENTAL_HEALTH_CONCERN"}
        if any(t in critical_types for t in anomaly_types):
            base_severity = "CRITICAL"

        return base_severity

    def _calculate_deviations(self, features: Dict) -> Dict:
        """
        Calculate deviations from baseline

        Returns:
            Dictionary with deviation percentages
        """
        deviations = {}

        for key, current_value in features.items():
            if key in self.baseline_stats['mean']:
                expected = self.baseline_stats['mean'][key]
                std = self.baseline_stats['std'][key]

                if std > 0:
                    deviation = (current_value - expected) / std  # Z-score
                    deviation_pct = ((current_value - expected) / expected * 100) if expected != 0 else 0

                    deviations[key] = {
                        'current': round(current_value, 2),
                        'expected': round(expected, 2),
                        'deviation': round(deviation, 2),
                        'deviation_percentage': round(deviation_pct, 2)
                    }

        return deviations

    def _identify_contributing_factors(self, features: Dict, deviations: Dict) -> List[str]:
        """
        Identify top contributing factors to anomaly

        Returns:
            List of contributing factors
        """
        factors = []

        # Sort deviations by magnitude
        sorted_deviations = sorted(
            deviations.items(),
            key=lambda x: abs(x[1]['deviation']),
            reverse=True
        )

        for key, dev in sorted_deviations[:5]:  # Top 5
            if abs(dev['deviation']) > 2:  # More than 2 standard deviations
                direction = "increased" if dev['deviation'] > 0 else "decreased"
                factors.append(
                    f"{key.replace('_', ' ').title()} {direction} by {abs(dev['deviation_percentage']):.1f}%"
                )

        return factors

    def _generate_recommendations(self, anomaly_types: List[str], factors: List[str]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if "BURNOUT" in anomaly_types:
            recommendations.extend([
                "Immediate 1-on-1 to assess workload and wellbeing",
                "Consider workload redistribution",
                "Encourage time off or mental health support"
            ])

        if "DISENGAGEMENT" in anomaly_types:
            recommendations.extend([
                "Schedule re-engagement conversation",
                "Explore career development opportunities",
                "Review role alignment and job satisfaction"
            ])

        if "PERFORMANCE_DECLINE" in anomaly_types:
            recommendations.extend([
                "Identify and remove blockers",
                "Provide additional support or training",
                "Set up performance improvement plan if needed"
            ])

        if "OVERWORK" in anomaly_types:
            recommendations.extend([
                "Review and prioritize workload",
                "Set boundaries on working hours",
                "Assess team capacity and resource needs"
            ])

        if "QUALITY_DECLINE" in anomaly_types:
            recommendations.extend([
                "Increase code review rigor",
                "Provide technical mentoring",
                "Investigate root causes of quality issues"
            ])

        return list(set(recommendations))  # Remove duplicates

    def _suggest_actions(self, anomaly_types: List[str], severity: str) -> List[Dict]:
        """Suggest specific actions with priority"""
        actions = []

        if severity in ["CRITICAL", "HIGH"]:
            actions.append({
                'action': "Schedule immediate check-in",
                'priority': "URGENT",
                'timeframe': "Within 24 hours"
            })

        if "BURNOUT" in anomaly_types:
            actions.append({
                'action': "Assess mental health and wellbeing",
                'priority': "HIGH",
                'timeframe': "Within 2 days"
            })

        if "DISENGAGEMENT" in anomaly_types:
            actions.append({
                'action': "Conduct stay interview",
                'priority': "MEDIUM",
                'timeframe': "Within 1 week"
            })

        actions.append({
            'action': "Review and adjust workload",
            'priority': "MEDIUM",
            'timeframe': "Within 1 week"
        })

        return actions

    def _get_risk_level(self, anomaly_score: float, anomaly_types: List[str]) -> str:
        """Determine overall risk level"""
        if anomaly_score > 80 or "BURNOUT" in anomaly_types:
            return "CRITICAL"
        elif anomaly_score > 60:
            return "HIGH"
        elif anomaly_score > 40:
            return "MEDIUM"
        else:
            return "LOW"

    def _assess_urgency(self, severity: str, anomaly_types: List[str]) -> str:
        """Assess urgency of response needed"""
        critical_types = {"BURNOUT", "MENTAL_HEALTH_CONCERN"}

        if severity == "CRITICAL" or any(t in critical_types for t in anomaly_types):
            return "IMMEDIATE"
        elif severity == "HIGH":
            return "SOON"
        else:
            return "MONITOR"

    def save_model(self, filepath: str):
        """Save detector to disk"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'baseline_stats': self.baseline_stats,
            'method': self.method
        }, filepath)

    def load_model(self, filepath: str):
        """Load detector from disk"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.baseline_stats = data['baseline_stats']
        self.method = data['method']
