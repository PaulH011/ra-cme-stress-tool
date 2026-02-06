"""
Output formatting and reporting for CME results.

Provides formatted output comparing RA defaults with stressed scenarios.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import json


@dataclass
class MacroDependency:
    """Tracks how a macro input affects an asset calculation."""
    macro_input: str           # e.g., "us.inflation_forecast"
    value_used: float          # The actual value used in calculation
    source: str                # "default" | "override" | "computed" | "affected_by_override"
    affects: List[str]         # Which components this affects, e.g., ["expected_return_nominal"]
    impact_description: str    # Human-readable description of how it affects the calculation


@dataclass
class AssetClassResult:
    """Result for a single asset class."""
    asset_class: str
    expected_return_nominal: float
    expected_return_real: float
    components: Dict[str, float]
    inputs_used: Dict[str, Dict[str, Any]]
    macro_dependencies: Dict[str, MacroDependency] = field(default_factory=dict)


@dataclass
class CMEResults:
    """Complete CME results container."""
    scenario_name: str
    results: Dict[str, AssetClassResult]
    macro_assumptions: Dict[str, Any]
    overrides_applied: Dict[str, Any]
    base_currency: str = 'usd'
    fx_forecasts: Dict[str, Dict[str, float]] = None

    def __post_init__(self):
        if self.fx_forecasts is None:
            self.fx_forecasts = {}


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format a decimal as a percentage string."""
    return f"{value * 100:.{decimals}f}%"


def format_results_table(results: CMEResults, show_components: bool = True) -> str:
    """
    Format results as a text table.

    Parameters
    ----------
    results : CMEResults
        The CME results to format.
    show_components : bool
        Whether to show component breakdown.

    Returns
    -------
    str
        Formatted table string.
    """
    lines = []
    lines.append("=" * 80)
    lines.append(f"Capital Market Expectations: {results.scenario_name}")
    lines.append("=" * 80)
    lines.append("")

    # Header
    lines.append(f"{'Asset Class':<25} {'Nominal':<12} {'Real':<12}")
    lines.append("-" * 50)

    # Asset class results
    for name, result in results.results.items():
        nominal = format_percentage(result.expected_return_nominal)
        real = format_percentage(result.expected_return_real)
        lines.append(f"{result.asset_class:<25} {nominal:<12} {real:<12}")

        if show_components and result.components:
            for comp_name, comp_value in result.components.items():
                comp_str = format_percentage(comp_value)
                lines.append(f"  - {comp_name:<21} {comp_str}")

    lines.append("")
    lines.append("-" * 50)

    # Macro assumptions summary
    if results.macro_assumptions:
        lines.append("")
        lines.append("Macro Assumptions:")
        for region, data in results.macro_assumptions.items():
            if isinstance(data, dict):
                lines.append(f"  {region.upper()}:")
                for key, val in data.items():
                    if isinstance(val, float):
                        lines.append(f"    {key}: {format_percentage(val)}")
                    else:
                        lines.append(f"    {key}: {val}")

    # Overrides applied
    if results.overrides_applied:
        lines.append("")
        lines.append("Overrides Applied:")
        for path, value in results.overrides_applied.items():
            if isinstance(value, float):
                lines.append(f"  {path}: {format_percentage(value)}")
            else:
                lines.append(f"  {path}: {value}")

    lines.append("")
    lines.append("=" * 80)

    return "\n".join(lines)


