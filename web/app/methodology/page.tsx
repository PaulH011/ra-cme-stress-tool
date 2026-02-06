'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Calculator, TrendingUp, Building2, BarChart3, Target } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          Methodology Reference Guide
        </h1>
        <p className="text-slate-600 mt-2">
          Complete documentation of the Parkview CMA calculation methodology. Understand how
          expected returns are calculated and what each input assumption means.
        </p>
      </div>

      {/* Quick Navigation */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <a href="#overview" className="text-blue-600 hover:underline">Overview</a>
            <a href="#base-currency" className="text-blue-600 hover:underline">Base Currency & FX</a>
            <a href="#macro-models" className="text-blue-600 hover:underline">Macro Models</a>
            <a href="#liquidity" className="text-blue-600 hover:underline">Liquidity</a>
            <a href="#bonds" className="text-blue-600 hover:underline">Bonds</a>
            <a href="#equity" className="text-blue-600 hover:underline">Equity</a>
            <a href="#absolute-return" className="text-blue-600 hover:underline">Absolute Return</a>
            <a href="#faq" className="text-blue-600 hover:underline">FAQ</a>
          </div>
        </CardContent>
      </Card>

      {/* Overview */}
      <section id="overview" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
          Overview
        </h2>
        <div className="prose prose-slate max-w-none">
          <p>
            The Parkview CMA methodology produces <strong>10-year expected returns</strong> for major asset classes.
            The methodology is built on several key principles:
          </p>
          <ol className="list-decimal list-inside space-y-2 my-4">
            <li><strong>Building Block Approach</strong>: Returns are decomposed into fundamental components (yield, growth, valuation changes, etc.)</li>
            <li><strong>Mean Reversion</strong>: Valuations and spreads are assumed to revert to fair value over time</li>
            <li><strong>Forward-Looking Macro</strong>: Economic forecasts drive rate expectations</li>
            <li><strong>Consistency</strong>: All asset classes use the same underlying macro assumptions</li>
          </ol>
        </div>

        <Card className="bg-blue-50 border-blue-200 mt-4">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-blue-800 mb-2">Key Concept: Real vs. Nominal Returns</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Nominal Return</strong> = What you actually receive (includes inflation)</li>
              <li><strong>Real Return</strong> = Purchasing power gain (excludes inflation)</li>
              <li>Nominal Return = Real Return + Expected Inflation</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 mt-4">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-green-800 mb-2">New Feature: Asset Breakdown</h4>
            <p className="text-sm text-green-700">
              Click on any asset class row in the results table to see a detailed breakdown of the return calculation,
              including the formula, component attribution chart, and input values. Blue badges indicate user overrides.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Base Currency & FX */}
      <section id="base-currency" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
          Base Currency & FX Adjustments
        </h2>
        <p className="mb-4">
          The tool supports two base currencies: <strong>USD</strong> and <strong>EUR</strong>. When you select a base currency,
          all returns are expressed from that currency's perspective, with appropriate FX adjustments applied to foreign assets.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 font-mono text-sm mb-4">
          <strong>E[FX Return] = 30% × (Home T-Bill - Foreign T-Bill) + 70% × (Home Inflation - Foreign Inflation)</strong>
        </div>

        <p className="mb-4">
          This formula is based on <strong>Purchasing Power Parity (PPP)</strong> theory with two components:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">Component</th>
                <th className="p-2 text-left">Weight</th>
                <th className="p-2 text-left">Formula</th>
                <th className="p-2 text-left">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">Carry</td>
                <td className="p-2">30%</td>
                <td className="p-2">Home T-Bill - Foreign T-Bill</td>
                <td className="p-2">Short-term interest rate differential</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">PPP</td>
                <td className="p-2">70%</td>
                <td className="p-2">Home Inflation - Foreign Inflation</td>
                <td className="p-2">Long-term inflation differential</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Asset Currency Mapping</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">Asset Class</th>
                <th className="p-2 text-left">Local Currency</th>
                <th className="p-2 text-left">USD Base</th>
                <th className="p-2 text-left">EUR Base</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2">Liquidity</td><td className="p-2">Base currency</td><td className="p-2">No FX adjustment</td><td className="p-2">No FX adjustment</td></tr>
              <tr className="border-b"><td className="p-2">Bonds Global</td><td className="p-2">USD</td><td className="p-2">No FX adjustment</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Bonds HY</td><td className="p-2">USD</td><td className="p-2">No FX adjustment</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Bonds EM</td><td className="p-2">USD</td><td className="p-2">No FX adjustment</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Equity US</td><td className="p-2">USD</td><td className="p-2">No FX adjustment</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Equity Europe</td><td className="p-2">EUR</td><td className="p-2">FX adjustment applied</td><td className="p-2">No FX adjustment</td></tr>
              <tr className="border-b"><td className="p-2">Equity Japan</td><td className="p-2">JPY</td><td className="p-2">FX adjustment applied</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Equity EM</td><td className="p-2">EM currencies</td><td className="p-2">FX adjustment applied</td><td className="p-2">FX adjustment applied</td></tr>
              <tr className="border-b"><td className="p-2">Absolute Return</td><td className="p-2">Base currency</td><td className="p-2">No FX adjustment</td><td className="p-2">No FX adjustment</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Macro Models */}
      <section id="macro-models" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Macro Economic Models
        </h2>
        <p className="mb-4">
          Macro forecasts are the foundation for all asset class returns. The tool computes forecasts
          for four regions: <strong>US</strong>, <strong>Eurozone</strong>, <strong>Japan</strong>, and <strong>Emerging Markets (EM)</strong>.
        </p>

        <Tabs defaultValue="gdp" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gdp">GDP Growth</TabsTrigger>
            <TabsTrigger value="inflation">Inflation</TabsTrigger>
            <TabsTrigger value="tbill">T-Bill Rate</TabsTrigger>
          </TabsList>

          <TabsContent value="gdp" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GDP Growth Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 font-mono text-sm mb-4">
                  <strong>E[Real GDP Growth] = E[Output-per-Capita Growth] + E[Population Growth]</strong>
                </div>
                <p className="mb-2">Where Output-per-Capita Growth is computed as:</p>
                <div className="bg-slate-100 border rounded-lg p-4 font-mono text-sm mb-4">
                  E[Output-per-Capita] = Productivity Growth + Demographic Effect + Adjustment
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 text-left">Component</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-left">How It's Determined</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-2 font-medium">Population Growth</td><td className="p-2">Expected population growth rate</td><td className="p-2">UN Population Database forecasts</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Productivity Growth</td><td className="p-2">Output per worker growth</td><td className="p-2">EWMA of historical data (5-year half-life)</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Demographic Effect</td><td className="p-2">Impact of aging population</td><td className="p-2">Sigmoid function of MY (Middle/Young) ratio</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Adjustment</td><td className="p-2">Skewness correction</td><td className="p-2">-0.3% (DM) or -0.5% (EM)</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inflation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inflation Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 font-mono text-sm mb-4">
                  <strong>E[Inflation] = 30% × Current Headline Inflation + 70% × Long-Term Inflation</strong>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 text-left">Component</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-left">Default Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-2 font-medium">Current Headline</td><td className="p-2">Latest YoY CPI reading</td><td className="p-2">US: 2.5%, EU: 2.2%, JP: 2.0%, EM: 4.5%</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Long-Term Inflation</td><td className="p-2">Central bank target or EWMA of core</td><td className="p-2">US: 2.2%, EU: 2.0%, JP: 1.5%, EM: 3.5%</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-slate-600 mt-4">
                  <strong>Why 30/70 Weighting?</strong> Current inflation captures near-term momentum while
                  the long-term anchor represents central bank credibility.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tbill" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">T-Bill Rate Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 font-mono text-sm mb-4">
                  <strong>E[T-Bill] = 30% × Current T-Bill + 70% × Long-Term T-Bill</strong>
                </div>
                <p className="mb-2">Where the Long-Term T-Bill rate is:</p>
                <div className="bg-slate-100 border rounded-lg p-4 font-mono text-sm mb-4">
                  Long-Term T-Bill = max(-0.75%, Country Factor + E[Real GDP] + E[Inflation])
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 text-left">Component</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-left">Default Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-2 font-medium">Current T-Bill</td><td className="p-2">Today's 3-month T-Bill rate</td><td className="p-2">US: 3.67%, EU: 2.04%, JP: 0.75%, EM: 6.0%</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Country Factor</td><td className="p-2">Liquidity/risk premium</td><td className="p-2">US: 0%, EU: -0.2%, JP: -0.5%, EM: +0.5%</td></tr>
                      <tr className="border-b"><td className="p-2 font-medium">Rate Floor</td><td className="p-2">Minimum possible rate</td><td className="p-2">-0.75%</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Liquidity */}
      <section id="liquidity" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
          Liquidity (Cash/T-Bills)
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 font-mono text-sm mb-4">
          <strong>E[Liquidity Return] = E[T-Bill Rate]</strong>
        </div>
        <p>
          The simplest asset class - cash returns equal the expected average T-Bill rate over the forecast horizon.
          No credit risk, no duration risk. Real return = Nominal return - Inflation.
        </p>
      </section>

      {/* Bonds */}
      <section id="bonds" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Bond Models
        </h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 font-mono text-sm mb-6">
          <strong>E[Bond Return] = Yield Component + Roll Return + Valuation Return - Credit Losses</strong>
        </div>

        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global">Bonds Global</TabsTrigger>
            <TabsTrigger value="hy">Bonds High Yield</TabsTrigger>
            <TabsTrigger value="em">Bonds EM</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Government Bonds (Bonds Global)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">For developed market government bonds, Credit Losses = 0 (assumed default-free).</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Yield Component</h4>
                    <p className="font-mono text-sm bg-white p-2 rounded mb-2">Avg Yield = E[T-Bill] + Avg Term Premium</p>
                    <p className="text-sm text-slate-600">The yield you earn from holding the bond. Term premium mean-reverts from current to fair value over time.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Roll Return</h4>
                    <p className="font-mono text-sm bg-white p-2 rounded mb-2">Roll = (Term Premium / Maturity) × Duration</p>
                    <p className="text-sm text-slate-600">Captures the "roll down" effect as bonds approach maturity.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Valuation Return</h4>
                    <p className="font-mono text-sm bg-white p-2 rounded mb-2">Val = -Duration × (ΔTerm Premium / Horizon)</p>
                    <p className="text-sm text-slate-600">Capital gain/loss from yield changes. Rising yields = falling prices.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Default Inputs</h4>
                    <ul className="text-sm space-y-1">
                      <li>Current Yield: 3.5%</li>
                      <li>Duration: 7.0 years</li>
                      <li>Current Term Premium: 1.0%</li>
                      <li>Fair Term Premium: 1.5%</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hy" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High Yield Bonds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">High yield bonds follow the same framework but include <strong>credit spread</strong> and <strong>credit losses</strong>.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Credit Spread Component</h4>
                    <p className="font-mono text-sm bg-white p-2 rounded mb-2">Avg Yield = E[T-Bill] + Term Premium + Credit Spread</p>
                    <p className="text-sm text-slate-600">Credit spread also mean-reverts to fair value.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Credit Loss Component</h4>
                    <p className="font-mono text-sm bg-white p-2 rounded mb-2">Credit Loss = Default Rate × (1 - Recovery Rate)</p>
                    <p className="text-sm text-slate-600">Annual expected loss from defaults.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg col-span-2">
                    <h4 className="font-semibold mb-2">Default Inputs</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>Current Yield: 7.5%</div>
                      <div>Duration: 4.0 years</div>
                      <div>Credit Spread: 2.71%</div>
                      <div>Fair Credit Spread: 4.0%</div>
                      <div>Default Rate: 5.5%</div>
                      <div>Recovery Rate: 40%</div>
                      <div className="font-semibold">Annual Credit Loss: 3.3%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="em" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">EM Hard Currency Bonds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  EM hard currency bonds are USD-denominated sovereign bonds. Since they are priced off the US Treasury curve,
                  they use <strong>US macro assumptions</strong> (not EM macro).
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="font-mono text-sm mb-2"><strong>Yield = E[US T-Bill] + Term Premium + EM Credit Spread (~2%)</strong></p>
                  <p className="font-mono text-sm"><strong>Real Return = Nominal Return - US Inflation</strong></p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 text-left">Input</th>
                        <th className="p-2 text-left">Default</th>
                        <th className="p-2 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-2">Current Yield</td><td className="p-2">5.77%</td><td className="p-2">BBG EM USD Aggregate Index YTM</td></tr>
                      <tr className="border-b"><td className="p-2">Duration</td><td className="p-2">5.5 years</td><td className="p-2">Typically shorter than DM</td></tr>
                      <tr className="border-b"><td className="p-2">Default Rate</td><td className="p-2">2.8%</td><td className="p-2">EM hard currency sovereign default rate</td></tr>
                      <tr className="border-b"><td className="p-2">Recovery Rate</td><td className="p-2">55%</td><td className="p-2">Typical EM sovereign recovery</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Equity */}
      <section id="equity" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Equity Models
        </h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 font-mono text-sm mb-6">
          <strong>E[Real Equity Return] = Dividend Yield + Real EPS Growth + Valuation Change</strong>
        </div>
        <p className="mb-4 text-slate-600">Note: This produces a <strong>real</strong> return. Add inflation to get nominal return.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dividend Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm bg-slate-100 p-2 rounded mb-2">Current trailing 12-month dividend yield</p>
              <p className="text-sm text-slate-600">Taken as current value with no mean reversion assumed.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Real EPS Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm bg-slate-100 p-2 rounded mb-2">EPS = 50% × Country + 50% × Regional</p>
              <p className="text-sm text-slate-600">Blended growth capped at Global GDP; 50-year log-linear trend.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Valuation Change</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm bg-slate-100 p-2 rounded mb-2">Val = (Fair CAEY / Current CAEY)^(1/20) - 1</p>
              <p className="text-sm text-slate-600">CAEY (1/CAPE) reverts to fair value over 20 years.</p>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">Input</th>
                <th className="p-2 text-left">US</th>
                <th className="p-2 text-left">Europe</th>
                <th className="p-2 text-left">Japan</th>
                <th className="p-2 text-left">EM</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2 font-medium">Dividend Yield</td><td className="p-2">1.13%</td><td className="p-2">3.0%</td><td className="p-2">2.2%</td><td className="p-2">3.0%</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Current CAEY</td><td className="p-2">2.48%</td><td className="p-2">5.5%</td><td className="p-2">5.5%</td><td className="p-2">6.5%</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Fair CAEY</td><td className="p-2">5.0%</td><td className="p-2">5.5%</td><td className="p-2">5.0%</td><td className="p-2">6.0%</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Country EPS Growth</td><td className="p-2">1.8%</td><td className="p-2">1.2%</td><td className="p-2">0.8%</td><td className="p-2">3.0%</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Regional EPS Growth</td><td className="p-2">1.6%</td><td className="p-2">1.6%</td><td className="p-2">1.6%</td><td className="p-2">2.8%</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Absolute Return */}
      <section id="absolute-return" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Target className="h-6 w-6" />
          Absolute Return (Hedge Funds)
        </h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 font-mono text-sm mb-6">
          <strong>E[HF Return] = E[T-Bill] + Σ(βᵢ × Factor Premiumᵢ) + Trading Alpha</strong>
        </div>

        <p className="mb-4">The hedge fund model uses the <strong>Fama-French factor framework</strong> to decompose returns.</p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-2 text-left">Factor</th>
                <th className="p-2 text-left">Symbol</th>
                <th className="p-2 text-left">Default β</th>
                <th className="p-2 text-left">Historical Premium</th>
                <th className="p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2 font-medium">Market</td><td className="p-2">MKT-RF</td><td className="p-2">0.30</td><td className="p-2">Equity Return - T-Bill</td><td className="p-2">Equity market exposure</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Size</td><td className="p-2">SMB</td><td className="p-2">0.10</td><td className="p-2">2.0%</td><td className="p-2">Small minus Big</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Value</td><td className="p-2">HML</td><td className="p-2">0.05</td><td className="p-2">3.0%</td><td className="p-2">High minus Low B/M</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Profitability</td><td className="p-2">RMW</td><td className="p-2">0.05</td><td className="p-2">2.5%</td><td className="p-2">Robust minus Weak</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Investment</td><td className="p-2">CMA</td><td className="p-2">0.05</td><td className="p-2">2.5%</td><td className="p-2">Conservative minus Aggressive</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Momentum</td><td className="p-2">UMD</td><td className="p-2">0.10</td><td className="p-2">6.0%</td><td className="p-2">Up minus Down</td></tr>
            </tbody>
          </table>
        </div>

        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <h4 className="font-semibold mb-2">Trading Alpha</h4>
            <p className="font-mono text-sm bg-white p-2 rounded mb-2">Expected Alpha = 50% × Historical Alpha = 1.0%</p>
            <p className="text-sm text-slate-600">
              Alpha represents manager skill beyond systematic factor exposures.
              The 50% haircut accounts for alpha decay, survivor bias, and capacity constraints.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Why are US equity returns lower than historical averages?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">US equity returns in the model may be lower than historical averages (10%+) for several reasons:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>High Valuations</strong>: Current CAEY of 2.48% (CAPE ~40) is below fair value of 5.0% (CAPE ~20). This creates a valuation headwind.</li>
                <li><strong>Lower Dividend Yields</strong>: Current yields (~1.13%) are near all-time lows vs historical averages (~4%).</li>
                <li><strong>Building Block Approach</strong>: The model builds returns from fundamentals rather than extrapolating historical returns.</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>Why is there a GDP cap on EPS growth?</AccordionTrigger>
            <AccordionContent>
              <p>Corporate earnings cannot grow faster than the economy indefinitely because profits are a share of GDP. If profits grew faster than GDP, they would eventually exceed 100% of GDP (impossible). The cap prevents overly optimistic assumptions in high-growth regions.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>What's the difference between Basic and Advanced mode?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2"><strong>Basic Mode</strong> provides direct forecast overrides (E[Inflation], E[GDP], E[T-Bill]) and primary asset inputs.</p>
              <p><strong>Advanced Mode</strong> adds building block inputs (population growth, productivity, MY ratio) and full control over how forecasts are computed.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>How should I interpret negative valuation returns?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Negative valuation returns indicate that current valuations are <strong>expensive</strong> relative to fair value:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Bonds</strong>: Negative valuation = term premiums expected to rise → yields rise → prices fall</li>
                <li><strong>Equities</strong>: Negative valuation = CAEY expected to rise → CAPE expected to fall → P/E compression</li>
              </ul>
              <p className="mt-2">Total return can still be positive if yield and growth components are large enough.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>How do I use the asset breakdown feature?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Click on any asset class row in the results table to expand a detailed breakdown showing:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The main return formula for that asset class</li>
                <li>A waterfall chart showing return attribution by component</li>
                <li>Component details with formulas and current input values</li>
                <li>Blue badges with * indicate values you've overridden from defaults</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6">
            <AccordionTrigger>How often should default values be updated?</AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-2 text-left">Input Type</th>
                      <th className="p-2 text-left">Update Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="p-2">Current yields, T-Bills</td><td className="p-2">Monthly or more</td></tr>
                    <tr className="border-b"><td className="p-2">Dividend yields, CAEY</td><td className="p-2">Quarterly</td></tr>
                    <tr className="border-b"><td className="p-2">Macro forecasts (GDP, inflation)</td><td className="p-2">Quarterly</td></tr>
                    <tr className="border-b"><td className="p-2">Fair values (EWMA-based)</td><td className="p-2">Annually</td></tr>
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Footer */}
      <div className="border-t pt-6 text-center text-sm text-slate-500">
        <p><strong>Parkview CMA Methodology Reference</strong></p>
        <p className="mt-1">
          <Link href="/" className="text-blue-600 hover:underline">Return to Dashboard</Link> to run stress tests.
        </p>
      </div>
    </div>
  );
}
