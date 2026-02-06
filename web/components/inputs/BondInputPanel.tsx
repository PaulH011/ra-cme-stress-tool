'use client';

import { useInputStore } from '@/stores/inputStore';
import { DEFAULT_INPUTS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { BondType, BondInputs } from '@/lib/types';

const BOND_TYPES: { key: BondType; label: string; description: string }[] = [
  { key: 'global', label: 'Global Gov', description: 'Developed market government bonds' },
  { key: 'hy', label: 'High Yield', description: 'US high yield corporate bonds' },
  { key: 'em', label: 'EM Hard', description: 'EM USD-denominated sovereign bonds' },
];

function BondTypeInputs({ bondType }: { bondType: BondType }) {
  const { bonds, setBondValue, advancedMode } = useInputStore();
  const inputs = bonds[bondType];
  const defaults = DEFAULT_INPUTS.bonds[bondType];

  const handleChange = (key: keyof BondInputs, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setBondValue(bondType, key, numValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Inputs */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700">Primary Inputs</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Yield (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={inputs.current_yield}
              onChange={(e) => handleChange('current_yield', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.current_yield}%</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Duration (years)</Label>
            <Input
              type="number"
              step="0.5"
              value={inputs.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-slate-400">Default: {defaults.duration} yrs</p>
          </div>
        </div>

        {/* Credit-specific inputs for HY and EM */}
        {(bondType === 'hy' || bondType === 'em') && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={inputs.default_rate ?? defaults.default_rate}
                onChange={(e) => handleChange('default_rate', e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-slate-400">Default: {defaults.default_rate}%</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Recovery Rate (%)</Label>
              <Input
                type="number"
                step="1"
                value={inputs.recovery_rate ?? defaults.recovery_rate}
                onChange={(e) => handleChange('recovery_rate', e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-slate-400">Default: {defaults.recovery_rate}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Building Blocks */}
      {advancedMode && (
        <>
          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Building Blocks</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Term Premium (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputs.current_term_premium ?? defaults.current_term_premium}
                  onChange={(e) => handleChange('current_term_premium', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fair Term Premium (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputs.fair_term_premium ?? defaults.fair_term_premium}
                  onChange={(e) => handleChange('fair_term_premium', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Credit spread inputs for HY */}
            {bondType === 'hy' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Credit Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={inputs.credit_spread ?? defaults.credit_spread}
                    onChange={(e) => handleChange('credit_spread', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fair Credit Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={inputs.fair_credit_spread ?? defaults.fair_credit_spread}
                    onChange={(e) => handleChange('fair_credit_spread', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function BondInputPanel() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {BOND_TYPES.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {BOND_TYPES.map(({ key, description }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <p className="text-xs text-slate-500 mb-3">{description}</p>
            <BondTypeInputs bondType={key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
