"""
Utility functions for the RA stress testing tool.
"""

from .ewma import ewma, ewma_from_series, compute_trend_growth

__all__ = ['ewma', 'ewma_from_series', 'compute_trend_growth']
