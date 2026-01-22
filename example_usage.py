"""
Example usage of the RA CME Stress Testing Tool.

This script demonstrates various ways to use the tool:
1. Computing returns with RA default assumptions
2. Applying custom overrides
3. Running stress scenarios
4. Comparing base vs stressed results
"""

from ra_stress_tool.main import CMEEngine, run_stress_test, quick_cme
from ra_stress_tool.output import format_results_table, format_comparison_table


def example_1_default_assumptions():
    """Example 1: Compute CME with RA default assumptions."""
    print("\n" + "=" * 80)
    print("EXAMPLE 1: RA Default Assumptions")
    print("=" * 80)

    # Quick way to get results
    results = quick_cme(print_results=True)

    return results


def example_2_custom_overrides():
    """Example 2: Apply custom overrides to specific inputs."""
    print("\n" + "=" * 80)
    print("EXAMPLE 2: Custom Overrides")
    print("=" * 80)

    # Define custom overrides
    overrides = {
        # Override US inflation to 4%
        'macro': {
            'us': {
                'inflation_forecast': 0.04,  # 4% inflation
            }
        },
        # Override high yield default rate
        'bonds_hy': {
            'default_rate': 0.07,  # 7% default rate
            'recovery_rate': 0.35,  # 35% recovery
        },
        # Override US equity valuations
        'equity_us': {
            'current_caey': 0.04,  # CAPE of 25
            'fair_caey': 0.05,      # Fair CAPE of 20
        }
    }

    engine = CMEEngine(overrides)
    results = engine.compute_all_returns("Custom Scenario")
    print(format_results_table(results))

    return results


def example_3_stress_test_comparison():
    """Example 3: Compare base case vs stressed scenario."""
    print("\n" + "=" * 80)
    print("EXAMPLE 3: Stress Test Comparison")
    print("=" * 80)

    # Define stress scenario: Higher inflation + recession
    stress_overrides = {
        'macro': {
            'us': {
                'inflation_forecast': 0.045,  # 4.5% inflation
                'rgdp_growth': 0.005,         # 0.5% GDP growth
            },
            'eurozone': {
                'inflation_forecast': 0.04,
                'rgdp_growth': 0.0,           # 0% GDP growth
            },
        },
        'bonds_hy': {
            'default_rate': 0.08,             # 8% default rate
        },
    }

    base_results, stress_results, comparison = run_stress_test(
        base_overrides=None,
        stress_overrides=stress_overrides,
        base_name="RA Defaults",
        stress_name="Stagflation Scenario"
    )

    print(comparison)

    return base_results, stress_results


def example_4_individual_asset_classes():
    """Example 4: Access individual asset class calculations."""
    print("\n" + "=" * 80)
    print("EXAMPLE 4: Individual Asset Class Details")
    print("=" * 80)

    engine = CMEEngine()

    # Get macro forecasts
    print("\nMacro Forecasts:")
    print("-" * 40)
    macro = engine.compute_macro_forecasts()
    for region, data in macro.items():
        if region != 'global':
            print(f"\n{region.upper()}:")
            print(f"  Real GDP Growth: {data['rgdp_growth']:.2%}")
            print(f"  Inflation: {data['inflation']:.2%}")
            print(f"  T-Bill Rate: {data.get('tbill_rate', 'N/A')}")

    # Get specific asset class
    print("\n\nUS Equity Breakdown:")
    print("-" * 40)
    from ra_stress_tool.models.equities import EquityRegion
    equity_result = engine.compute_equity_return(EquityRegion.US)
    print(f"  Expected Return (Nominal): {equity_result.expected_return_nominal:.2%}")
    print(f"  Expected Return (Real): {equity_result.expected_return_real:.2%}")
    print(f"  Components:")
    for comp, value in equity_result.components.items():
        print(f"    - {comp}: {value:.2%}")


def example_5_programmatic_override():
    """Example 5: Programmatically set overrides."""
    print("\n" + "=" * 80)
    print("EXAMPLE 5: Programmatic Override Setting")
    print("=" * 80)

    engine = CMEEngine()

    # Set overrides programmatically
    engine.override_manager.set_override('macro.us.inflation_forecast', 0.035)
    engine.override_manager.set_override('equity_us.dividend_yield', 0.018)

    results = engine.compute_all_returns("Programmatic Overrides")
    print(format_results_table(results, show_components=False))

    # Show what was overridden
    print("\nOverrides Applied:")
    for path, (default, override) in engine.override_manager.compare_with_defaults().items():
        print(f"  {path}: {default} -> {override}")


def example_6_multiple_scenarios():
    """Example 6: Compare multiple scenarios."""
    print("\n" + "=" * 80)
    print("EXAMPLE 6: Multiple Scenario Comparison")
    print("=" * 80)

    scenarios = {
        'Base Case': None,
        'High Inflation': {
            'macro': {
                'us': {'inflation_forecast': 0.045},
                'eurozone': {'inflation_forecast': 0.04},
            }
        },
        'Low Growth': {
            'macro': {
                'us': {'rgdp_growth': 0.008},
                'eurozone': {'rgdp_growth': 0.003},
            }
        },
        'Equity Correction': {
            'equity_us': {'current_caey': 0.05},
            'equity_europe': {'current_caey': 0.06},
        }
    }

    # Compute all scenarios
    results = {}
    for name, overrides in scenarios.items():
        engine = CMEEngine(overrides)
        results[name] = engine.compute_all_returns(name)

    # Print summary table
    print("\nScenario Comparison (Nominal Returns):")
    print("-" * 90)

    # Header
    header = f"{'Asset Class':<25}"
    for name in scenarios.keys():
        header += f" {name:<15}"
    print(header)
    print("-" * 90)

    # Get asset classes from first result
    asset_classes = list(results['Base Case'].results.keys())

    for asset in asset_classes:
        row = f"{results['Base Case'].results[asset].asset_class:<25}"
        for name in scenarios.keys():
            ret = results[name].results[asset].expected_return_nominal
            row += f" {ret:>14.2%}"
        print(row)


if __name__ == '__main__':
    # Run all examples
    example_1_default_assumptions()
    example_2_custom_overrides()
    example_3_stress_test_comparison()
    example_4_individual_asset_classes()
    example_5_programmatic_override()
    example_6_multiple_scenarios()

    print("\n" + "=" * 80)
    print("All examples completed!")
    print("=" * 80)
