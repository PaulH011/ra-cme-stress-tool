"""
Inputs package for managing default assumptions and user overrides.
"""

from .defaults import DefaultInputs
from .overrides import OverrideManager

__all__ = ['DefaultInputs', 'OverrideManager']
