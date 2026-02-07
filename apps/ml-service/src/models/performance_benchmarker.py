"""
AI-Powered Performance Benchmarking
Statistical benchmarking with predictive modeling
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from scipy import stats

class PerformanceBenchmarker:
    """
    Calculate and compare performance against statistical benchmarks
    """

    def __init__(self):
        """Initialize performance benchmarker"""
        self.benchmarks = {}

    def create_benchmark(
        self,
        data: pd.DataFrame,
        metric_name: str,
        segment_by: Dict[str, any] = None
    ) -> Dict:
        """
        Create statistical benchmark from historical data

        Args:
            data: DataFrame with performance metrics
            metric_name: Name of the metric to benchmark
            segment_by: Dictionary specifying segmentation (role, dept, level)

        Returns:
            Benchmark statistics
        """
        # Filter data by segment if specified
        if segment_by:
            mask = pd.Series([True] * len(data))
            for key, value in segment_by.items():
                if key in data.columns:
                    mask &= (data[key] == value)
            segmented_data = data[mask]
        else:
            segmented_data = data

        if len(segmented_data) == 0:
            raise ValueError("No data available for specified segment")

        metric_values = segmented_data[metric_name].dropna()

        if len(metric_values) < 10:
            raise ValueError(f"Insufficient data points ({len(metric_values)}) for reliable benchmark")

        # Calculate statistics
        benchmark = {
            'metric_name': metric_name,
            'segment': segment_by or {},
            'sample_size': len(metric_values),
            'percentile_25': float(np.percentile(metric_values, 25)),
            'percentile_50': float(np.percentile(metric_values, 50)),
            'percentile_75': float(np.percentile(metric_values, 75)),
            'percentile_90': float(np.percentile(metric_values, 90)),
            'mean': float(metric_values.mean()),
            'standard_deviation': float(metric_values.std()),
            'min_value': float(metric_values.min()),
            'max_value': float(metric_values.max()),
            'data_points': len(segmented_data)
        }

        # Store benchmark
        benchmark_key = self._get_benchmark_key(metric_name, segment_by)
        self.benchmarks[benchmark_key] = benchmark

        return benchmark

    def compare_to_benchmark(
        self,
        user_value: float,
        metric_name: str,
        segment_by: Dict[str, any] = None
    ) -> Dict:
        """
        Compare individual performance to benchmark

        Args:
            user_value: User's metric value
            metric_name: Metric being compared
            segment_by: Segmentation for benchmark selection

        Returns:
            Comparison results with insights
        """
        # Get benchmark
        benchmark_key = self._get_benchmark_key(metric_name, segment_by)

        if benchmark_key not in self.benchmarks:
            raise ValueError(f"Benchmark not found for {metric_name} with specified segment")

        benchmark = self.benchmarks[benchmark_key]

        # Calculate percentile rank
        percentile_rank = self._calculate_percentile_rank(
            user_value,
            benchmark
        )

        # Calculate deviation from mean
        deviation_from_mean = user_value - benchmark['mean']

        # Calculate z-score
        if benchmark['standard_deviation'] > 0:
            z_score = (user_value - benchmark['mean']) / benchmark['standard_deviation']
        else:
            z_score = 0

        # Classify performance level
        performance_level = self._classify_performance_level(percentile_rank)

        # Determine relative position
        relative_position = self._get_relative_position(percentile_rank)

        # Generate insights
        strengths, improvement_areas = self._generate_insights(
            user_value,
            benchmark,
            percentile_rank
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            performance_level,
            deviation_from_mean,
            improvement_areas
        )

        return {
            'user_value': round(user_value, 2),
            'benchmark_value': round(benchmark['percentile_50'], 2),
            'percentile_rank': round(percentile_rank, 2),
            'deviation_from_mean': round(deviation_from_mean, 2),
            'z_score': round(z_score, 2),
            'performance_level': performance_level,
            'relative_position': relative_position,
            'benchmark_stats': {
                'mean': round(benchmark['mean'], 2),
                'median': round(benchmark['percentile_50'], 2),
                'p75': round(benchmark['percentile_75'], 2),
                'p90': round(benchmark['percentile_90'], 2),
                'std': round(benchmark['standard_deviation'], 2)
            },
            'strengths': strengths,
            'improvement_areas': improvement_areas,
            'recommendations': recommendations
        }

    def batch_compare(
        self,
        users_data: pd.DataFrame,
        metric_name: str,
        segment_by_column: str = None
    ) -> pd.DataFrame:
        """
        Compare multiple users to benchmarks in batch

        Args:
            users_data: DataFrame with user IDs and metric values
            metric_name: Metric to compare
            segment_by_column: Column to use for segmentation

        Returns:
            DataFrame with comparison results
        """
        results = []

        for idx, row in users_data.iterrows():
            user_value = row[metric_name]

            # Determine segment
            segment = {}
            if segment_by_column and segment_by_column in row:
                segment[segment_by_column] = row[segment_by_column]

            try:
                comparison = self.compare_to_benchmark(
                    user_value,
                    metric_name,
                    segment
                )

                results.append({
                    'user_id': row.get('user_id'),
                    'user_value': comparison['user_value'],
                    'percentile_rank': comparison['percentile_rank'],
                    'performance_level': comparison['performance_level'],
                    'relative_position': comparison['relative_position'],
                    'z_score': comparison['z_score']
                })
            except ValueError:
                # Skip if benchmark not available
                continue

        return pd.DataFrame(results)

    def _calculate_percentile_rank(self, value: float, benchmark: Dict) -> float:
        """
        Calculate percentile rank of a value

        Returns:
            Percentile rank (0-100)
        """
        # Interpolate between percentiles
        if value <= benchmark['percentile_25']:
            if value <= benchmark['min_value']:
                return 0
            # Interpolate between min and p25
            return 25 * (value - benchmark['min_value']) / (benchmark['percentile_25'] - benchmark['min_value'])

        elif value <= benchmark['percentile_50']:
            # Interpolate between p25 and p50
            return 25 + 25 * (value - benchmark['percentile_25']) / (benchmark['percentile_50'] - benchmark['percentile_25'])

        elif value <= benchmark['percentile_75']:
            # Interpolate between p50 and p75
            return 50 + 25 * (value - benchmark['percentile_50']) / (benchmark['percentile_75'] - benchmark['percentile_50'])

        elif value <= benchmark['percentile_90']:
            # Interpolate between p75 and p90
            return 75 + 15 * (value - benchmark['percentile_75']) / (benchmark['percentile_90'] - benchmark['percentile_75'])

        else:
            # Interpolate between p90 and max
            if value >= benchmark['max_value']:
                return 100
            return 90 + 10 * (value - benchmark['percentile_90']) / (benchmark['max_value'] - benchmark['percentile_90'])

    def _classify_performance_level(self, percentile_rank: float) -> str:
        """Classify performance level based on percentile"""
        if percentile_rank >= 90:
            return "EXCEPTIONAL"
        elif percentile_rank >= 75:
            return "ABOVE"
        elif percentile_rank >= 25:
            return "AT"
        else:
            return "BELOW"

    def _get_relative_position(self, percentile_rank: float) -> str:
        """Get relative position in distribution"""
        if percentile_rank >= 90:
            return "TOP_10"
        elif percentile_rank >= 75:
            return "TOP_25"
        elif percentile_rank >= 25:
            return "MIDDLE_50"
        elif percentile_rank >= 10:
            return "BOTTOM_25"
        else:
            return "BOTTOM_10"

    def _generate_insights(
        self,
        user_value: float,
        benchmark: Dict,
        percentile_rank: float
    ) -> Tuple[List[str], List[str]]:
        """
        Generate strengths and improvement areas

        Returns:
            (strengths, improvement_areas)
        """
        strengths = []
        improvements = []

        # Strength insights
        if percentile_rank >= 90:
            strengths.append(f"Performing in top 10% for {benchmark['metric_name']}")

        if percentile_rank >= 75:
            strengths.append(f"Above average performance ({percentile_rank:.0f}th percentile)")

        if user_value >= benchmark['percentile_75']:
            gap = user_value - benchmark['percentile_75']
            strengths.append(f"Exceeds 75th percentile by {gap:.1f} points")

        # Improvement insights
        if percentile_rank < 25:
            improvements.append(f"Performance below 25th percentile - significant improvement opportunity")

        if percentile_rank < 50:
            gap = benchmark['percentile_50'] - user_value
            improvements.append(f"Gap of {gap:.1f} points to reach median performance")

        if user_value < benchmark['mean']:
            gap = benchmark['mean'] - user_value
            improvements.append(f"{gap:.1f} points below average")

        return strengths, improvements

    def _generate_recommendations(
        self,
        performance_level: str,
        deviation: float,
        improvement_areas: List[str]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if performance_level == "EXCEPTIONAL":
            recommendations.extend([
                "Continue current practices",
                "Consider mentoring others",
                "Document success patterns for team learning"
            ])

        elif performance_level == "ABOVE":
            recommendations.extend([
                "Maintain strong performance",
                "Look for opportunities to push to top 10%"
            ])

        elif performance_level == "AT":
            recommendations.extend([
                "Identify specific areas for targeted improvement",
                "Seek feedback from high performers",
                "Set goals to move into top 25%"
            ])

        else:  # BELOW
            recommendations.extend([
                "Schedule 1-on-1 to discuss performance and barriers",
                "Create focused improvement plan",
                "Consider additional training or mentoring",
                "Identify and remove blockers"
            ])

        return recommendations

    def _get_benchmark_key(self, metric_name: str, segment_by: Dict[str, any] = None) -> str:
        """Generate unique key for benchmark"""
        if not segment_by:
            return metric_name

        segment_str = "_".join([f"{k}:{v}" for k, v in sorted(segment_by.items())])
        return f"{metric_name}_{segment_str}"

    def get_all_benchmarks(self) -> List[Dict]:
        """Get all stored benchmarks"""
        return list(self.benchmarks.values())

    def get_benchmark(self, metric_name: str, segment_by: Dict[str, any] = None) -> Dict:
        """Retrieve specific benchmark"""
        benchmark_key = self._get_benchmark_key(metric_name, segment_by)
        return self.benchmarks.get(benchmark_key)
