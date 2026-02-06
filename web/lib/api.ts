/**
 * API client for the Parkview CMA backend
 */

import type {
  CalculateResponse,
  MacroPreviewResponse,
  Overrides,
  BaseCurrency,
  AllInputs,
  Scenario,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
  return fetchAPI('/health');
}

/**
 * Get all default values
 */
export async function getDefaults(): Promise<AllInputs> {
  return fetchAPI('/api/defaults/all');
}

/**
 * Get macro defaults for a specific region
 */
export async function getMacroDefaults(region: string): Promise<Record<string, number>> {
  return fetchAPI(`/api/defaults/macro/${region}`);
}

/**
 * Run full CME calculation
 */
export async function calculateFull(
  overrides?: Overrides,
  baseCurrency: BaseCurrency = 'usd',
  scenarioName: string = 'Current Scenario'
): Promise<CalculateResponse> {
  return fetchAPI('/api/calculate/full', {
    method: 'POST',
    body: JSON.stringify({
      overrides,
      base_currency: baseCurrency,
      scenario_name: scenarioName,
    }),
  });
}

/**
 * Calculate macro preview from building blocks
 */
export async function calculateMacroPreview(
  region: string,
  buildingBlocks: Record<string, number>
): Promise<MacroPreviewResponse> {
  return fetchAPI('/api/calculate/macro-preview', {
    method: 'POST',
    body: JSON.stringify({
      region,
      building_blocks: buildingBlocks,
    }),
  });
}

/**
 * Compare multiple scenarios
 */
export async function compareScenarios(
  scenarios: Array<{
    overrides?: Overrides;
    base_currency: BaseCurrency;
    scenario_name: string;
  }>
): Promise<{ scenarios: CalculateResponse[] }> {
  return fetchAPI('/api/calculate/compare', {
    method: 'POST',
    body: JSON.stringify(scenarios),
  });
}

/**
 * List user's scenarios
 */
export async function listScenarios(userId: string): Promise<{ scenarios: Scenario[] }> {
  return fetchAPI(`/api/scenarios?user_id=${userId}`);
}

/**
 * Create a new scenario
 */
export async function createScenario(
  userId: string,
  name: string,
  overrides: Overrides,
  baseCurrency: BaseCurrency
): Promise<{ success: boolean; scenario: Scenario }> {
  return fetchAPI(`/api/scenarios?user_id=${userId}`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      overrides,
      base_currency: baseCurrency,
    }),
  });
}

/**
 * Delete a scenario
 */
export async function deleteScenario(
  scenarioId: string,
  userId: string
): Promise<{ success: boolean }> {
  return fetchAPI(`/api/scenarios/${scenarioId}?user_id=${userId}`, {
    method: 'DELETE',
  });
}
