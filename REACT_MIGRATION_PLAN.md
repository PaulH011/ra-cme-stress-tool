# React Migration Plan: Parkview CMA Tool

## Overview

Migrate the Streamlit application to a modern React/Next.js frontend with FastAPI backend while **keeping the current Streamlit app fully functional** until migration is complete.

---

## Architecture Decision: Agree with Cursor's Recommendation

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | Next.js 14 + React 18 | App Router, server components, excellent DX |
| UI Library | shadcn/ui + Tailwind CSS | Beautiful, accessible, highly customizable |
| State Management | Zustand or React Query | Lightweight, great for API-driven state |
| Charts | Recharts | React-native, simpler than Plotly |
| Backend | FastAPI | Python-native, auto-docs, async support |
| Database | Supabase (existing) | Already configured, includes auth |
| Auth | Supabase Auth | Replace custom auth, better security |

---

## Project Structure (Non-Destructive)

```
Research Afilliates Model/
├── app.py                      # KEEP - Current Streamlit app (unchanged)
├── ra_stress_tool/             # KEEP - Existing calculation engine
├── auth/                       # KEEP - Current auth (Streamlit)
├── chatbot/                    # KEEP - Current chatbot
├── scenarios.json              # KEEP - Current scenarios
│
├── api/                        # NEW - FastAPI backend
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── calculate.py        # CME calculation endpoints
│   │   ├── scenarios.py        # Scenario CRUD
│   │   ├── auth.py             # Supabase auth endpoints
│   │   └── defaults.py         # Default values endpoint
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py         # Pydantic request models
│   │   └── responses.py        # Pydantic response models
│   └── requirements.txt        # API-specific dependencies
│
└── web/                        # NEW - Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout
    │   │   ├── page.tsx        # Dashboard (main page)
    │   │   ├── methodology/
    │   │   │   └── page.tsx    # Methodology docs
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── ui/             # shadcn components
    │   │   ├── layout/
    │   │   │   ├── Header.tsx
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── Footer.tsx
    │   │   ├── inputs/
    │   │   │   ├── MacroInputPanel.tsx
    │   │   │   ├── BondInputPanel.tsx
    │   │   │   ├── EquityInputPanel.tsx
    │   │   │   ├── AlternativesInputPanel.tsx
    │   │   │   └── InputField.tsx
    │   │   ├── results/
    │   │   │   ├── ResultsTable.tsx
    │   │   │   ├── RiskReturnChart.tsx
    │   │   │   └── ComponentBreakdown.tsx
    │   │   ├── scenarios/
    │   │   │   ├── ScenarioSelector.tsx
    │   │   │   ├── ScenarioSaveDialog.tsx
    │   │   │   └── TemplateLoader.tsx
    │   │   └── preview/
    │   │       └── BuildingBlockPreview.tsx  # Port the new preview feature!
    │   ├── lib/
    │   │   ├── api.ts          # API client
    │   │   ├── types.ts        # TypeScript types
    │   │   ├── constants.ts    # Default values
    │   │   └── utils.ts        # Helper functions
    │   ├── hooks/
    │   │   ├── useCalculation.ts
    │   │   ├── useScenarios.ts
    │   │   └── useAuth.ts
    │   └── stores/
    │       └── inputStore.ts   # Zustand store for inputs
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── next.config.js
```

---

## Phase 1: FastAPI Backend (Week 1-2)

### Goal: Create API that wraps `ra_stress_tool` without touching Streamlit

### Step 1.1: Set Up FastAPI Project

```bash
# Create api directory
mkdir api
cd api

# Create virtual environment (separate from Streamlit)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic python-dotenv supabase
```

### Step 1.2: Create API Entry Point

