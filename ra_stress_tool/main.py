"""
Main calculation engine for the RA CME Stress Testing Tool.

This module provides the primary interface for computing capital market
expectations across all asset classes, with support for user overrides.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass

from .inputs.overrides import OverrideManager, extract_values
from .models.macro import MacroModel, compute_global_rgdp_growth
from .models.bonds import GovernmentBondModel, HighYieldBondModel, EMBondModel
from .models.equities import EquityModel, EquityRegion
from .models.alternatives import HedgeFundModel
from .output import CMEResults, AssetClassResult, format_results_table, format_comparison_table
from .config import AssetClass


class CMEEngine:
    """
    Capital Market Expectations calculation engine.

    This is the main interface for computing expected returns across
    all supported asset classes. It coordinates the macro models with
    the individual asset class models.
    """

    # Asset class display names
    ASSET_NAMES = {
        AssetClass.LIQUIDITY: "Liquidity (Cash)",
        AssetClass.BONDS_GLOBAL: "Bonds Global (Gov)",
        AssetClass.BONDS_HY: "Bonds High Yield",
        AssetClass.BONDS_EM: "Bonds EM (Local)",
        AssetClass.EQUITY_US: "Equity US",
        AssetClass.EQUITY_EUROPE: "Equity Europe",
        AssetClass.EQUITY_JAPAN: "Equity Japan",
        AssetClass.EQUITY_EM: "Equity EM",
        AssetClass.ABSOLUTE_RETURN: "Absolute Return (HF)",
    }

    def __init__(self, overrides: Optional[Dict[str, Any]] = None):
        """
        Initialize the CME engine.

        Parameters
        ----------
        overrides : dict, optional
            User override dictionary. See OverrideManager for structure.
        """
        self.override_manager = OverrideManager(overrides)

        # Initialize models
        self.macro_model = MacroModel(self.override_manager)
        self.equity_model = EquityModel(self.override_manager)
        self.gov_bond_model = GovernmentBondModel(self.override_manager)
        self.hy_bond_model = HighYieldBondModel(self.override_manager)
        self.em_bond_model = EMBondModel(self.override_manager)
        self.hf_model = HedgeFundModel(self.override_manager)

        # Cache for computed macro values
        self._macro_cache: Dict[str, Any] = {}

    def set_overrides(self, overrides: Dict[str, Any]) -> None:
        """
        Set or update overrides.

        Parameters
        ----------
        overrides : dict
            Override dictionary to apply.
        """
        self.override_manager.set_overrides(overrides)
        self._macro_cache.clear()

    def clear_overrides(self) -> None:
        """Clear all overrides and reset to defaults."""
        self.override_manager.clear_overrides()
        self._macro_cache.clear()

    def compute_macro_forecasts(self) -> Dict[str, Any]:
        """
        Compute macro forecasts for all regions.

        Returns
        -------
        dict
            Macro forecasts by region.
        """
        if self._macro_cache:
            return self._macro_cache

        regions = ['us', 'eurozone', 'japan', 'em']
        forecasts = {}

        for region in regions:
            forecast = self.macro_model.compute_full_forecast(region)
            forecasts[region] = {
                'rgdp_growth': forecast.rgdp_growth,
                'inflation': forecast.inflation,
                'tbill_rate': forecast.tbill_rate,
                'nominal_gdp_growth': forecast.nominal_gdp_growth,
                'components': forecast.components,
            }

        # Compute global GDP growth
        global_rgdp = compute_global_rgdp_growth(self.macro_model)
        forecasts['global'] = {'rgdp_growth': global_rgdp}

        self._macro_cache = forecasts
        return forecasts

    def compute_liquidity_return(self) -> AssetClassResult:
        """
        Compute expected return for liquidity (cash/T-Bills).

        Returns
        -------
        AssetClassResult
            Liquidity return result.
        """
        macro = self.compute_macro_forecasts()
        us_macro = macro['us']

        nominal_return = us_macro['tbill_rate']
        real_return = nominal_return - us_macro['inflation']

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[AssetClass.LIQUIDITY],
            expected_return_nominal=nominal_return,
            expected_return_real=real_return,
            components={
                'tbill_rate': nominal_return,
            },
            inputs_used={
                'current_tbill': {'value': us_macro['components']['tbill'].get('current_tbill', nominal_return),
                                  'source': 'default'},
            },
        )

    def compute_bonds_global_return(self) -> AssetClassResult:
        """
        Compute expected return for global government bonds.

        Returns
        -------
        AssetClassResult
            Government bond return result.
        """
        macro = self.compute_macro_forecasts()

        # Use weighted average of DM T-Bill and inflation
        # Simplified: use US as proxy for global DM
        us_macro = macro['us']

        forecast = self.gov_bond_model.compute_return(
            tbill_forecast=us_macro['tbill_rate'],
            inflation_forecast=us_macro['inflation'],
        )

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[AssetClass.BONDS_GLOBAL],
            expected_return_nominal=forecast.expected_return_nominal,
            expected_return_real=forecast.expected_return_real,
            components={
                'yield': forecast.yield_component,
                'roll_return': forecast.roll_return,
                'valuation': forecast.valuation_return,
                'credit_loss': forecast.credit_loss,
            },
            inputs_used=self._extract_bond_inputs(forecast),
        )

    def compute_bonds_hy_return(self) -> AssetClassResult:
        """
        Compute expected return for high yield bonds.

        Returns
        -------
        AssetClassResult
            High yield bond return result.
        """
        macro = self.compute_macro_forecasts()
        us_macro = macro['us']

        forecast = self.hy_bond_model.compute_return(
            tbill_forecast=us_macro['tbill_rate'],
            inflation_forecast=us_macro['inflation'],
        )

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[AssetClass.BONDS_HY],
            expected_return_nominal=forecast.expected_return_nominal,
            expected_return_real=forecast.expected_return_real,
            components={
                'yield': forecast.yield_component,
                'roll_return': forecast.roll_return,
                'valuation': forecast.valuation_return,
                'credit_loss': forecast.credit_loss,
            },
            inputs_used=self._extract_bond_inputs(forecast),
        )

    def compute_bonds_em_return(self) -> AssetClassResult:
        """
        Compute expected return for EM local currency bonds.

        Returns
        -------
        AssetClassResult
            EM bond return result.
        """
        macro = self.compute_macro_forecasts()
        em_macro = macro['em']

        forecast = self.em_bond_model.compute_return(
            tbill_forecast=em_macro['tbill_rate'],
            inflation_forecast=em_macro['inflation'],
            em_tbill_forecast=em_macro['tbill_rate'],
        )

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[AssetClass.BONDS_EM],
            expected_return_nominal=forecast.expected_return_nominal,
            expected_return_real=forecast.expected_return_real,
            components={
                'yield': forecast.yield_component,
                'roll_return': forecast.roll_return,
                'valuation': forecast.valuation_return,
                'credit_loss': forecast.credit_loss,
            },
            inputs_used=self._extract_bond_inputs(forecast),
        )

    def compute_equity_return(self, region: EquityRegion) -> AssetClassResult:
        """
        Compute expected return for an equity region.

        Parameters
        ----------
        region : EquityRegion
            The equity region.

        Returns
        -------
        AssetClassResult
            Equity return result.
        """
        macro = self.compute_macro_forecasts()

        # Map equity region to macro region
        region_map = {
            EquityRegion.US: 'us',
            EquityRegion.EUROPE: 'eurozone',
            EquityRegion.JAPAN: 'japan',
            EquityRegion.EM: 'em',
        }

        macro_region = region_map[region]
        region_macro = macro[macro_region]
        global_rgdp = macro['global']['rgdp_growth']

        forecast = self.equity_model.compute_return(
            region=region,
            inflation_forecast=region_macro['inflation'],
            global_rgdp_growth=global_rgdp,
        )

        # Map region to asset class for naming
        region_to_asset = {
            EquityRegion.US: AssetClass.EQUITY_US,
            EquityRegion.EUROPE: AssetClass.EQUITY_EUROPE,
            EquityRegion.JAPAN: AssetClass.EQUITY_JAPAN,
            EquityRegion.EM: AssetClass.EQUITY_EM,
        }

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[region_to_asset[region]],
            expected_return_nominal=forecast.expected_return_nominal,
            expected_return_real=forecast.expected_return_real,
            components={
                'dividend_yield': forecast.dividend_yield,
                'real_eps_growth': forecast.real_eps_growth,
                'valuation_change': forecast.valuation_change,
            },
            inputs_used=self._extract_equity_inputs(forecast),
        )

    def compute_absolute_return(self) -> AssetClassResult:
        """
        Compute expected return for absolute return (hedge funds).

        Returns
        -------
        AssetClassResult
            Hedge fund return result.
        """
        macro = self.compute_macro_forecasts()
        us_macro = macro['us']

        # Get US equity return for market premium calculation
        equity_forecast = self.equity_model.compute_return(
            region=EquityRegion.US,
            inflation_forecast=us_macro['inflation'],
            global_rgdp_growth=macro['global']['rgdp_growth'],
        )

        forecast = self.hf_model.compute_return(
            tbill_forecast=us_macro['tbill_rate'],
            inflation_forecast=us_macro['inflation'],
            equity_return=equity_forecast.expected_return_nominal,
        )

        return AssetClassResult(
            asset_class=self.ASSET_NAMES[AssetClass.ABSOLUTE_RETURN],
            expected_return_nominal=forecast.expected_return_nominal,
            expected_return_real=forecast.expected_return_real,
            components={
                'tbill': forecast.tbill_component,
                'factor_return': forecast.factor_return,
                'trading_alpha': forecast.trading_alpha,
            },
            inputs_used=self._extract_hf_inputs(forecast),
        )

    def compute_all_returns(self, scenario_name: str = "Base Case") -> CMEResults:
        """
        Compute expected returns for all asset classes.

        Parameters
        ----------
        scenario_name : str
            Name for this scenario.

        Returns
        -------
        CMEResults
            Complete CME results.
        """
        results = {}

        # Liquidity
        results[AssetClass.LIQUIDITY.value] = self.compute_liquidity_return()

        # Bonds
        results[AssetClass.BONDS_GLOBAL.value] = self.compute_bonds_global_return()
        results[AssetClass.BONDS_HY.value] = self.compute_bonds_hy_return()
        results[AssetClass.BONDS_EM.value] = self.compute_bonds_em_return()

        # Equities
        for region in EquityRegion:
            region_to_asset = {
                EquityRegion.US: AssetClass.EQUITY_US,
                EquityRegion.EUROPE: AssetClass.EQUITY_EUROPE,
                EquityRegion.JAPAN: AssetClass.EQUITY_JAPAN,
                EquityRegion.EM: AssetClass.EQUITY_EM,
            }
            results[region_to_asset[region].value] = self.compute_equity_return(region)

        # Alternatives
        results[AssetClass.ABSOLUTE_RETURN.value] = self.compute_absolute_return()

        # Get macro assumptions
        macro = self.compute_macro_forecasts()
        macro_summary = {
            region: {
                'rgdp_growth': data['rgdp_growth'],
                'inflation': data['inflation'],
                'tbill_rate': data.get('tbill_rate', 'N/A'),
            }
            for region, data in macro.items()
            if region != 'global'
        }

        return CMEResults(
            scenario_name=scenario_name,
            results=results,
            macro_assumptions=macro_summary,
            overrides_applied=self.override_manager.get_overrides_summary(),
        )

    def _extract_bond_inputs(self, forecast) -> Dict[str, Dict[str, Any]]:
        """Extract input tracking from bond forecast."""
        inputs = {}
        for section, values in forecast.components.items():
            for key, value in values.items():
                source = forecast.sources.get(f"{section}.{key}", "computed")
                inputs[f"{section}_{key}"] = {'value': value, 'source': source}
        return inputs

    def _extract_equity_inputs(self, forecast) -> Dict[str, Dict[str, Any]]:
        """Extract input tracking from equity forecast."""
        inputs = {}
        for section, values in forecast.components.items():
            for key, value in values.items():
                source = forecast.sources.get(f"{section}.{key}", "computed")
                inputs[f"{section}_{key}"] = {'value': value, 'source': source}
        return inputs

    def _extract_hf_inputs(self, forecast) -> Dict[str, Dict[str, Any]]:
        """Extract input tracking from hedge fund forecast."""
        inputs = {
            'tbill_forecast': {'value': forecast.tbill_component, 'source': 'computed'},
            'trading_alpha': {'value': forecast.trading_alpha, 'source': forecast.sources.get('trading_alpha', 'default')},
        }
        for factor, contribution in forecast.factor_contributions.items():
            inputs[f'factor_{factor}'] = {'value': contribution, 'source': 'computed'}
        return inputs


def run_stress_test(
    base_overrides: Optional[Dict[str, Any]] = None,
    stress_overrides: Optional[Dict[str, Any]] = None,
    base_name: str = "RA Defaults",
    stress_name: str = "Stress Scenario"
) -> tuple:
    """
    Run a stress test comparing base case to stressed scenario.

    Parameters
    ----------
    base_overrides : dict, optional
        Overrides for base case (defaults to RA methodology).
    stress_overrides : dict, optional
        Overrides for stress scenario.
    base_name : str
        Name for base scenario.
    stress_name : str
        Name for stress scenario.

    Returns
    -------
    tuple
        (base_results, stress_results, comparison_text)
    """
    # Base case
    base_engine = CMEEngine(base_overrides)
    base_results = base_engine.compute_all_returns(base_name)

    # Stress case
    stress_engine = CMEEngine(stress_overrides)
    stress_results = stress_engine.compute_all_returns(stress_name)

    # Comparison
    comparison = format_comparison_table(base_results, stress_results)

    return base_results, stress_results, comparison


# Convenience function for quick calculations
def quick_cme(overrides: Optional[Dict[str, Any]] = None, print_results: bool = True) -> CMEResults:
    """
    Quick calculation of CME with optional overrides.

    Parameters
    ----------
    overrides : dict, optional
        Override dictionary.
    print_results : bool
        Whether to print formatted results.

    Returns
    -------
    CMEResults
        The computed results.
    """
    engine = CMEEngine(overrides)
    results = engine.compute_all_returns(
        "Custom Scenario" if overrides else "RA Defaults"
    )

    if print_results:
        print(format_results_table(results))

    return results
