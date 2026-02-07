"""
Engagement Scoring Algorithm
Real-time engagement calculation from activity patterns
"""

import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta

class EngagementScorer:
    """
    Calculate engagement scores based on activity patterns and behaviors
    """

    def __init__(self, weights: Dict[str, float] = None):
        """
        Initialize engagement scorer with component weights

        Args:
            weights: Dictionary of component weights (defaults to balanced)
        """
        self.weights = weights or {
            'participation': 0.25,
            'communication': 0.20,
            'collaboration': 0.20,
            'initiative': 0.20,
            'responsiveness': 0.15
        }

    def calculate_score(self, metrics: Dict) -> Dict:
        """
        Calculate overall engagement score and components

        Args:
            metrics: Dictionary of activity metrics

        Returns:
            Engagement score breakdown with risk assessment
        """
        # Calculate component scores
        participation_score = self._score_participation(metrics)
        communication_score = self._score_communication(metrics)
        collaboration_score = self._score_collaboration(metrics)
        initiative_score = self._score_initiative(metrics)
        responsiveness_score = self._score_responsiveness(metrics)

        # Calculate overall score
        overall_score = (
            participation_score * self.weights['participation'] +
            communication_score * self.weights['communication'] +
            collaboration_score * self.weights['collaboration'] +
            initiative_score * self.weights['initiative'] +
            responsiveness_score * self.weights['responsiveness']
        )

        # Determine score level
        score_level = self._get_score_level(overall_score)

        # Analyze patterns
        patterns = self._analyze_patterns(metrics)

        # Calculate trend
        trend = self._calculate_trend(metrics)

        # Risk assessment
        risk_factors, at_risk, risk_level = self._assess_risk(
            overall_score,
            {
                'participation': participation_score,
                'communication': communication_score,
                'collaboration': collaboration_score,
                'initiative': initiative_score,
                'responsiveness': responsiveness_score
            },
            metrics
        )

        return {
            'overall_score': round(overall_score, 2),
            'score_level': score_level,
            'component_scores': {
                'participation': round(participation_score, 2),
                'communication': round(communication_score, 2),
                'collaboration': round(collaboration_score, 2),
                'initiative': round(initiative_score, 2),
                'responsiveness': round(responsiveness_score, 2)
            },
            'activity_metrics': self._summarize_metrics(metrics),
            'engagement_patterns': patterns,
            'trend_direction': trend['direction'],
            'change_from_previous': trend.get('change'),
            'week_over_week_change': trend.get('wow_change'),
            'risk_factors': risk_factors,
            'at_risk': at_risk,
            'risk_level': risk_level
        }

    def _score_participation(self, metrics: Dict) -> float:
        """
        Score participation in meetings, discussions, and activities

        Scale: 0-100
        """
        score = 0.0

        # Meeting attendance
        meetings_attended = metrics.get('meetings_attended', 0)
        total_meetings = metrics.get('total_meetings', 1)
        attendance_rate = min(meetings_attended / max(total_meetings, 1), 1.0)
        score += attendance_rate * 30

        # Meeting participation (speaking, questions, contributions)
        participation_rate = metrics.get('meeting_participation_rate', 0.5)
        score += participation_rate * 25

        # Discussion forum activity
        forum_posts = metrics.get('forum_posts', 0)
        score += min(forum_posts / 10, 1.0) * 20

        # Event attendance
        events_attended = metrics.get('events_attended', 0)
        score += min(events_attended / 5, 1.0) * 15

        # Survey/feedback participation
        surveys_completed = metrics.get('surveys_completed', 0)
        total_surveys = metrics.get('total_surveys', 1)
        survey_rate = min(surveys_completed / max(total_surveys, 1), 1.0)
        score += survey_rate * 10

        return min(score, 100.0)

    def _score_communication(self, metrics: Dict) -> float:
        """
        Score communication frequency and quality

        Scale: 0-100
        """
        score = 0.0

        # Message frequency (normalized)
        messages_sent = metrics.get('messages_sent', 0)
        expected_messages = metrics.get('expected_messages_per_week', 50)
        message_rate = min(messages_sent / expected_messages, 1.5)  # Cap at 150%
        score += min(message_rate * 30, 40)

        # Response rate to mentions
        responses_to_mentions = metrics.get('responses_to_mentions', 0)
        total_mentions = metrics.get('total_mentions', 1)
        response_rate = min(responses_to_mentions / max(total_mentions, 1), 1.0)
        score += response_rate * 25

        # Communication clarity (from sentiment/nlp analysis)
        clarity_score = metrics.get('communication_clarity', 0.7)  # 0-1
        score += clarity_score * 20

        # Emoji/reaction usage (indicator of engagement)
        reactions_given = metrics.get('reactions_given', 0)
        score += min(reactions_given / 20, 1.0) * 15

        return min(score, 100.0)

    def _score_collaboration(self, metrics: Dict) -> float:
        """
        Score collaboration and teamwork

        Scale: 0-100
        """
        score = 0.0

        # Code reviews given
        reviews_given = metrics.get('code_reviews_given', 0)
        score += min(reviews_given / 10, 1.0) * 25

        # Pair programming sessions
        pair_sessions = metrics.get('pair_programming_sessions', 0)
        score += min(pair_sessions / 5, 1.0) * 20

        # Knowledge sharing (docs, presentations)
        knowledge_contributions = metrics.get('knowledge_contributions', 0)
        score += min(knowledge_contributions / 3, 1.0) * 20

        # Cross-team collaborations
        cross_team_work = metrics.get('cross_team_collaborations', 0)
        score += min(cross_team_work / 5, 1.0) * 20

        # Mentoring activities
        mentoring_sessions = metrics.get('mentoring_sessions', 0)
        score += min(mentoring_sessions / 3, 1.0) * 15

        return min(score, 100.0)

    def _score_initiative(self, metrics: Dict) -> float:
        """
        Score proactive behavior and initiative

        Scale: 0-100
        """
        score = 0.0

        # Self-started tasks/projects
        self_initiated_tasks = metrics.get('self_initiated_tasks', 0)
        score += min(self_initiated_tasks / 3, 1.0) * 30

        # Process improvement suggestions
        improvements_suggested = metrics.get('improvements_suggested', 0)
        score += min(improvements_suggested / 2, 1.0) * 25

        # Voluntary contributions (beyond assigned work)
        voluntary_work = metrics.get('voluntary_contributions', 0)
        score += min(voluntary_work / 3, 1.0) * 20

        # Proactive problem-solving
        proactive_fixes = metrics.get('proactive_problem_solving', 0)
        score += min(proactive_fixes / 3, 1.0) * 15

        # Learning activities (courses, certifications)
        learning_activities = metrics.get('learning_activities', 0)
        score += min(learning_activities / 2, 1.0) * 10

        return min(score, 100.0)

    def _score_responsiveness(self, metrics: Dict) -> float:
        """
        Score responsiveness and availability

        Scale: 0-100
        """
        score = 0.0

        # Average response time (in hours)
        avg_response_time = metrics.get('avg_response_time_hours', 24)
        if avg_response_time <= 2:
            score += 40
        elif avg_response_time <= 8:
            score += 30
        elif avg_response_time <= 24:
            score += 20
        else:
            score += 10

        # Response rate
        response_rate = metrics.get('response_rate', 0.7)  # % of messages responded to
        score += response_rate * 30

        # Availability during working hours
        availability = metrics.get('availability_percentage', 0.8)  # % online during work hours
        score += availability * 20

        # Acknowledgment rate (acknowledging messages even if detailed response pending)
        ack_rate = metrics.get('acknowledgment_rate', 0.6)
        score += ack_rate * 10

        return min(score, 100.0)

    def _get_score_level(self, score: float) -> str:
        """Convert score to categorical level"""
        if score >= 80:
            return "VERY_HIGH"
        elif score >= 65:
            return "HIGH"
        elif score >= 45:
            return "MODERATE"
        elif score >= 30:
            return "LOW"
        else:
            return "VERY_LOW"

    def _analyze_patterns(self, metrics: Dict) -> Dict:
        """
        Analyze engagement patterns over time

        Returns:
            Pattern insights
        """
        patterns = {}

        # Time-of-day pattern
        hourly_activity = metrics.get('hourly_activity_distribution', {})
        if hourly_activity:
            peak_hour = max(hourly_activity.items(), key=lambda x: x[1])[0] if hourly_activity else 'N/A'
            patterns['peak_activity_hour'] = peak_hour

        # Day-of-week pattern
        daily_activity = metrics.get('daily_activity_distribution', {})
        if daily_activity:
            most_active_day = max(daily_activity.items(), key=lambda x: x[1])[0] if daily_activity else 'N/A'
            patterns['most_active_day'] = most_active_day

        # Consistency score
        activity_variance = metrics.get('activity_variance', 0)
        consistency = 100 - min(activity_variance, 100)
        patterns['consistency_score'] = round(consistency, 2)

        # Engagement type distribution
        patterns['engagement_distribution'] = {
            'synchronous': metrics.get('synchronous_engagement_pct', 0),
            'asynchronous': metrics.get('asynchronous_engagement_pct', 0)
        }

        return patterns

    def _calculate_trend(self, metrics: Dict) -> Dict:
        """Calculate engagement trend direction"""
        current_score = metrics.get('current_engagement_score', 50)
        previous_score = metrics.get('previous_engagement_score', 50)
        week_ago_score = metrics.get('week_ago_engagement_score', 50)

        change = current_score - previous_score
        wow_change = current_score - week_ago_score

        if change > 5:
            direction = "IMPROVING"
        elif change < -5:
            direction = "DECLINING"
        else:
            direction = "STABLE"

        return {
            'direction': direction,
            'change': round(change, 2),
            'wow_change': round(wow_change, 2)
        }

    def _assess_risk(
        self,
        overall_score: float,
        component_scores: Dict[str, float],
        metrics: Dict
    ) -> tuple:
        """
        Assess disengagement risk

        Returns:
            (risk_factors, at_risk_bool, risk_level)
        """
        risk_factors = []
        risk_score = 0

        # Overall low engagement
        if overall_score < 40:
            risk_factors.append("Overall engagement below threshold")
            risk_score += 30

        # Declining trend
        if metrics.get('engagement_trend', 0) < -10:
            risk_factors.append("Declining engagement trend")
            risk_score += 20

        # Low participation
        if component_scores['participation'] < 30:
            risk_factors.append("Very low participation in meetings and activities")
            risk_score += 15

        # Low communication
        if component_scores['communication'] < 30:
            risk_factors.append("Minimal communication with team")
            risk_score += 15

        # No initiative
        if component_scores['initiative'] < 20:
            risk_factors.append("Lack of proactive behavior")
            risk_score += 10

        # Poor responsiveness
        if component_scores['responsiveness'] < 30:
            risk_factors.append("Slow or no responses to communications")
            risk_score += 10

        # Determine risk level
        if risk_score >= 50:
            risk_level = "CRITICAL"
            at_risk = True
        elif risk_score >= 30:
            risk_level = "HIGH"
            at_risk = True
        elif risk_score >= 15:
            risk_level = "MEDIUM"
            at_risk = True
        else:
            risk_level = "LOW"
            at_risk = False

        return risk_factors, at_risk, risk_level

    def _summarize_metrics(self, metrics: Dict) -> Dict:
        """Create summary of key metrics"""
        return {
            'total_activities': metrics.get('total_activities', 0),
            'active_days': metrics.get('active_days', 0),
            'avg_daily_activities': round(metrics.get('avg_daily_activities', 0), 1),
            'consistency_score': round(metrics.get('consistency_score', 50), 1)
        }