**File: `api/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add parent directory to path so we can import ra_stress_tool
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.routes import calculate, scenarios, defaults, auth

app = FastAPI(
    title="Parkview CMA API",
    description="Capital Market Expectations calculation engine",
    version="1.0.0"
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(calculate.router, prefix="/api/calculate", tags=["Calculate"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(defaults.router, prefix="/api/defaults", tags=["Defaults"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### Step 1.3: Create Calculation Endpoint

**File: `api/routes/calculate.py`**
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from ra_stress_tool.main import CMEEngine

router = APIRouter()

class CalculateRequest(BaseModel):
    overrides: Optional[Dict[str, Any]] = None
    base_currency: str = "usd"
    scenario_name: str = "Current Scenario"

class MacroPreviewRequest(BaseModel):
    region: str
    building_blocks: Dict[str, float]

@router.post("/full")
async def calculate_full(request: CalculateRequest):
    """Run full CME calculation with optional overrides"""
    try:
        engine = CMEEngine(
            overrides=request.overrides,
            base_currency=request.base_currency.lower()
        )
        results = engine.compute_all_returns(request.scenario_name)

        # Convert to JSON-serializable format
        return {
            "scenario_name": results.scenario_name,
            "base_currency": results.base_currency,
            "results": {
                key: {
                    "expected_return_nominal": r.expected_return_nominal,
                    "expected_return_real": r.expected_return_real,
                    "components": r.components,
                    "inputs_used": r.inputs_used
                }
                for key, r in results.results.items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/macro-preview")
async def calculate_macro_preview(request: MacroPreviewRequest):
    """
    Compute macro forecasts from building blocks (lightweight preview).
    This mirrors the compute_macro_preview function from app.py.
    """
    from ra_stress_tool.utils.ewma import sigmoid_my_ratio

    region = request.region.lower()
    bb = request.building_blocks

    # Extract values (already in decimal form from frontend)
    pop_growth = bb.get('population_growth', 0.004)
    prod_growth = bb.get('productivity_growth', 0.012)
    my_ratio = bb.get('my_ratio', 2.0)
    curr_infl = bb.get('current_headline_inflation', 0.025)
    lt_infl = bb.get('long_term_inflation', 0.022)
    curr_tb = bb.get('current_tbill', 0.04)
    ctry_factor = bb.get('country_factor', 0.0)

    # Compute GDP forecast
    demographic_effect = sigmoid_my_ratio(my_ratio)
    adjustment = -0.003 if region in ['us', 'eurozone', 'japan'] else -0.005
    output_per_capita = prod_growth + demographic_effect + adjustment
    rgdp_growth = output_per_capita + pop_growth

    # Compute Inflation forecast
    inflation_forecast = 0.30 * curr_infl + 0.70 * lt_infl

    # Compute T-Bill forecast
    rate_floor = -0.0075
    long_term_tbill = max(rate_floor, ctry_factor + rgdp_growth + inflation_forecast)
    tbill_forecast = 0.30 * curr_tb + 0.70 * long_term_tbill

    return {
        "rgdp_growth": rgdp_growth,
        "inflation": inflation_forecast,
        "tbill": tbill_forecast,
        "intermediate": {
            "demographic_effect": demographic_effect,
            "output_per_capita": output_per_capita,
            "adjustment": adjustment,
            "long_term_tbill": long_term_tbill
        }
    }
```

### Step 1.4: Create Defaults Endpoint

**File: `api/routes/defaults.py`**
```python
from fastapi import APIRouter

router = APIRouter()

# Mirror INPUT_DEFAULTS from app.py
INPUT_DEFAULTS = {
    "macro": {
        "us": {
            "inflation_forecast": 2.29,
            "rgdp_growth": 1.20,
            "tbill_forecast": 3.79,
            "population_growth": 0.40,
            "productivity_growth": 1.20,
            "my_ratio": 2.1,
            "current_headline_inflation": 2.50,
            "long_term_inflation": 2.20,
            "current_tbill": 3.67,
            "country_factor": 0.00,
        },
        "eurozone": {
            "inflation_forecast": 2.06,
            "rgdp_growth": 0.80,
            "tbill_forecast": 2.70,
            # ... etc
        },
        # ... japan, em
    },
    "bonds": {
        # ... bond defaults
    },
    "equity": {
        # ... equity defaults
    },
    "absolute_return": {
        # ... hedge fund defaults
    }
}

@router.get("/all")
async def get_all_defaults():
    """Get all default input values"""
    return INPUT_DEFAULTS

@router.get("/macro/{region}")
async def get_macro_defaults(region: str):
    """Get macro defaults for a specific region"""
    return INPUT_DEFAULTS["macro"].get(region.lower(), {})
```

