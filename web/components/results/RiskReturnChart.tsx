'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts';
import { ASSET_DISPLAY_INFO } from '@/lib/types';
import type { CalculateResponse } from '@/lib/types';

interface RiskReturnChartProps {
  results: CalculateResponse | null;
  baseResults?: CalculateResponse | null;
  isLoading: boolean;
}

interface ChartPoint {
  name: string;
  icon: string;
  volatility: number;
  return: number;
  assetKey: string;
  isDefault: boolean;
  // For connecting lines
  defaultReturn?: number;
  currentReturn?: number;
}

export function RiskReturnChart({ results, baseResults, isLoading }: RiskReturnChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[350px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center h-[350px] text-slate-500">
        No results available
      </div>
    );
  }

  // Check if there are any differences from defaults
  const hasOverrides = useMemo(() => {
    if (!baseResults) return false;
    return ASSET_DISPLAY_INFO.some((asset) => {
      const current = results.results[asset.key];
      const base = baseResults.results[asset.key];
      if (!current || !base) return false;
      return Math.abs(current.expected_return_nominal - base.expected_return_nominal) > 0.0001;
    });
  }, [results, baseResults]);

  // Prepare current scenario data
  const currentData: ChartPoint[] = ASSET_DISPLAY_INFO.map((asset) => {
    const result = results.results[asset.key];
    if (!result) return null;
    return {
      name: asset.name,
      icon: asset.icon,
      volatility: asset.volatility * 100,
      return: result.expected_return_nominal * 100,
      assetKey: asset.key,
      isDefault: false,
    };
  }).filter(Boolean) as ChartPoint[];

  // Prepare default data (only if there are differences)
  const defaultData: ChartPoint[] = hasOverrides && baseResults
    ? ASSET_DISPLAY_INFO.map((asset) => {
        const result = baseResults.results[asset.key];
        if (!result) return null;
        return {
          name: asset.name,
          icon: asset.icon,
          volatility: asset.volatility * 100,
          return: result.expected_return_nominal * 100,
          assetKey: asset.key,
          isDefault: true,
        };
      }).filter(Boolean) as ChartPoint[]
    : [];

  // Prepare arrow lines connecting default to current for each asset
  const arrowLines = hasOverrides && baseResults
    ? ASSET_DISPLAY_INFO.map((asset) => {
        const current = results.results[asset.key];
        const base = baseResults.results[asset.key];
        if (!current || !base) return null;
        const diff = Math.abs(current.expected_return_nominal - base.expected_return_nominal);
        if (diff < 0.0001) return null; // No change
        return {
          name: asset.name,
          volatility: asset.volatility * 100,
          defaultReturn: base.expected_return_nominal * 100,
          currentReturn: current.expected_return_nominal * 100,
        };
      }).filter(Boolean)
    : [];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">
            {data.icon} {data.name}
            {data.isDefault && (
              <span className="ml-2 text-xs text-slate-400 font-normal">(Default)</span>
            )}
          </p>
          <p className="text-sm text-slate-600">
            Return: <span className="font-medium">{data.return.toFixed(2)}%</span>
          </p>
          <p className="text-sm text-slate-600">
            Volatility: <span className="font-medium">{data.volatility.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-slate-500">
            Sharpe: {(data.return / data.volatility).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom dot for current scenario
  const CurrentDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill="#1e3a5f"
          fontSize={10}
          fontWeight={500}
        >
          {payload.icon}
        </text>
      </g>
    );
  };

  // Custom dot for default (faded)
  const DefaultDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </g>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="volatility"
            name="Volatility"
            domain={[0, 'dataMax + 2']}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${Math.round(value)}%`}
            label={{
              value: 'Expected Volatility (%)',
              position: 'bottom',
              offset: 0,
              style: { fontSize: 12, fill: '#64748b' },
            }}
          />
          <YAxis
            type="number"
            dataKey="return"
            name="Return"
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${Math.round(value)}%`}
            label={{
              value: 'Expected Return (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#64748b' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference line at 0% return */}
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

          {/* Default dots (faded, shown when overrides exist) */}
          {hasOverrides && defaultData.length > 0 && (
            <Scatter
              name="RA Defaults"
              data={defaultData}
              shape={<DefaultDot />}
            />
          )}

          {/* Current scenario dots */}
          <Scatter
            name="Current Scenario"
            data={currentData}
            shape={<CurrentDot />}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Connecting lines (SVG overlay) */}
      {hasOverrides && arrowLines.length > 0 && (
        <div className="px-5 -mt-2">
          <svg width="0" height="0" className="absolute">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>
        </div>
      )}

      {/* Legend */}
      {hasOverrides && (
        <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border border-blue-700" />
            Current Scenario
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-200 border border-slate-400 border-dashed" />
            RA Defaults
          </span>
        </div>
      )}
    </div>
  );
}
