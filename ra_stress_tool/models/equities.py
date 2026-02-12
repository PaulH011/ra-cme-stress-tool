"""
Equity return models for US, Europe, Japan, and Emerging Markets.

RA Model:
  E[Equity Return] = Dividend Yield + Real EPS Growth + Valuation Change (CAEY)

Grinold-Kroner Model:
  E[Equity Return] = Dividend Yield + Net Buyback Yield + Revenue Growth
                     + Margin Change + Valuation Change (P/E)
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from ..inputs.overrides import OverrideManager, TrackedValue, InputSource, extract_values
from ..config import AssetClass, Region, EQUITY_PARAMS


class EquityRegion(Enum):
    """Equity market regions."""
    US = "us"
    EUROPE = "europe"
    JAPAN = "japan"
    EM = "em"


@dataclass
class EquityForecast:
    """Container for equity return forecasts."""
    expected_return_nominal: float
    expected_return_real: float

    # Component breakdown
    dividend_yield: float
    real_eps_growth: float
    valuation_change: float

    # Inflation used for nominal return
    inflation: float

    # Full component details
    components: Dict[str, Any]
    sources: Dict[str, str]


class EquityModel:
    """
    Equity return model implementing RA methodology.

    E[Equity Return] = Dividend Yield + Real EPS Growth + Valuation Change

    Valuation change is based on CAEY (Cyclically Adjusted Earnings Yield)
    mean reversion over 20 years, averaged over the 10-year forecast horizon.
    """

    # Mapping from region to asset class
    REGION_TO_ASSET = {
        EquityRegion.US: AssetClass.EQUITY_US,
        EquityRegion.EUROPE: AssetClass.EQUITY_EUROPE,
        EquityRegion.JAPAN: AssetClass.EQUITY_JAPAN,
        EquityRegion.EM: AssetClass.EQUITY_EM,
    }

    # Regional groupings for EPS growth averaging
    DM_REGIONS = [EquityRegion.US, EquityRegion.EUROPE, EquityRegion.JAPAN]
    EM_REGIONS = [EquityRegion.EM]

    def __init__(self, override_manager: OverrideManager):
        """
        Initialize equity model.

        Parameters
        ----------
        override_manager : OverrideManager
            Manager for handling input overrides.
        """
        self.overrides = override_manager
        self._params = EQUITY_PARAMS.copy()

    def get_inputs(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """Get inputs for a specific equity region."""
        asset_class = self.REGION_TO_ASSET[region]
        return self.overrides.get_asset_inputs(asset_class)

    def forecast_dividend_yield(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """
        Get dividend yield for a region.

        Dividend yield is typically taken as current value (no mean reversion).

        Parameters
        ----------
        region : EquityRegion
            The equity region.

        Returns
        -------
        dict
            Dividend yield components.
        """
        inputs = self.get_inputs(region)
        dividend_yield = inputs.get('dividend_yield', TrackedValue(0.02, InputSource.DEFAULT))

        return {
            'dividend_yield': dividend_yield,
        }

    def forecast_eps_growth(
        self,
        region: EquityRegion,
        global_rgdp_growth: Optional[float] = None
    ) -> Dict[str, TrackedValue]:
        """
        Forecast real EPS growth for a region.

        EPS growth is averaged with regional peers and capped at global GDP growth.

        Parameters
        ----------
        region : EquityRegion
            The equity region.
        global_rgdp_growth : float, optional
            Global real GDP growth for cap. If None, no cap applied.

        Returns
        -------
        dict
            EPS growth components.
        """
        inputs = self.get_inputs(region)

        # Country-specific EPS growth
        country_eps = inputs.get('real_eps_growth', TrackedValue(0.015, InputSource.DEFAULT))

        # Regional average EPS growth
        regional_eps = inputs.get('regional_eps_growth', TrackedValue(0.015, InputSource.DEFAULT))

        # Weighted average (50/50 by default)
        country_weight = self._params.get('country_weight', 0.5)
        regional_weight = self._params.get('regional_weight', 0.5)

        blended_eps = (
            country_weight * country_eps.value +
            regional_weight * regional_eps.value
        )

        # Cap at global GDP growth if provided
        if global_rgdp_growth is not None:
            capped_eps = min(blended_eps, global_rgdp_growth)
            was_capped = capped_eps < blended_eps
        else:
            capped_eps = blended_eps
            was_capped = False

        return {
            'real_eps_growth': TrackedValue(capped_eps, InputSource.COMPUTED),
            'country_eps_growth': country_eps,
            'regional_eps_growth': regional_eps,
            'blended_eps_growth': TrackedValue(blended_eps, InputSource.COMPUTED),
            'was_capped': TrackedValue(was_capped, InputSource.COMPUTED),
            'country_weight': TrackedValue(country_weight, InputSource.DEFAULT),
            'regional_weight': TrackedValue(regional_weight, InputSource.DEFAULT),
        }

    def forecast_valuation_change(
        self,
        region: EquityRegion,
        forecast_horizon: int = 10
    ) -> Dict[str, TrackedValue]:
        """
        Forecast valuation change from CAEY mean reversion.

        CAEY (Cyclically Adjusted Earnings Yield) reverts to fair value
        over 20 years. The reversion speed (lambda) controls how much
        of the reversion actually occurs:
          lambda = 1.0 → full reversion (default)
          lambda = 0.5 → half-speed reversion
          lambda = 0.0 → no reversion

        Formula: caey_annual_change = (fair/current)^(lambda/20) - 1

        Parameters
        ----------
        region : EquityRegion
            The equity region.
        forecast_horizon : int
            Years for forecast.

        Returns
        -------
        dict
            Valuation components.
        """
        inputs = self.get_inputs(region)

        # Current CAEY (inverse of CAPE)
        current_caey = inputs.get('current_caey', TrackedValue(0.04, InputSource.DEFAULT))

        # Fair CAEY (long-term average)
        fair_caey = inputs.get('fair_caey', TrackedValue(0.05, InputSource.DEFAULT))

        # Reversion speed (lambda): 1.0 = full reversion, 0.0 = no reversion
        reversion_speed = inputs.get('reversion_speed', TrackedValue(1.0, InputSource.DEFAULT))

        # Full reversion period (typically 20 years)
        full_reversion_years = self._params.get('valuation_reversion_years', 20)

        # Calculate annual valuation change with dampening
        # If CAEY rises from 4% to 5% over 20 years, that's a price decline
        # CAEY = E/P, so P = E/CAEY
        # If CAEY goes from 4% to 5% (25% increase), P goes down by 20%
        # Annual effect = (fair/current)^(lambda/20) - 1
        # With lambda < 1, reversion is dampened (partial convergence)

        if current_caey.value > 0 and reversion_speed.value > 0:
            # Annual percentage change in CAEY (dampened by reversion_speed)
            caey_annual_change = (fair_caey.value / current_caey.value) ** (reversion_speed.value / full_reversion_years) - 1

            # Valuation return = negative of CAEY change
            # Higher CAEY = lower prices = negative valuation return
            valuation_annual = -caey_annual_change

            # Average over forecast horizon
            # Sum of annual valuation effects, accounting for compounding
            cumulative_valuation = 0.0
            caey = current_caey.value
            for year in range(forecast_horizon):
                caey_next = caey * (1 + caey_annual_change)
                year_valuation = caey / caey_next - 1  # Price change
                cumulative_valuation += year_valuation
                caey = caey_next

            avg_valuation = cumulative_valuation / forecast_horizon
        else:
            avg_valuation = 0.0
            caey_annual_change = 0.0

        return {
            'valuation_change': TrackedValue(avg_valuation, InputSource.COMPUTED),
            'current_caey': current_caey,
            'fair_caey': fair_caey,
            'reversion_speed': reversion_speed,
            'caey_annual_change': TrackedValue(caey_annual_change, InputSource.COMPUTED),
            'full_reversion_years': TrackedValue(full_reversion_years, InputSource.DEFAULT),
        }

    def compute_return(
        self,
        region: EquityRegion,
        inflation_forecast: float,
        global_rgdp_growth: Optional[float] = None,
        forecast_horizon: int = 10
    ) -> EquityForecast:
        """
        Compute complete equity return forecast.

        Parameters
        ----------
        region : EquityRegion
            The equity region.
        inflation_forecast : float
            Expected inflation rate.
        global_rgdp_growth : float, optional
            Global real GDP growth for EPS cap.
        forecast_horizon : int
            Years for forecast.

        Returns
        -------
        EquityForecast
            Complete forecast with components.
        """
        # Dividend yield
        div_result = self.forecast_dividend_yield(region)
        dividend_yield = div_result['dividend_yield'].value

        # EPS growth
        eps_result = self.forecast_eps_growth(region, global_rgdp_growth)
        real_eps_growth = eps_result['real_eps_growth'].value

        # Valuation change
        val_result = self.forecast_valuation_change(region, forecast_horizon)
        valuation_change = val_result['valuation_change'].value

        # Total real return
        expected_return_real = dividend_yield + real_eps_growth + valuation_change

        # Nominal return (add inflation)
        expected_return_nominal = expected_return_real + inflation_forecast

        # Combine components
        components = {
            'dividend': extract_values(div_result),
            'eps': extract_values(eps_result),
            'valuation': extract_values(val_result),
        }

        # Track sources
        sources = {}
        for prefix, result in [('dividend', div_result), ('eps', eps_result), ('valuation', val_result)]:
            for key, tv in result.items():
                sources[f"{prefix}.{key}"] = tv.source.value

        return EquityForecast(
            expected_return_nominal=expected_return_nominal,
            expected_return_real=expected_return_real,
            dividend_yield=dividend_yield,
            real_eps_growth=real_eps_growth,
            valuation_change=valuation_change,
            inflation=inflation_forecast,
            components=components,
            sources=sources,
        )

    def compute_all_regions(
        self,
        inflation_forecasts: Dict[str, float],
        global_rgdp_growth: Optional[float] = None,
        forecast_horizon: int = 10
    ) -> Dict[EquityRegion, EquityForecast]:
        """
        Compute returns for all equity regions.

        Parameters
        ----------
        inflation_forecasts : dict
            Inflation forecasts by region name.
        global_rgdp_growth : float, optional
            Global real GDP growth for EPS cap.
        forecast_horizon : int
            Years for forecast.

        Returns
        -------
        dict
            Forecasts for each region.
        """
        results = {}

        for region in EquityRegion:
            # Get appropriate inflation (use US as fallback)
            region_inflation = inflation_forecasts.get(
                region.value,
                inflation_forecasts.get('us', 0.025)
            )

            results[region] = self.compute_return(
                region,
                region_inflation,
                global_rgdp_growth,
                forecast_horizon
            )

        return results


def compute_regional_average_eps(
    equity_model: EquityModel,
    regions: list,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """
    Compute market-cap weighted regional average EPS growth.

    Parameters
    ----------
    equity_model : EquityModel
        The equity model.
    regions : list
        List of EquityRegion values.
    weights : dict, optional
        Market cap weights by region. Defaults to equal weight.

    Returns
    -------
    float
        Regional average EPS growth.
    """
    if weights is None:
        weights = {r.value: 1.0 / len(regions) for r in regions}

    total_weight = sum(weights.get(r.value, 0) for r in regions)
    avg_eps = 0.0

    for region in regions:
        inputs = equity_model.get_inputs(region)
        eps = inputs.get('real_eps_growth', TrackedValue(0.015, InputSource.DEFAULT)).value
        weight = weights.get(region.value, 0) / total_weight
        avg_eps += weight * eps

    return avg_eps


# =============================================================================
# Grinold-Kroner Equity Model
# =============================================================================

@dataclass
class EquityForecastGK:
    """Container for Grinold-Kroner equity return forecasts."""
    expected_return_nominal: float
    expected_return_real: float  # back-computed: nominal - inflation

    # Component breakdown (all nominal)
    dividend_yield: float
    net_buyback_yield: float
    revenue_growth: float
    margin_change: float
    valuation_change: float

    # Inflation used for real-return back-computation
    inflation: float

    # Whether revenue growth was auto-computed from macro or directly overridden
    revenue_growth_is_computed: bool

    # Full component details
    components: Dict[str, Any]
    sources: Dict[str, str]


class EquityModelGK:
    """
    Grinold-Kroner equity return model.

    E[Nominal Return] = Dividend Yield + Net Buyback Yield + Revenue Growth
                        + Margin Change + Valuation Change (P/E)

    Revenue growth is nominal (inflation embedded) and auto-computed from
    macro forecasts when the user has not overridden it directly:
      Revenue Growth = Regional Inflation + Regional GDP + Revenue-GDP Wedge

    Valuation change uses forward P/E reversion:
      Valuation Change = (target_pe / current_pe)^(1/horizon) - 1
    """

    REGION_TO_ASSET = {
        EquityRegion.US: AssetClass.EQUITY_US,
        EquityRegion.EUROPE: AssetClass.EQUITY_EUROPE,
        EquityRegion.JAPAN: AssetClass.EQUITY_JAPAN,
        EquityRegion.EM: AssetClass.EQUITY_EM,
    }

    def __init__(self, override_manager: OverrideManager):
        self.overrides = override_manager

    def get_inputs(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """Get GK inputs for a specific equity region."""
        asset_class = self.REGION_TO_ASSET[region]
        return self.overrides.get_asset_inputs(asset_class)

    # ----- Component methods -----

    def forecast_dividend_yield(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """Current trailing dividend yield (no mean reversion)."""
        inputs = self.get_inputs(region)
        dividend_yield = inputs.get('dividend_yield', TrackedValue(0.02, InputSource.DEFAULT))
        return {
            'dividend_yield': dividend_yield,
        }

    def forecast_buyback_yield(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """
        Net buyback yield = gross buybacks - dilution from issuance.

        Positive for US (~1.5%), negative for EM (~-1.5%).
        """
        inputs = self.get_inputs(region)
        net_buyback_yield = inputs.get(
            'net_buyback_yield', TrackedValue(0.0, InputSource.DEFAULT)
        )
        return {
            'net_buyback_yield': net_buyback_yield,
        }

    def forecast_revenue_growth(
        self,
        region: EquityRegion,
        macro_inflation: float,
        macro_rgdp: float,
    ) -> Dict[str, TrackedValue]:
        """
        Forecast nominal revenue growth.

        Auto-computed from macro when not directly overridden:
          revenue_growth = inflation + real_gdp + revenue_gdp_wedge

        If the user has explicitly set revenue_growth as an override,
        we use that value directly and mark it as such.
        """
        inputs = self.get_inputs(region)

        wedge = inputs.get(
            'revenue_gdp_wedge', TrackedValue(0.0, InputSource.DEFAULT)
        )

        # Check if revenue_growth was directly overridden by the user
        revenue_growth_input = inputs.get('revenue_growth')

        if revenue_growth_input is not None and revenue_growth_input.source == InputSource.OVERRIDE:
            # User explicitly set revenue growth — use it, break macro link
            computed_value = macro_inflation + macro_rgdp + wedge.value
            return {
                'revenue_growth': revenue_growth_input,
                'revenue_growth_computed': TrackedValue(computed_value, InputSource.COMPUTED),
                'revenue_gdp_wedge': wedge,
                'macro_inflation': TrackedValue(macro_inflation, InputSource.COMPUTED),
                'macro_rgdp': TrackedValue(macro_rgdp, InputSource.COMPUTED),
                'is_computed': TrackedValue(False, InputSource.COMPUTED),
            }
        else:
            # Auto-compute from macro
            computed_value = macro_inflation + macro_rgdp + wedge.value
            return {
                'revenue_growth': TrackedValue(computed_value, InputSource.COMPUTED),
                'revenue_growth_computed': TrackedValue(computed_value, InputSource.COMPUTED),
                'revenue_gdp_wedge': wedge,
                'macro_inflation': TrackedValue(macro_inflation, InputSource.COMPUTED),
                'macro_rgdp': TrackedValue(macro_rgdp, InputSource.COMPUTED),
                'is_computed': TrackedValue(True, InputSource.COMPUTED),
            }

    def forecast_margin_change(self, region: EquityRegion) -> Dict[str, TrackedValue]:
        """
        Annual profit margin change.

        Positive = margin expansion (e.g., Japan corp reform).
        Negative = margin compression (e.g., US from peak).
        """
        inputs = self.get_inputs(region)
        margin_change = inputs.get(
            'margin_change', TrackedValue(0.0, InputSource.DEFAULT)
        )
        return {
            'margin_change': margin_change,
        }

    def forecast_valuation_change(
        self,
        region: EquityRegion,
        forecast_horizon: int = 10,
    ) -> Dict[str, TrackedValue]:
        """
        Valuation change from P/E mean reversion.

        valuation_change = (target_pe / current_pe)^(1/horizon) - 1

        This is a much smaller term than the CAEY-based RA model because
        P/E changes are moderate (22→20 = ~-1%) compared to CAEY changes
        (2.5%→5% = potentially -3 to -5%).
        """
        inputs = self.get_inputs(region)

        current_pe = inputs.get('current_pe', TrackedValue(20.0, InputSource.DEFAULT))
        target_pe = inputs.get('target_pe', TrackedValue(20.0, InputSource.DEFAULT))

        if current_pe.value > 0 and target_pe.value > 0:
            # Annualized P/E change
            valuation_annual = (
                (target_pe.value / current_pe.value) ** (1.0 / forecast_horizon) - 1
            )
        else:
            valuation_annual = 0.0

        return {
            'valuation_change': TrackedValue(valuation_annual, InputSource.COMPUTED),
            'current_pe': current_pe,
            'target_pe': target_pe,
            'forecast_horizon': TrackedValue(forecast_horizon, InputSource.DEFAULT),
        }

    # ----- Main computation -----

    def compute_return(
        self,
        region: EquityRegion,
        macro_inflation: float,
        macro_rgdp: float,
        forecast_horizon: int = 10,
    ) -> EquityForecastGK:
        """
        Compute complete GK equity return forecast.

        Parameters
        ----------
        region : EquityRegion
            The equity region.
        macro_inflation : float
            Regional inflation forecast from macro model.
        macro_rgdp : float
            Regional real GDP growth from macro model.
        forecast_horizon : int
            Forecast horizon in years.

        Returns
        -------
        EquityForecastGK
            Complete forecast with components.
        """
        # 1. Dividend yield (income)
        div_result = self.forecast_dividend_yield(region)
        dividend_yield = div_result['dividend_yield'].value

        # 2. Net buyback yield (income)
        buyback_result = self.forecast_buyback_yield(region)
        net_buyback_yield = buyback_result['net_buyback_yield'].value

        # 3. Revenue growth (growth — linked to macro)
        rev_result = self.forecast_revenue_growth(region, macro_inflation, macro_rgdp)
        revenue_growth = rev_result['revenue_growth'].value
        is_computed = rev_result['is_computed'].value

        # 4. Margin change (growth)
        margin_result = self.forecast_margin_change(region)
        margin_change = margin_result['margin_change'].value

        # 5. Valuation change (repricing)
        val_result = self.forecast_valuation_change(region, forecast_horizon)
        valuation_change = val_result['valuation_change'].value

        # Total nominal return
        expected_return_nominal = (
            dividend_yield
            + net_buyback_yield
            + revenue_growth
            + margin_change
            + valuation_change
        )

        # Back-compute real return for display consistency
        expected_return_real = expected_return_nominal - macro_inflation

        # Combine components
        components = {
            'dividend': extract_values(div_result),
            'buyback': extract_values(buyback_result),
            'revenue': extract_values(rev_result),
            'margin': extract_values(margin_result),
            'valuation': extract_values(val_result),
        }

        # Track sources
        sources = {}
        for prefix, result in [
            ('dividend', div_result),
            ('buyback', buyback_result),
            ('revenue', rev_result),
            ('margin', margin_result),
            ('valuation', val_result),
        ]:
            for key, tv in result.items():
                sources[f"{prefix}.{key}"] = tv.source.value

        return EquityForecastGK(
            expected_return_nominal=expected_return_nominal,
            expected_return_real=expected_return_real,
            dividend_yield=dividend_yield,
            net_buyback_yield=net_buyback_yield,
            revenue_growth=revenue_growth,
            margin_change=margin_change,
            valuation_change=valuation_change,
            inflation=macro_inflation,
            revenue_growth_is_computed=is_computed,
            components=components,
            sources=sources,
        )