### Step 1.5: Test Backend Independently

```bash
# Run FastAPI server (from api directory)
uvicorn main:app --reload --port 8000

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/defaults/all
curl -X POST http://localhost:8000/api/calculate/full \
  -H "Content-Type: application/json" \
  -d '{"base_currency": "usd"}'
```

---

## Phase 2: Next.js Frontend Foundation (Week 2-3)

### Step 2.1: Create Next.js Project

```bash
# From project root
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir

cd web

# Install shadcn/ui
npx shadcn-ui@latest init

# Install additional dependencies
npm install zustand @tanstack/react-query recharts lucide-react
npm install @supabase/supabase-js
```

### Step 2.2: Install shadcn Components

```bash
npx shadcn-ui@latest add button card tabs accordion table
npx shadcn-ui@latest add input label select slider
npx shadcn-ui@latest add dialog dropdown-menu toast
npx shadcn-ui@latest add badge separator scroll-area
```

### Step 2.3: Create Dashboard Layout

**File: `web/src/app/layout.tsx`**
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Parkview CMA Tool',
  description: 'Capital Market Expectations Calculator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
```

### Step 2.4: Create Main Dashboard Page

**File: `web/src/app/page.tsx`**
```tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MacroInputPanel } from '@/components/inputs/MacroInputPanel'
import { ResultsTable } from '@/components/results/ResultsTable'
import { RiskReturnChart } from '@/components/results/RiskReturnChart'
import { ScenarioSelector } from '@/components/scenarios/ScenarioSelector'
import { useCalculation } from '@/hooks/useCalculation'

export default function Dashboard() {
  const { results, isLoading, calculate } = useCalculation()

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Panel: Inputs */}
      <div className="col-span-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Input Assumptions</CardTitle>
            <ScenarioSelector />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="macro" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="macro">Macro</TabsTrigger>
                <TabsTrigger value="bonds">Bonds</TabsTrigger>
                <TabsTrigger value="equity">Equity</TabsTrigger>
                <TabsTrigger value="alt">Alt</TabsTrigger>
              </TabsList>

              <TabsContent value="macro" className="mt-4">
                <MacroInputPanel />
              </TabsContent>

              {/* Other tabs... */}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Results */}
      <div className="col-span-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Expected Returns (10-Year)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsTable results={results} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk-Return Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskReturnChart results={results} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Phase 3: Core Feature Implementation (Week 3-5)

### Key Components to Build

1. **MacroInputPanel.tsx** - Tabbed region inputs with hover previews
2. **ComputedPreviewTooltip.tsx** - Hover bubble showing computed values
3. **ResultsTable.tsx** - Sortable, exportable results table
4. **RiskReturnChart.tsx** - Interactive scatter chart
5. **ScenarioSelector.tsx** - Load/save/template scenarios

---

## Building Block Preview: Hover Bubble UX

### Design Concept

Instead of an inline preview section, the computed preview appears as a **hover tooltip bubble** when the user hovers over a direct forecast input field. This keeps the UI clean while providing contextual feedback exactly where it's needed.