def format_comparison_table(
    base_results: CMEResults,
    stressed_results: CMEResults
) -> str:
    """
    Format a comparison between base and stressed scenarios.

    Parameters
    ----------
    base_results : CMEResults
        Base case (RA defaults) results.
    stressed_results : CMEResults
        Stressed scenario results.

    Returns
    -------
    str
        Formatted comparison table.
    """
    lines = []
    lines.append("=" * 90)
    lines.append("Capital Market Expectations Comparison")
    lines.append(f"Base: {base_results.scenario_name} vs Stress: {stressed_results.scenario_name}")
    lines.append("=" * 90)
    lines.append("")

    # Header
    header = f"{'Asset Class':<25} {'Base Nom':<12} {'Stress Nom':<12} {'Diff':<10} {'Base Real':<12} {'Stress Real':<12}"
    lines.append(header)
    lines.append("-" * 90)

    # Results comparison
    for name in base_results.results.keys():
        base = base_results.results[name]
        stressed = stressed_results.results.get(name)

        if stressed is None:
            continue

        base_nom = format_percentage(base.expected_return_nominal)
        stress_nom = format_percentage(stressed.expected_return_nominal)
        diff_nom = stressed.expected_return_nominal - base.expected_return_nominal
        diff_str = format_percentage(diff_nom)
        if diff_nom > 0:
            diff_str = "+" + diff_str

        base_real = format_percentage(base.expected_return_real)
        stress_real = format_percentage(stressed.expected_return_real)

        lines.append(
            f"{base.asset_class:<25} {base_nom:<12} {stress_nom:<12} {diff_str:<10} "
            f"{base_real:<12} {stress_real:<12}"
        )

    lines.append("")
    lines.append("-" * 90)

    # Show overrides that caused the difference
    if stressed_results.overrides_applied:
        lines.append("")
        lines.append("Stress Scenario Overrides:")
        for path, value in stressed_results.overrides_applied.items():
            if isinstance(value, float):
                lines.append(f"  {path}: {format_percentage(value)}")
            else:
                lines.append(f"  {path}: {value}")

    lines.append("")
    lines.append("=" * 90)

    return "\n".join(lines)


def results_to_dict(results: CMEResults) -> Dict[str, Any]:
    """
    Convert results to a dictionary for JSON export.

    Parameters
    ----------
    results : CMEResults
        The CME results.

    Returns
    -------
    dict
        Dictionary representation.
    """
    return {
        'scenario_name': results.scenario_name,
        'results': {
            name: {
                'asset_class': r.asset_class,
                'expected_return_nominal': r.expected_return_nominal,
                'expected_return_real': r.expected_return_real,
                'components': r.components,
                'inputs_used': r.inputs_used,
                'macro_dependencies': {
                    key: {
                        'macro_input': dep.macro_input,
                        'value_used': dep.value_used,
                        'source': dep.source,
                        'affects': dep.affects,
                        'impact_description': dep.impact_description,
                    }
                    for key, dep in r.macro_dependencies.items()
                } if r.macro_dependencies else {},
            }
            for name, r in results.results.items()
        },
        'macro_assumptions': results.macro_assumptions,
        'overrides_applied': results.overrides_applied,
    }


def results_to_json(results: CMEResults, indent: int = 2) -> str:
    """
    Convert results to JSON string.

    Parameters
    ----------
    results : CMEResults
        The CME results.
    indent : int
        JSON indentation.

    Returns
    -------
    str
        JSON string.
    """
    return json.dumps(results_to_dict(results), indent=indent)


def create_summary_dataframe(results_list: List[CMEResults]) -> Dict[str, Dict[str, float]]:
    """
    Create a summary suitable for DataFrame conversion.

    Parameters
    ----------
    results_list : list
        List of CMEResults from different scenarios.

    Returns
    -------
    dict
        Dictionary with asset classes as rows and scenarios as columns.
    """
    summary = {}

    # Get all asset classes
    all_assets = set()
    for results in results_list:
        all_assets.update(results.results.keys())

    for asset in sorted(all_assets):
        summary[asset] = {}
        for results in results_list:
            if asset in results.results:
                r = results.results[asset]
                summary[asset][f"{results.scenario_name}_nominal"] = r.expected_return_nominal
                summary[asset][f"{results.scenario_name}_real"] = r.expected_return_real

    return summary


def format_input_sources(results: CMEResults) -> str:
    """
    Format a detailed view of input sources (default vs override).

    Parameters
    ----------
    results : CMEResults
        The CME results.

    Returns
    -------
    str
        Formatted input sources.
    """
    lines = []
    lines.append("Input Sources (D=Default, O=Override):")
    lines.append("-" * 60)

    for name, result in results.results.items():
        lines.append(f"\n{result.asset_class}:")
        for input_name, input_data in result.inputs_used.items():
            source = "O" if input_data.get('source') == 'override' else "D"
            value = input_data.get('value', 'N/A')
            if isinstance(value, float):
                value = format_percentage(value)
            lines.append(f"  [{source}] {input_name}: {value}")

    return "\n".join(lines)
