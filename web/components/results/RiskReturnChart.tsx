'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ASSET_DISPLAY_INFO } from '@/lib/types';
import type { CalculateResponse } from '@/lib/types';

interface RiskReturnChartProps {
  results: CalculateResponse | null;
  isLoading: boolean;
}

export function RiskReturnChart({ results, isLoading }: RiskReturnChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500">
        No results available
      </div>
    );
  }

  // Prepare data for chart
  const data = ASSET_DISPLAY_INFO.map((asset) => {
    const result = results.results[asset.key];
    if (!result) return null;

    return {
      name: asset.name,
      icon: asset.icon,
      volatility: asset.volatility * 100,
      return: result.expected_return_nominal * 100,
    };
  }).filter(Boolean);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">
            {data.icon} {data.name}
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

  return (
    <ResponsiveContainer width="100%" height={300}>
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

        <Scatter
          data={data}
          fill="#3b82f6"
          stroke="#1e40af"
          strokeWidth={1}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
