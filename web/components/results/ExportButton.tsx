'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { ASSET_DISPLAY_INFO } from '@/lib/types';
import type { CalculateResponse } from '@/lib/types';
import { toast } from 'sonner';

interface ExportButtonProps {
  results: CalculateResponse | null;
  baseResults: CalculateResponse | null;
}

export function ExportButton({ results, baseResults }: ExportButtonProps) {
  const exportToCSV = () => {
    if (!results) {
      toast.error('No results to export');
      return;
    }

    const headers = ['Asset Class', 'Nominal Return (%)', 'Real Return (%)', 'Volatility (%)', 'vs Default (%)'];
    const rows = ASSET_DISPLAY_INFO.map((asset) => {
      const result = results.results[asset.key];
      const baseResult = baseResults?.results[asset.key];
      if (!result) return null;

      const diff = baseResult
        ? (result.expected_return_nominal - baseResult.expected_return_nominal) * 100
        : 0;

      return [
        asset.name,
        (result.expected_return_nominal * 100).toFixed(2),
        (result.expected_return_real * 100).toFixed(2),
        (asset.volatility * 100).toFixed(1),
        diff.toFixed(2),
      ].join(',');
    }).filter(Boolean);

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cma_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Exported to CSV');
  };

  const exportToJSON = () => {
    if (!results) {
      toast.error('No results to export');
      return;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      baseCurrency: results.base_currency,
      macroForecasts: results.macro_forecasts,
      assetReturns: ASSET_DISPLAY_INFO.reduce((acc, asset) => {
        const result = results.results[asset.key];
        if (result) {
          acc[asset.key] = {
            name: asset.name,
            expectedReturnNominal: result.expected_return_nominal,
            expectedReturnReal: result.expected_return_real,
            expectedVolatility: asset.volatility,
            components: result.components,
          };
        }
        return acc;
      }, {} as Record<string, any>),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cma_results_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Exported to JSON');
  };

  const copyToClipboard = () => {
    if (!results) {
      toast.error('No results to copy');
      return;
    }

    const lines = ASSET_DISPLAY_INFO.map((asset) => {
      const result = results.results[asset.key];
      if (!result) return null;
      return `${asset.name}: ${(result.expected_return_nominal * 100).toFixed(2)}% nominal`;
    }).filter(Boolean);

    const text = `CMA Results (${results.base_currency.toUpperCase()} Base)\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text);

    toast.success('Copied to clipboard');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          <FileText className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
