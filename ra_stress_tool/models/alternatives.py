"""
Alternative investment models - Diversified Hedge Funds.

E[HF Return] = E[T-Bill] + Σ(βᵢ × E[Factorᵢ]) + Trading Alpha
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass

from ..inputs.overrides import OverrideManager, TrackedValue, InputSource, extract_values
from ..config import AssetClass, HEDGE_FUND_PARAMS


@dataclass
class HedgeFundForecast:
    """Container for hedge fund return forecasts."""
    expected_return_nominal: float
    expected_return_real: float

    # Component breakdown
    tbill_component: float
    factor_return: float
    trading_alpha: float

    # Individual factor contributions
    factor_contributions: Dict[str, float]

    # Inflation used for real return
    inflation: float

    # Full component details
    components: Dict[str, Any]
    sources: Dict[str, str]


class HedgeFundModel:
    """
    Hedge fund return model using Fama-French factors.

    E[HF Return] = E[T-Bill] + Σ(βᵢ × E[Factorᵢ]) + Trading Alpha

    Factors:
    - Market (MKT-RF): Market risk premium
    - Size (SMB): Small minus Big
    - Value (HML): High minus Low book-to-market
    - Profitability (RMW): Robust minus Weak
    - Investment (CMA): Conservative minus Aggressive
    - Momentum (UMD): Up minus Down
    """

    # Factor names
    FACTORS = ['market', 'size', 'value', 'profitability', 'investment', 'momentum']

    def __init__(self, override_manager: OverrideManager):
        """
        Initialize hedge fund model.

        Parameters
        ----------
        override_manager : OverrideManager
            Manager for handling input overrides.
        """
        self.overrides = override_manager
        self._params = HEDGE_FUND_PARAMS.copy()

    def get_inputs(self) -> Dict[str, TrackedValue]:
        """Get inputs for hedge fund model."""
        return self.overrides.get_asset_inputs(AssetClass.ABSOLUTE_RETURN)

    def get_factor_betas(self) -> Dict[str, TrackedValue]:
        """
        Get factor exposures (betas) for the hedge fund.

        Returns
        -------
        dict
            Factor betas as TrackedValue objects.
        """
        inputs = self.get_inputs()
        default_betas = self._params.get('factor_exposures', {})

        betas = {}
        for factor in self.FACTORS:
            key = f'beta_{factor}'
            default_val = default_betas.get(factor, 0.0)
            betas[factor] = inputs.get(key, TrackedValue(default_val, InputSource.DEFAULT))

        return betas

    def get_factor_premia(
        self,
        equity_return: Optional[float] = None,
        tbill_rate: Optional[float] = None
    ) -> Dict[str, TrackedValue]:
        """
        Get expected factor risk premia.

        Parameters
        ----------
        equity_return : float, optional
            Expected US equity return (for market premium calculation).
        tbill_rate : float, optional
            Expected T-Bill rate (for market premium calculation).

        Returns
        -------
        dict
            Factor premia as TrackedValue objects.
        """
        historical = self._params.get('historical_factor_premia', {})
        discount = self._params.get('historical_discount', 0.5)

        premia = {}

        # Market premium: use equity return - T-Bill if available
        if equity_return is not None and tbill_rate is not None:
            market_premium = equity_return - tbill_rate
            premia['market'] = TrackedValue(market_premium, InputSource.COMPUTED)
        else:
            premia['market'] = TrackedValue(historical.get('market', 0.05), InputSource.DEFAULT)

        # Other factors: use discounted historical
        for factor in self.FACTORS[1:]:  # Skip market
            hist_premium = historical.get(factor, 0.02)
            # Apply discount to historical for forward-looking estimate
            expected_premium = hist_premium * discount
            premia[factor] = TrackedValue(expected_premium, InputSource.DEFAULT)

        return premia

    def get_trading_alpha(self) -> TrackedValue:
        """
        Get expected trading alpha.

        Trading alpha represents manager skill beyond factor exposures.
        RA typically uses 50% of historical alpha.

        Returns
        -------
        TrackedValue
            Expected trading alpha.
        """
        inputs = self.get_inputs()
        default_alpha = self._params.get('historical_discount', 0.5) * 0.02  # 50% of 2%

        return inputs.get('trading_alpha', TrackedValue(default_alpha, InputSource.DEFAULT))

    def compute_factor_return(
        self,
        equity_return: Optional[float] = None,
        tbill_rate: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compute total factor return contribution.

        Parameters
        ----------
        equity_return : float, optional
            Expected US equity return.
        tbill_rate : float, optional
            Expected T-Bill rate.

        Returns
        -------
        dict
            Factor return breakdown.
        """
        betas = self.get_factor_betas()
        premia = self.get_factor_premia(equity_return, tbill_rate)

        contributions = {}
        total_factor_return = 0.0

        for factor in self.FACTORS:
            beta = betas[factor].value
            premium = premia[factor].value
            contribution = beta * premium

            contributions[factor] = {
                'beta': beta,
                'premium': premium,
                'contribution': contribution,
            }
            total_factor_return += contribution

        return {
            'total_factor_return': total_factor_return,
            'contributions': contributions,
            'betas': {f: b.value for f, b in betas.items()},
            'premia': {f: p.value for f, p in premia.items()},
        }

    def compute_return(
        self,
        tbill_forecast: float,
        inflation_forecast: float,
        equity_return: Optional[float] = None
    ) -> HedgeFundForecast:
        """
        Compute complete hedge fund return forecast.

        Parameters
        ----------
        tbill_forecast : float
            Expected T-Bill rate.
        inflation_forecast : float
            Expected inflation rate.
        equity_return : float, optional
            Expected US equity return (for market premium).

        Returns
        -------
        HedgeFundForecast
            Complete forecast with components.
        """
        # Factor returns
        factor_result = self.compute_factor_return(equity_return, tbill_forecast)
        factor_return = factor_result['total_factor_return']

        # Trading alpha
        alpha = self.get_trading_alpha()

        # Total return
        expected_return_nominal = tbill_forecast + factor_return + alpha.value
        expected_return_real = expected_return_nominal - inflation_forecast

        # Component details
        components = {
            'tbill': {
                'forecast': tbill_forecast,
            },
            'factors': factor_result,
            'alpha': {
                'trading_alpha': alpha.value,
            },
        }

        # Track sources
        betas = self.get_factor_betas()
        premia = self.get_factor_premia(equity_return, tbill_forecast)

        sources = {
            'tbill': 'computed',
            'trading_alpha': alpha.source.value,
        }
        for factor in self.FACTORS:
            sources[f'beta_{factor}'] = betas[factor].source.value
            sources[f'premium_{factor}'] = premia[factor].source.value

        # Factor contributions for summary
        factor_contributions = {
            f: factor_result['contributions'][f]['contribution']
            for f in self.FACTORS
        }

        return HedgeFundForecast(
            expected_return_nominal=expected_return_nominal,
            expected_return_real=expected_return_real,
            tbill_component=tbill_forecast,
            factor_return=factor_return,
            trading_alpha=alpha.value,
            factor_contributions=factor_contributions,
            inflation=inflation_forecast,
            components=components,
            sources=sources,
        )


def create_custom_hedge_fund(
    override_manager: OverrideManager,
    custom_betas: Dict[str, float],
    custom_alpha: Optional[float] = None
) -> HedgeFundModel:
    """
    Create a hedge fund model with custom factor exposures.

    Parameters
    ----------
    override_manager : OverrideManager
        The override manager.
    custom_betas : dict
        Custom factor betas (e.g., {'market': 0.4, 'value': 0.1}).
    custom_alpha : float, optional
        Custom trading alpha.

    Returns
    -------
    HedgeFundModel
        Configured hedge fund model.
    """
    # Set beta overrides
    for factor, beta in custom_betas.items():
        override_manager.set_override(f'absolute_return.beta_{factor}', beta)

    if custom_alpha is not None:
        override_manager.set_override('absolute_return.trading_alpha', custom_alpha)

    return HedgeFundModel(override_manager)