```
┌─────────────────────────────────────────────────────────┐
│  E[Real GDP Growth] — 10yr Avg (%)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  1.20  ▼                                            ││
│  └─────────────────────────────────────────────────────┘│
│         │                                               │
│         ▼  (hover triggers bubble)                      │
│    ┌────────────────────────────────────────┐           │
│    │ 📊 Computed from Building Blocks       │           │
│    │ ─────────────────────────────────────  │           │
│    │                                        │           │
│    │ Your Override:     1.20%               │           │
│    │ Computed Value:    1.87%  ⚠️ +0.67%    │           │
│    │                                        │           │
│    │ ┌──────────────────────────────────┐   │           │
│    │ │ Productivity:  1.20% (default)   │   │           │
│    │ │ + Demographic: +0.10%            │   │           │
│    │ │ + Adjustment:  -0.30%            │   │           │
│    │ │ = Output/Cap:  1.00%             │   │           │
│    │ │ + Population:  0.87% ⬆ changed   │   │           │
│    │ │ ────────────────────────────     │   │           │
│    │ │ = E[GDP]:      1.87%             │   │           │
│    │ └──────────────────────────────────┘   │           │
│    │                                        │           │
│    │  [✓ Use Computed]  [Keep Override]     │           │
│    └────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Bubble Behavior

| Trigger | Behavior |
|---------|----------|
| Hover over input | Bubble appears after 300ms delay |
| Mouse leaves | Bubble fades after 200ms (unless mouse enters bubble) |
| Click "Use Computed" | Updates input, bubble closes |
| Click "Keep Override" | Bubble closes, no change |
| Building blocks = defaults | Bubble shows "Using default calculation" (no conflict) |

### Visual Indicators

| State | Indicator |
|-------|-----------|
| No conflict | Green checkmark, values match |
| Conflict (override ≠ computed) | Yellow warning, shows delta |
| Building block changed | Blue highlight on that line in breakdown |

### React Component Structure

**File: `web/src/components/inputs/ComputedPreviewTooltip.tsx`**
```tsx
'use client'

import { useState } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, ArrowUp, ArrowDown } from 'lucide-react'

interface ComputedPreviewProps {
  children: React.ReactNode  // The input field
  forecastType: 'gdp' | 'inflation' | 'tbill'
  region: string
  currentValue: number
  computedValue: number
  breakdown: {
    label: string
    value: number
    isChanged: boolean
  }[]
  onApplyComputed: () => void
}

