"""
Command-line interface for the RA CME Stress Testing Tool.

Usage:
    python -m ra_stress_tool.cli [options]
    python -m ra_stress_tool.cli --scenario inflation_shock
    python -m ra_stress_tool.cli --override "macro.us.inflation_forecast=0.04"
"""

import argparse
import json
import sys
from typing import Dict, Any, Optional

from .main import CMEEngine, run_stress_test, quick_cme
from .output import format_results_table, format_comparison_table, results_to_json


# Predefined stress scenarios
STRESS_SCENARIOS = {
    'inflation_shock': {
        'description': 'High inflation scenario (+2% across all regions)',
        'overrides': {
            'macro': {
                'us': {'inflation_forecast': 0.045},
                'eurozone': {'inflation_forecast': 0.040},
                'japan': {'inflation_forecast': 0.035},
                'em': {'inflation_forecast': 0.065},
            }
        }
    },
    'recession': {
        'description': 'Recession scenario (lower GDP, higher defaults)',
        'overrides': {
            'macro': {
                'us': {'rgdp_growth': 0.005, 'tbill_forecast': 0.02},
                'eurozone': {'rgdp_growth': 0.0},
                'japan': {'rgdp_growth': -0.005},
            },
            'bonds_hy': {
                'default_rate': 0.08,
                'recovery_rate': 0.35,
            }
        }
    },
    'equity_valuation_correction': {
        'description': 'Equity valuations correct to historical averages',
        'overrides': {
            'equity_us': {'current_caey': 0.05},  # CAPE of 20
            'equity_europe': {'current_caey': 0.06},
            'equity_japan': {'current_caey': 0.055},
            'equity_em': {'current_caey': 0.07},
        }
    },
    'rising_rates': {
        'description': 'Rising interest rate environment',
        'overrides': {
            'macro': {
                'us': {'current_tbill': 0.055},
                'eurozone': {'current_tbill': 0.045},
            },
            'bonds_global': {'fair_term_premium': 0.02},
        }
    },
    'em_stress': {
        'description': 'Emerging market stress scenario',
        'overrides': {
            'macro': {
                'em': {
                    'inflation_forecast': 0.06,
                    'rgdp_growth': 0.02,
                }
            },
            'bonds_em': {
                'default_rate': 0.01,
                'current_yield': 0.08,
            },
            'equity_em': {
                'dividend_yield': 0.04,
                'real_eps_growth': 0.02,
            }
        }
    }
}


def parse_override_string(override_str: str) -> Dict[str, Any]:
    """
    Parse an override string like 'macro.us.inflation_forecast=0.04'.

    Parameters
    ----------
    override_str : str
        Override string in format 'path.to.key=value'.

    Returns
    -------
    dict
        Nested override dictionary.
    """
    if '=' not in override_str:
        raise ValueError(f"Invalid override format: {override_str}. Expected 'key=value'.")

    path, value_str = override_str.split('=', 1)
    parts = path.split('.')

    # Try to parse value as number
    try:
        value = float(value_str)
    except ValueError:
        value = value_str

    # Build nested dict
    result = {}
    current = result
    for part in parts[:-1]:
        current[part] = {}
        current = current[part]
    current[parts[-1]] = value

    return result


def merge_dicts(base: Dict, updates: Dict) -> Dict:
    """Recursively merge updates into base."""
    result = base.copy()
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


def list_scenarios():
    """Print available stress scenarios."""
    print("\nAvailable Stress Scenarios:")
    print("=" * 60)
    for name, scenario in STRESS_SCENARIOS.items():
        print(f"\n  {name}:")
        print(f"    {scenario['description']}")
    print()


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Research Affiliates CME Stress Testing Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with RA defaults
  python -m ra_stress_tool.cli

  # Run a predefined stress scenario
  python -m ra_stress_tool.cli --scenario inflation_shock

  # Apply custom overrides
  python -m ra_stress_tool.cli --override "macro.us.inflation_forecast=0.04"

  # Compare base vs stressed
  python -m ra_stress_tool.cli --compare --scenario recession

  # Output as JSON
  python -m ra_stress_tool.cli --json

  # List available scenarios
  python -m ra_stress_tool.cli --list-scenarios
        """
    )

    parser.add_argument(
        '--scenario', '-s',
        help='Predefined stress scenario to run',
        choices=list(STRESS_SCENARIOS.keys()),
    )

    parser.add_argument(
        '--override', '-o',
        action='append',
        help='Custom override (format: path.to.key=value). Can be used multiple times.',
    )

    parser.add_argument(
        '--compare', '-c',
        action='store_true',
        help='Compare stressed scenario with base case',
    )

    parser.add_argument(
        '--json', '-j',
        action='store_true',
        help='Output results as JSON',
    )

    parser.add_argument(
        '--no-components',
        action='store_true',
        help='Hide component breakdown in output',
    )

    parser.add_argument(
        '--list-scenarios',
        action='store_true',
        help='List available predefined scenarios',
    )

    parser.add_argument(
        '--name', '-n',
        default=None,
        help='Custom name for the scenario',
    )

    args = parser.parse_args()

    # List scenarios if requested
    if args.list_scenarios:
        list_scenarios()
        return

    # Build overrides
    overrides = {}

    # Apply predefined scenario
    if args.scenario:
        scenario = STRESS_SCENARIOS[args.scenario]
        overrides = merge_dicts(overrides, scenario['overrides'])
        scenario_name = args.name or f"Scenario: {args.scenario}"
    else:
        scenario_name = args.name or "Custom" if args.override else "RA Defaults"

    # Apply custom overrides
    if args.override:
        for override_str in args.override:
            try:
                override_dict = parse_override_string(override_str)
                overrides = merge_dicts(overrides, override_dict)
            except ValueError as e:
                print(f"Error parsing override: {e}", file=sys.stderr)
                return 1

    # Run calculation
    if args.compare:
        # Compare base vs stressed
        base_results, stress_results, comparison = run_stress_test(
            base_overrides=None,
            stress_overrides=overrides if overrides else None,
            base_name="RA Defaults",
            stress_name=scenario_name,
        )

        if args.json:
            output = {
                'base': {
                    'scenario': base_results.scenario_name,
                    'results': {k: {'nominal': v.expected_return_nominal, 'real': v.expected_return_real}
                               for k, v in base_results.results.items()}
                },
                'stressed': {
                    'scenario': stress_results.scenario_name,
                    'results': {k: {'nominal': v.expected_return_nominal, 'real': v.expected_return_real}
                               for k, v in stress_results.results.items()}
                }
            }
            print(json.dumps(output, indent=2))
        else:
            print(comparison)
    else:
        # Single scenario
        engine = CMEEngine(overrides if overrides else None)
        results = engine.compute_all_returns(scenario_name)

        if args.json:
            print(results_to_json(results))
        else:
            print(format_results_table(results, show_components=not args.no_components))


if __name__ == '__main__':
    sys.exit(main() or 0)
