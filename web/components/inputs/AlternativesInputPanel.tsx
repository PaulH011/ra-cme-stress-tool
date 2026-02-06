'use client';

import { useInputStore } from '@/stores/inputStore';
import { DEFAULT_INPUTS } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { AbsoluteReturnInputs } from '@/lib/types';

export function AlternativesInputPanel() {
  const { absoluteReturn, setAbsoluteReturnValue } = useInputStore();
  const defaults = DEFAULT_INPUTS.absolute_return;

  const handleChange = (key: keyof AbsoluteReturnInputs, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setAbsoluteReturnValue(key, numValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Trading Alpha */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700">Absolute Return (Hedge Funds)</h4>
        <p className="text-xs text-slate-500">
          E[Return] = T-Bill + Σ(β × Factor Premium) + Trading Alpha
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Trading Alpha (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={absoluteReturn.trading_alpha}
            onChange={(e) => handleChange('trading_alpha', e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-xs text-slate-400">
            Default: {defaults.trading_alpha}% (50% of historical ~2%)
          </p>
        </div>
      </div>

      <Separator />

      {/* Factor Betas */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700">Factor Betas</h4>
        <p className="text-xs text-slate-500">
          Exposures to Fama-French factors
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Market β</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_market}
              onChange={(e) => handleChange('beta_market', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_market}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Size β (SMB)</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_size}
              onChange={(e) => handleChange('beta_size', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_size}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Value β (HML)</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_value}
              onChange={(e) => handleChange('beta_value', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_value}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Profitability β (RMW)</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_profitability}
              onChange={(e) => handleChange('beta_profitability', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_profitability}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Investment β (CMA)</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_investment}
              onChange={(e) => handleChange('beta_investment', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_investment}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Momentum β (UMD)</Label>
            <Input
              type="number"
              step="0.05"
              value={absoluteReturn.beta_momentum}
              onChange={(e) => handleChange('beta_momentum', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.beta_momentum}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
