'use client';

import { ReactNode } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, TrendingUp, TrendingDown } from 'lucide-react';

interface BreakdownItem {
  label: string;
  value: number;
  isChanged: boolean;
}

interface ComputedPreviewTooltipProps {
  children: ReactNode;
  forecastType: 'gdp' | 'inflation' | 'tbill';
  currentValue: number; // percentage (e.g., 1.20)
  computedValue: number; // decimal (e.g., 0.012)
  breakdown: BreakdownItem[];
  hasConflict: boolean;
  hasChanges: boolean;
  onApplyComputed: () => void;
}

export function ComputedPreviewTooltip({
  children,
  forecastType,
  currentValue,
  computedValue,
  breakdown,
  hasConflict,
  hasChanges,
  onApplyComputed,
}: ComputedPreviewTooltipProps) {
  // Don't wrap if no changes to building blocks
  if (!hasChanges) {
    return <>{children}</>;
  }

  // Convert computed to percentage for display
  const computedPct = computedValue * 100;
  const delta = computedPct - currentValue;

  const forecastLabels = {
    gdp: 'E[Real GDP Growth]',
    inflation: 'E[Inflation]',
    tbill: 'E[T-Bill Rate]',
  };

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="relative">
          {children}
          {hasConflict && (
            <div className="absolute -right-1 -top-1 z-10">
              <Badge
                variant="outline"
                className="h-5 w-5 p-0 flex items-center justify-center bg-amber-100 border-amber-400"
              >
                <AlertTriangle className="h-3 w-3 text-amber-600" />
              </Badge>
            </div>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-80" side="right" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <span className="text-sm font-semibold text-slate-800">
              📊 Computed from Building Blocks
            </span>
          </div>

          {/* Comparison */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Your Override:</span>
              <span className="font-medium">{currentValue.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Computed:</span>
              <span
                className={`font-medium ${
                  hasConflict ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {computedPct.toFixed(2)}%
                {hasConflict && (
                  <span className="ml-1 text-xs">
                    {delta > 0 ? (
                      <span className="inline-flex items-center text-amber-600">
                        <TrendingUp className="h-3 w-3 mr-0.5" />+{delta.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-amber-600">
                        <TrendingDown className="h-3 w-3 mr-0.5" />{delta.toFixed(2)}%
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-50 rounded-md p-2.5 space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Calculation:</span>
            {breakdown.map((item, i) => (
              <div
                key={i}
                className={`flex justify-between text-xs ${
                  item.isChanged
                    ? 'text-blue-600 font-medium'
                    : 'text-slate-500'
                }`}
              >
                <span>{item.label}</span>
                <span>
                  {item.value >= 0 ? '+' : ''}
                  {(item.value * 100).toFixed(2)}%
                  {item.isChanged && (
                    <span className="ml-1 text-blue-500">●</span>
                  )}
                </span>
              </div>
            ))}
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>= {forecastLabels[forecastType]}</span>
                <span>{computedPct.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {hasConflict && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={onApplyComputed}
                className="flex-1 h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Use Computed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
              >
                Keep Override
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
