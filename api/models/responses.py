"""Pydantic response models for API endpoints."""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional


class MacroDependencyResponse(BaseModel):
    """Tracks how a macro input affects an asset calculation."""
    macro_input: str = Field(description="The macro input key, e.g., 'us.inflation_forecast'")
    value_used: float = Field(description="The actual value used in calculation")
    source: str = Field(description="Source: 'default', 'override', 'computed', or 'affected_by_override'")
    affects: List[str] = Field(description="Which components this affects")
    impact_description: str = Field(description="Human-readable description of impact")


class AssetResult(BaseModel):
    """Result for a single asset class."""
    expected_return_nominal: float
    expected_return_real: float
    components: Dict[str, float]
    inputs_used: Dict[str, Any]
    macro_dependencies: Dict[str, MacroDependencyResponse] = Field(
        default_factory=dict,
        description="Macro inputs that affect this asset's calculation"
    )


class CalculateResponse(BaseModel):
    """Response model for full CME calculation."""
    scenario_name: str
    base_currency: str
    results: Dict[str, AssetResult]
    macro_forecasts: Dict[str, Dict[str, float]]
    fx_forecasts: Optional[Dict[str, Dict[str, float]]] = Field(
        default=None,
        description="FX forecasts when base currency is EUR (carry + PPP components)"
    )


class MacroPreviewResponse(BaseModel):
    """Response model for macro preview calculation."""
    rgdp_growth: float = Field(description="Computed GDP growth (decimal)")
    inflation: float = Field(description="Computed inflation (decimal)")
    tbill: float = Field(description="Computed T-Bill rate (decimal)")
    intermediate: Dict[str, float] = Field(
        description="Intermediate calculation values for display"
    )


class MacroRegionDefaults(BaseModel):
    """Default values for a single macro region."""
    inflation_forecast: float
    rgdp_growth: float
    tbill_forecast: float
    population_growth: float
    productivity_growth: float
    my_ratio: float
    current_headline_inflation: float
    long_term_inflation: float
    current_tbill: float
    country_factor: float


class DefaultsResponse(BaseModel):
    """Response model for all default values."""
    macro: Dict[str, MacroRegionDefaults]
    bonds: Dict[str, Dict[str, float]]
    equity: Dict[str, Dict[str, float]]
    absolute_return: Dict[str, float]


class ScenarioResponse(BaseModel):
    """Response model for a saved scenario."""
    id: str
    name: str
    user_id: str
    overrides: Dict[str, Any]
    base_currency: str
    created_at: str
    updated_at: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "1.0.0"
