"""
Models package containing all asset class return models.
"""

from .macro import MacroModel
from .bonds import BondModel, GovernmentBondModel, HighYieldBondModel, EMBondModel
from .equities import EquityModel
from .alternatives import HedgeFundModel

__all__ = [
    'MacroModel',
    'BondModel',
    'GovernmentBondModel',
    'HighYieldBondModel',
    'EMBondModel',
    'EquityModel',
    'HedgeFundModel',
]
