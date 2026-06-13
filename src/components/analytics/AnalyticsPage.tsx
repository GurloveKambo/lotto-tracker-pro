import React, { useMemo, useState } from 'react'
import { useStore } from '../../stores'
import { computeAnalyticsSnapshot, computeEquityCurve, computeStrategyStatuses, generateInsights } from '../../services/analytics'
import { Card, StatCard, Badge, Tabs } from '../ui'
import { cn, formatCurrency, formatCurrencyFull, today, getNetColor, groupBy, sumBy } from '../../utils'
import { TrendingUp, TrendingDown, Activity, Target, Zap, BarChart3, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'

export function AnalyticsPage() {
  const { plays, openingBalance, strategies, cycles, financialSettings } = useStore()
  const sym = financialSettings.currencySymbol
  const todayStr = today()
  const [tab, setTab] = useState('overview')
  const [equityDays, setEquityDays] = useState(90)

  const snapshot = useMemo(() => computeAnalyticsSnapshot(plays, openingBalance), [plays, openingBalance])
  const equityCurve = useMemo(() => computeEquityCurve(plays, openingBalance), [plays, openingBalance])
  const stratStatuses = useMemo(() => computeStrategyStatuses(strategies, cycles, plays, todayStr), [strategies, cycles, plays, todayStr])
  const insights = useMemo(() => generateInsights(snapshot, stratStatuses), [snapshot, stratStatuses])

  const filteredEquity = useMemo(() => {
    if (equityDays === 0) return equityCurve
    const cutoff = format(subDays(new Date(), equityDays), 'yyyy-MM-dd')
    return equityCurve.filter(p => p.date >= cutoff)
  }, [equityCurve, equityDays])

  // Daily P&L bar data (last 30 days)
  const dailyBars = useMemo(() => {
    const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const recentPlays = plays.filter(p => p.date >= cutoff)
    const byDate = groupBy(recentPlays, p => p.date)
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayPlays]) => ({
        date,
        net: sumBy(dayPlays, p => p.net),
        cost: sumBy(dayPlays, p => p.cost),
        winnings: sumBy(dayPlays, p => p.payout),
      }))
  }, [plays])

  // Strategy comparison
  const stratData = useMemo(() => stratStatuses.map(ss => ({
    name: ss.strategy.name,
    cost: sumBy(plays.filter(p => p.strategyId === ss.strategy.id), p => p.cost),
    winnings: sumBy(plays.filter(p => p.strategyId === ss.strategy.id), p => p.payout),
    net: ss.lifetimeNet,
    plays: plays.filter(p => p.strategyId === ss.strategy.id).length,
  })).sort((a, b) => b.net - a.net), [stratStatuses, plays])

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'equity', label: 'Equity' },
    { id: 'daily', label: 'Daily P&L' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'insights', label: 'Insights' },
  ]

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Analytics</h1>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="ROI" value={`${snapshot.roi.toFixed(2)}%`} color={snapshot.roi >= 0 ? 'success' : 'danger'} icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard label="Win Rate" value={`${snapshot.winRate.toFixed(1)}%`} color={snapshot.winRate >= 50 ? 'success' : 'warning'} icon={<Target className="w-4 h-4" />} />
            <StatCard label="Risk Score" value={`${snapshot.riskScore.toFixed(0)}/100`} color={snapshot.riskScore > 70 ? 'danger' : snapshot.riskScore > 40 ? 'warning' : 'success'} icon={<AlertTriangle className="w-4 h-4" />} />
            <StatCard label="Capital Efficiency" value={`${snapshot.capitalEfficiency.toFixed(1)}%`} color={snapshot.capitalEfficiency >= 80 ? 'success' : 'warning'} icon={<Activity className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-slate-500 mb-1">Win / Loss Streak</p>
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold', snapshot.currentStreakType === 'win' ? 'text-emerald-600' : snapshot.currentStreakType === 'loss' ? 'text-red-500' : 'text-slate-500')}>
                  {snapshot.currentStreak}
                </span>
                <span className="text-xs text-slate-500">
                  day {snapshot.currentStreakType} streak
                </span>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span>Best win: <strong className="text-emerald-600">{snapshot.longestWinStreak}d</strong></span>
                <span>Worst loss: <strong className="text-red-500">{snapshot.longestLossStreak}d</strong></span>
              </div>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 mb-1">Drawdown</p>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(snapshot.currentDrawdown, sym)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Max: {formatCurrency(snapshot.maxDrawdown, sym)}
              </div>
            </Card>
          </div>

          <Card>
            <p className="text-xs text-slate-500 mb-3">Financial Summary</p>
            <div className="space-y-2">
              {[
                { label: 'Total Cost', value: snapshot.totalCost, color: 'text-slate-900 dark:text-white' },
                { label: 'Total Winnings', value: snapshot.totalWinnings, color: 'text-emerald-600' },
                { label: 'Net P&L', value: snapshot.netPnl, color: snapshot.netPnl >= 0 ? 'text-emerald-600' : 'text-red-500' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-surface-100 dark:border-slate-800 last:border-0">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
                  <span className={cn('text-sm font-semibold', row.color)}>{formatCurrencyFull(row.value, sym)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-xs text-slate-500 mb-3">Daily Averages</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Avg Daily Cost</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(snapshot.avgDailyCost, sym)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Avg Daily Win</p>
                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(snapshot.avgDailyWinnings, sym)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Volatility (σ)</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(snapshot.volatility, sym)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Net P&L</p>
                <p className={cn('text-sm font-semibold', getNetColor(snapshot.netPnl))}>{formatCurrencyFull(snapshot.netPnl, sym)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* EQUITY CURVE */}
      {tab === 'equity' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            {[30, 60, 90, 0].map(d => (
              <button key={d} onClick={() => setEquityDays(d)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  equityDays === d ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
                {d === 0 ? 'All' : `${d}d`}
              </button>
            ))}
          </div>

          {filteredEquity.length < 2 ? (
            <Card className="text-center py-8 text-sm text-slate-400">Not enough data to plot equity curve.</Card>
          ) : (
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Equity Curve</h3>
                <Badge variant={snapshot.netPnl >= 0 ? 'success' : 'danger'}>{formatCurrencyFull(snapshot.netPnl, sym)}</Badge>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={filteredEquity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'dd/MM')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} width={48} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrencyFull(v, sym), name]}
                    labelFormatter={l => format(parseISO(l as string), 'dd MMM yyyy')}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="equity" stroke="#EA580C" strokeWidth={2.5} dot={false} name="Equity" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {filteredEquity.length >= 2 && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Daily Cost vs Winnings</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={filteredEquity.slice(-30)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'dd/MM')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [formatCurrencyFull(v, sym)]} labelFormatter={l => format(parseISO(l as string), 'dd MMM')} />
                  <Bar dataKey="cost" fill="#e2e8f0" name="Cost" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="winnings" fill="#10b981" name="Winnings" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* DAILY P&L */}
      {tab === 'daily' && (
        <div className="space-y-4 animate-fade-in">
          {dailyBars.length === 0 ? (
            <Card className="text-center py-8 text-sm text-slate-400">No play data for the last 30 days.</Card>
          ) : (
            <>
              <Card>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Daily Net P&L (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyBars} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'dd/MM')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => `₹${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [formatCurrencyFull(v, sym), 'Net P&L']} labelFormatter={l => format(parseISO(l as string), 'dd MMM yyyy')} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Bar dataKey="net" name="Net P&L" radius={[3, 3, 0, 0]}>
                      {dailyBars.map((entry, i) => (
                        <Cell key={i} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card noPad>
                <div className="p-3 border-b border-surface-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Daily Breakdown</h3>
                </div>
                <div className="divide-y divide-surface-50 dark:divide-slate-800/50 max-h-80 overflow-y-auto">
                  {[...dailyBars].reverse().map(d => (
                    <div key={d.date} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{format(parseISO(d.date), 'EEE dd MMM')}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-400">{sym}{d.cost}</span>
                        <span className="text-emerald-600">{sym}{d.winnings}</span>
                        <span className={cn('font-semibold w-16 text-right', getNetColor(d.net))}>
                          {d.net >= 0 ? '+' : ''}{sym}{Math.abs(d.net)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* STRATEGIES */}
      {tab === 'strategies' && (
        <div className="space-y-4 animate-fade-in">
          {stratData.length === 0 ? (
            <Card className="text-center py-8 text-sm text-slate-400">No strategy data yet.</Card>
          ) : (
            <>
              <Card>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Strategy Ranking (Net P&L)</h3>
                <ResponsiveContainer width="100%" height={Math.max(120, stratData.length * 40)}>
                  <BarChart data={stratData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [formatCurrencyFull(v, sym), 'Net P&L']} />
                    <ReferenceLine x={0} stroke="#94a3b8" />
                    <Bar dataKey="net" radius={[0, 3, 3, 0]}>
                      {stratData.map((entry, i) => <Cell key={i} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card noPad>
                <div className="p-3 border-b border-surface-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Strategy Details</h3>
                </div>
                <div className="divide-y divide-surface-50 dark:divide-slate-800/50">
                  {stratData.map(s => (
                    <div key={s.name} className="px-3 py-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</span>
                        <span className={cn('text-sm font-bold', getNetColor(s.net))}>
                          {s.net >= 0 ? '+' : ''}{formatCurrency(s.net, sym)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>{s.plays} plays</span>
                        <span>Cost: {formatCurrency(s.cost, sym)}</span>
                        <span>Win: {formatCurrency(s.winnings, sym)}</span>
                        <span>ROI: {s.cost > 0 ? ((s.net / s.cost) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* INSIGHTS */}
      {tab === 'insights' && (
        <div className="space-y-3 animate-fade-in">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI-Generated Insights</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Based on your historical data. No predictions — purely analytical.</p>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 bg-surface-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Risk monitor */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Risk Monitor</h3>
            <div className="space-y-3">
              {[
                { label: 'Overall Risk', value: snapshot.riskScore, max: 100, color: snapshot.riskScore > 70 ? 'bg-red-500' : snapshot.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500' },
                { label: 'Drawdown Exposure', value: snapshot.currentDrawdown, max: Math.max(snapshot.maxDrawdown, 1), color: 'bg-red-400' },
                { label: 'Capital Efficiency', value: snapshot.capitalEfficiency, max: 100, color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{item.label}</span>
                    <span>{item.label === 'Overall Risk' ? `${item.value.toFixed(0)}/100` : `${((item.value / item.max) * 100).toFixed(0)}%`}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Exposure Monitor</h3>
            {stratStatuses.length === 0 ? (
              <p className="text-xs text-slate-400">No active strategies.</p>
            ) : (
              <div className="space-y-2">
                {stratStatuses.map(ss => (
                  <div key={ss.strategy.id} className="flex items-center justify-between py-1.5 border-b border-surface-50 dark:border-slate-800 last:border-0">
                    <div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ss.strategy.name}</span>
                      <Badge variant={ss.status === 'at-risk' ? 'danger' : ss.status === 'active' ? 'success' : 'default'} className="ml-1.5">{ss.status}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Bet: {financialSettings.currencySymbol}{ss.currentBet}</p>
                      <p className={cn('text-xs font-medium', getNetColor(ss.lifetimeNet))}>{formatCurrency(ss.lifetimeNet, financialSettings.currencySymbol)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
