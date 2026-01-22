"""
Exponentially Weighted Moving Average (EWMA) calculations.

These utilities implement the EWMA methodology used by Research Affiliates
for computing fair values and long-term averages.
"""

from typing import List, Optional
import math


def ewma(
    data: List[float],
    half_life_years: float,
    window_years: Optional[int] = None,
    frequency: str = 'monthly'
) -> float:
    """
    Calculate Exponentially Weighted Moving Average.

    Parameters
    ----------
    data : List[float]
        Time series data, ordered from oldest to newest.
    half_life_years : float
        Number of years for the weight to decay by 50%.
    window_years : int, optional
        Number of years of data to use. If None, uses all data.
    frequency : str
        Data frequency: 'monthly', 'quarterly', or 'annual'.

    Returns
    -------
    float
        The EWMA value.
    """
    # Determine periods per year based on frequency
    periods_per_year = {
        'monthly': 12,
        'quarterly': 4,
        'annual': 1
    }.get(frequency, 12)

    # Calculate decay factor (lambda)
    # lambda = 0.5^(1/half_life_in_periods)
    half_life_periods = half_life_years * periods_per_year
    lambda_decay = 0.5 ** (1 / half_life_periods)

    # Limit data to window if specified
    if window_years is not None:
        window_periods = window_years * periods_per_year
        data = data[-window_periods:] if len(data) > window_periods else data

    if not data:
        raise ValueError("No data provided for EWMA calculation")

    # Calculate weights (more recent = higher weight)
    n = len(data)
    weights = [lambda_decay ** (n - 1 - i) for i in range(n)]

    # Normalize weights
    total_weight = sum(weights)
    weights = [w / total_weight for w in weights]

    # Calculate weighted average
    result = sum(d * w for d, w in zip(data, weights))

    return result


def ewma_from_series(
    data: List[float],
    half_life_years: float,
    window_years: Optional[int] = None,
    frequency: str = 'monthly'
) -> List[float]:
    """
    Calculate rolling EWMA for an entire series.

    Returns a list of EWMA values, one for each point in the series
    (using all available data up to that point, respecting the window).

    Parameters
    ----------
    data : List[float]
        Time series data, ordered from oldest to newest.
    half_life_years : float
        Number of years for the weight to decay by 50%.
    window_years : int, optional
        Number of years of data to use for each calculation.
    frequency : str
        Data frequency: 'monthly', 'quarterly', or 'annual'.

    Returns
    -------
    List[float]
        Rolling EWMA values.
    """
    result = []
    for i in range(1, len(data) + 1):
        ewma_val = ewma(data[:i], half_life_years, window_years, frequency)
        result.append(ewma_val)
    return result


def compute_trend_growth(
    data: List[float],
    window_years: int = 50,
    frequency: str = 'annual'
) -> float:
    """
    Compute log-linear trend growth rate.

    Used for EPS growth calculations where RA uses a 50-year
    log-linear trend rather than EWMA.

    Parameters
    ----------
    data : List[float]
        Time series data (levels, not returns), oldest to newest.
    window_years : int
        Years of data to use for trend calculation.
    frequency : str
        Data frequency.

    Returns
    -------
    float
        Annualized trend growth rate.
    """
    periods_per_year = {
        'monthly': 12,
        'quarterly': 4,
        'annual': 1
    }.get(frequency, 1)

    window_periods = window_years * periods_per_year
    data = data[-window_periods:] if len(data) > window_periods else data

    if len(data) < 2:
        raise ValueError("Need at least 2 data points for trend calculation")

    # Convert to log values
    log_data = [math.log(d) for d in data if d > 0]

    if len(log_data) < 2:
        raise ValueError("Insufficient positive values for trend calculation")

    # Simple linear regression on log values
    n = len(log_data)
    x = list(range(n))

    x_mean = sum(x) / n
    y_mean = sum(log_data) / n

    numerator = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, log_data))
    denominator = sum((xi - x_mean) ** 2 for xi in x)

    if denominator == 0:
        return 0.0

    # Slope is growth rate per period
    slope = numerator / denominator

    # Annualize
    annual_growth = slope * periods_per_year

    return annual_growth


def sigmoid_my_ratio(my_ratio: float, midpoint: float = 2.0, steepness: float = 2.0) -> float:
    """
    Sigmoid function for Middle/Young ratio demographic effect.

    Higher MY ratio (aging population) tends to reduce growth.

    Parameters
    ----------
    my_ratio : float
        Middle-aged to Young population ratio.
    midpoint : float
        MY ratio at which effect is zero.
    steepness : float
        How quickly the effect changes around the midpoint.

    Returns
    -------
    float
        Demographic effect on growth (can be positive or negative).
    """
    # Centered sigmoid: positive when MY < midpoint, negative when MY > midpoint
    z = steepness * (midpoint - my_ratio)
    sigmoid = 1 / (1 + math.exp(-z))

    # Scale to reasonable range (-1% to +1% effect)
    effect = (sigmoid - 0.5) * 0.02

    return effect