export function ComputedPreviewTooltip({
  children,
  forecastType,
  region,
  currentValue,
  computedValue,
  breakdown,
  onApplyComputed
}: ComputedPreviewProps) {
  const delta = computedValue - currentValue
  const hasConflict = Math.abs(delta) > 0.001
  const anyBuildingBlockChanged = breakdown.some(b => b.isChanged)

  // Don't show tooltip if no building blocks changed
  if (!anyBuildingBlockChanged) {
    return <>{children}</>
  }

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="relative">
          {children}
          {hasConflict && (
            <div className="absolute -right-2 -top-2">
              <Badge variant="warning" className="h-5 w-5 p-0 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3" />
              </Badge>
            </div>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-80" side="right" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              📊 Computed from Building Blocks
            </span>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Your Override:</span>
              <span className="ml-2 font-medium">{currentValue.toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Computed:</span>
              <span className={`ml-2 font-medium ${hasConflict ? 'text-amber-600' : 'text-green-600'}`}>
                {computedValue.toFixed(2)}%
              </span>
              {hasConflict && (
                <span className="ml-1 text-xs text-amber-600">
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-50 rounded-md p-2 text-xs space-y-1">
            {breakdown.map((item, i) => (
              <div
                key={i}
                className={`flex justify-between ${item.isChanged ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
              >
                <span>{item.label}</span>
                <span>
                  {item.value >= 0 ? '+' : ''}{(item.value * 100).toFixed(2)}%
                  {item.isChanged && <span className="ml-1">⬆</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {hasConflict && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onApplyComputed} className="flex-1">
                <Check className="h-3 w-3 mr-1" />
                Use Computed
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Keep Override
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
```

### Usage in MacroInputPanel

```tsx
<ComputedPreviewTooltip
  forecastType="gdp"
  region="us"
  currentValue={inputs.us.rgdp_growth}
  computedValue={computed.rgdp_growth}
  breakdown={[
    { label: 'Productivity Growth', value: 0.012, isChanged: false },
    { label: 'Demographic Effect', value: 0.001, isChanged: false },
    { label: 'Adjustment', value: -0.003, isChanged: false },
    { label: 'Population Growth', value: 0.0087, isChanged: true },  // Changed!
  ]}
  onApplyComputed={() => setMacroValue('us', 'rgdp_growth', computed.rgdp_growth)}
>
  <Input
    type="number"
    value={inputs.us.rgdp_growth}
    onChange={(e) => setMacroValue('us', 'rgdp_growth', parseFloat(e.target.value))}
  />
</ComputedPreviewTooltip>
```

This hover-based approach:
- **Keeps the UI clean** - no extra sections taking up space
- **Provides context** - appears right next to the field you're questioning
- **Shows the math** - breakdown helps users understand the calculation
- **Enables quick action** - one click to apply computed value

### State Management with Zustand

**File: `web/src/stores/inputStore.ts`**
```typescript
import { create } from 'zustand'

interface MacroInputs {
  us: {
    inflation_forecast: number
    rgdp_growth: number
    tbill_forecast: number
    population_growth: number
    productivity_growth: number
    my_ratio: number
    // ... etc
  }
  eurozone: { /* ... */ }
  japan: { /* ... */ }
  em: { /* ... */ }
}

interface InputStore {
  macro: MacroInputs
  bonds: { /* ... */ }
  equity: { /* ... */ }
  baseCurrency: 'usd' | 'eur'

  // Actions
  setMacroValue: (region: string, key: string, value: number) => void
  setBondValue: (type: string, key: string, value: number) => void
  resetToDefaults: () => void
  loadScenario: (overrides: any) => void
  getOverrides: () => any  // Returns only changed values
}

export const useInputStore = create<InputStore>((set, get) => ({
  // ... implementation
}))
```

---

## Phase 4: Supabase Auth Migration (Week 5-6)

### Replace Custom Auth with Supabase Auth

1. Enable Email auth in Supabase dashboard
2. Create auth middleware for FastAPI
3. Implement auth hooks in Next.js
4. Migrate existing users (one-time script)

**File: `web/src/lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## Phase 5: Testing & Polish (Week 6-7)

### Testing Strategy

1. **API Tests**: pytest for FastAPI endpoints
2. **Component Tests**: React Testing Library for UI components
3. **E2E Tests**: Playwright for critical user flows
4. **Manual Testing**: Side-by-side comparison with Streamlit

### Comparison Checklist

| Feature | Streamlit | React | Match? |
|---------|-----------|-------|--------|
| Calculate returns | ✓ | ✓ | ✓ |
| Base currency toggle | ✓ | ✓ | ✓ |
| Building block preview | ✓ | ✓ | ✓ |
| Scenario save/load | ✓ | ✓ | ✓ |
| Export CSV/Excel | ✓ | ✓ | ✓ |
| Validation warnings | ✓ | ✓ | ✓ |

---

## Phase 6: Deployment (Week 7-8)

### Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Railway/      │────▶│   Supabase      │
│   (Next.js)     │     │   Render        │     │   (PostgreSQL)  │
│                 │     │   (FastAPI)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Deployment Steps

1. **Backend**: Deploy FastAPI to Railway or Render
2. **Frontend**: Deploy Next.js to Vercel (free tier)
3. **Database**: Already on Supabase
4. **Environment Variables**: Configure in each platform

---

## Timeline Summary

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-2 | Backend API | FastAPI wrapping ra_stress_tool |
| 2-3 | Frontend Foundation | Next.js + shadcn setup, basic layout |
| 3-5 | Core Features | Input panels, results, scenarios |
| 5-6 | Auth Migration | Supabase Auth integration |
| 6-7 | Testing & Polish | Bug fixes, comparison testing |
| 7-8 | Deployment | Production deployment |

---

## Key Principles

1. **Non-Destructive**: Streamlit app stays fully functional
2. **Incremental**: Each phase produces testable output
3. **Reuse Logic**: `ra_stress_tool` is shared, not duplicated
4. **Side-by-Side**: Run both apps during development for comparison

---

## Next Steps

When ready to begin:

1. Create `api/` directory structure
2. Set up FastAPI with `/health` endpoint
3. Create `/api/calculate/full` endpoint
4. Test with curl/Postman
5. Verify calculations match Streamlit output

**The Streamlit app (`app.py`) will remain 100% functional throughout this process.**
