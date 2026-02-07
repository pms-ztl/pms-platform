"""
Productivity Prediction Engine
ML-based productivity forecasting using Random Forest and LSTM
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from datetime import datetime, timedelta

class ProductivityPredictor:
    """
    Productivity prediction using ensemble ML models
    """

    def __init__(self, model_type: str = "random_forest"):
        """
        Initialize productivity predictor

        Args:
            model_type: Type of model (random_forest, gradient_boosting)
        """
        self.model_type = model_type
        self.scaler = StandardScaler()
        self.model = None
        self.feature_importance = {}
        self.feature_names = []

        if model_type == "random_forest":
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        elif model_type == "gradient_boosting":
            self.model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )

    def extract_features(self, data: Dict) -> np.ndarray:
        """
        Extract and engineer features from raw data

        Args:
            data: Dictionary with productivity metrics

        Returns:
            Feature vector
        """
        features = []

        # Activity features
        features.append(data.get('commits_count', 0))
        features.append(data.get('pr_count', 0))
        features.append(data.get('code_reviews_given', 0))
        features.append(data.get('tasks_completed', 0))
        features.append(data.get('meetings_attended', 0))

        # Workload features
        features.append(data.get('active_tasks', 0))
        features.append(data.get('pending_reviews', 0))
        features.append(data.get('hours_worked', 40))

        # Collaboration features
        features.append(data.get('messages_sent', 0))
        features.append(data.get('collaboration_score', 0))

        # Temporal features
        day_of_week = data.get('day_of_week', 1)  # 1-7
        features.append(day_of_week)
        features.append(1 if day_of_week >= 6 else 0)  # is_weekend

        # Historical performance
        features.append(data.get('avg_productivity_7d', 50))
        features.append(data.get('avg_productivity_30d', 50))
        features.append(data.get('productivity_trend', 0))  # slope

        # Engagement indicators
        features.append(data.get('engagement_score', 50))
        features.append(data.get('sentiment_score', 0))

        # Velocity metrics
        features.append(data.get('velocity', 0))
        features.append(data.get('burndown_rate', 0))

        # Quality metrics
        features.append(data.get('code_quality_score', 0))
        features.append(data.get('bug_rate', 0))

        return np.array(features).reshape(1, -1)

    def train(self, training_data: pd.DataFrame, target_column: str = 'productivity_score'):
        """
        Train the productivity prediction model

        Args:
            training_data: DataFrame with features and target
            target_column: Name of target column

        Returns:
            Training metrics
        """
        # Separate features and target
        X = training_data.drop(columns=[target_column])
        y = training_data[target_column]

        self.feature_names = X.columns.tolist()

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        self.model.fit(X_train_scaled, y_train)

        # Calculate feature importance
        if hasattr(self.model, 'feature_importances_'):
            self.feature_importance = dict(zip(
                self.feature_names,
                self.model.feature_importances_
            ))

        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)

        # Make predictions for error analysis
        y_pred = self.model.predict(X_test_scaled)
        mae = np.mean(np.abs(y_test - y_pred))
        rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))

        return {
            'train_r2': train_score,
            'test_r2': test_score,
            'mae': mae,
            'rmse': rmse,
            'feature_importance': self.feature_importance
        }

    def predict(self, features: Dict) -> Dict:
        """
        Predict productivity score

        Args:
            features: Feature dictionary

        Returns:
            Prediction with confidence interval
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        # Extract features
        X = self.extract_features(features)

        # Scale features
        X_scaled = self.scaler.transform(X)

        # Predict
        prediction = self.model.predict(X_scaled)[0]

        # Calculate confidence interval using ensemble predictions
        if hasattr(self.model, 'estimators_'):
            # For ensemble models, get predictions from all estimators
            predictions = np.array([
                estimator.predict(X_scaled)[0]
                for estimator in self.model.estimators_
            ])

            std = np.std(predictions)
            confidence_interval = {
                'lower': prediction - 1.96 * std,
                'upper': prediction + 1.96 * std
            }
            confidence = 1.0 - min(std / prediction, 1.0) if prediction > 0 else 0.5
        else:
            confidence_interval = {'lower': prediction * 0.9, 'upper': prediction * 1.1}
            confidence = 0.75

        # Identify positive and negative factors
        positive_factors, negative_factors = self._identify_factors(features)

        # Generate recommendations
        recommendations = self._generate_recommendations(features, prediction)

        return {
            'predicted_score': round(prediction, 2),
            'confidence': round(confidence, 2),
            'confidence_interval': {
                'lower': round(confidence_interval['lower'], 2),
                'upper': round(confidence_interval['upper'], 2)
            },
            'feature_importance': self.feature_importance,
            'positive_factors': positive_factors,
            'negative_factors': negative_factors,
            'recommendations': recommendations
        }

    def _identify_factors(self, features: Dict) -> Tuple[List[str], List[str]]:
        """
        Identify factors contributing positively and negatively to productivity
        """
        positive = []
        negative = []

        # Check key metrics
        if features.get('engagement_score', 0) > 70:
            positive.append("High engagement level")
        elif features.get('engagement_score', 0) < 40:
            negative.append("Low engagement level")

        if features.get('sentiment_score', 0) > 0.5:
            positive.append("Positive sentiment")
        elif features.get('sentiment_score', 0) < -0.3:
            negative.append("Negative sentiment")

        if features.get('collaboration_score', 0) > 70:
            positive.append("Strong collaboration")
        elif features.get('collaboration_score', 0) < 40:
            negative.append("Limited collaboration")

        if features.get('active_tasks', 0) > 10:
            negative.append("High workload")

        if features.get('hours_worked', 40) > 50:
            negative.append("Potential overwork")

        if features.get('productivity_trend', 0) > 0.1:
            positive.append("Improving trend")
        elif features.get('productivity_trend', 0) < -0.1:
            negative.append("Declining trend")

        return positive, negative

    def _generate_recommendations(self, features: Dict, predicted_score: float) -> List[str]:
        """
        Generate actionable recommendations
        """
        recommendations = []

        if predicted_score < 50:
            recommendations.append("Schedule 1-on-1 to discuss workload and blockers")

        if features.get('sentiment_score', 0) < -0.3:
            recommendations.append("Check in on team morale and wellbeing")

        if features.get('active_tasks', 0) > 10:
            recommendations.append("Help prioritize tasks to reduce cognitive load")

        if features.get('collaboration_score', 0) < 40:
            recommendations.append("Encourage pair programming or collaboration sessions")

        if features.get('productivity_trend', 0) < -0.1:
            recommendations.append("Identify and address blockers causing decline")

        if features.get('hours_worked', 40) > 50:
            recommendations.append("Monitor for burnout risk and encourage work-life balance")

        return recommendations

    def save_model(self, filepath: str):
        """Save model to disk"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance
        }, filepath)

    def load_model(self, filepath: str):
        """Load model from disk"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.feature_importance = data['feature_importance']
