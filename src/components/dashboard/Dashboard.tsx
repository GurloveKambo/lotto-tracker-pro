import React, { useMemo, useState } from 'react'
import { useStore } from '../../stores'
import { computeDashboardStats, computeEquityCurve, computeCalendarHeatmap, computeAnalyticsSnapshot, computeStrategyStatuses, generateInsights } from '../../services/analytics'
import { StatCard, Card, Badge, ProgressBar, Button } from '../ui'
import { formatCurrency, formatCurrencyFull, today, getNetColor, cn } from '../../utils'
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Zap, Calendar, ChevronRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import { format, parseISO } from 'date-fns'

interface DashboardProps { onNavigate: (page: string) => void }

export function Dashboard({ onNavigate }: DashboardProps) {
  const { games, strategies, cycles, plays, results, openingBalance, financialSettings } = useStore()
  const todayStr = today()
  const [calMonth, setCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  const stats = useMemo(() => computeDashboardStats(plays, openingBalance, strategies, cycles, todayStr), [plays, openingBalance, strategies, cycles, todayStr])
  const equityCurve = useMemo(() => computeEquityCurve(plays, openingBalance), [plays, openingBalance])
  const calDays = useMemo(() => computeCalendarHeatmap(plays, calMonth.year, calMonth.month), [plays, calMonth])
  const snapshot = useMemo(() => computeAnalyticsSnapshot(plays, openingBalance), [plays, openingBalance])
  const stratStatuses = useMemo(() => computeStrategyStatuses(strategies, cycles, plays, todayStr), [strategies, cycles, plays, todayStr])
  const insights = useMemo(() => generateInsights(snapshot, stratStatuses), [snapshot, stratStatuses])

  const sym = financialSettings.currencySymbol

  const todayPlays = plays.filter(p => p.date === todayStr)

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Today's summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Today</h2>
          <span className="text-xs text-slate-400">{format(new Date(), 'EEE, dd MMM yyyy')}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Cost" value={formatCurrency(stats.todayCost, sym)} icon={<DollarSign className="w-4 h-4" />} />
          <StatCard label="Winnings" value={formatCurrency(stats.todayWinnings, sym)} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard
            label="Net"
            value={formatCurrency(stats.todayNet, sym)}
            color={stats.todayNet > 0 ? 'success' : stats.todayNet < 0 ? 'danger' : 'default'}
            icon={stats.todayNet >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Lifetime */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Lifetime</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Cost" value={formatCurrency(stats.lifetimeCost, sym)} />
          <StatCard label="Total Winnings" value={formatCurrency(stats.lifetimeWinnings, sym)} />
          <StatCard
            label="Net P&L"
            value={formatCurrency(stats.lifetimeNet, sym)}
            color={stats.lifetimeNet > 0 ? 'success' : stats.lifetimeNet < 0 ? 'danger' : 'default'}
            trendValue={`ROI: ${stats.roi.toFixed(1)}%`}
            trend={stats.roi >= 0 ? 'up' : 'down'}
          />
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={<Target className="w-4 h-4" />}
          color={stats.winRate >= 50 ? 'success' : 'warning'}
        />
        <StatCard
          label="Current Exposure"
          value={formatCurrency(stats.currentExposure, sym)}
          icon={<Activity className="w-4 h-4" />}
          color={stats.currentExposure > 0 ? 'warning' : 'default'}
          subValue={`${stats.activeCycles} active cycle${stats.activeCycles !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Equity Curve */}
      {equityCurve.length > 1 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Equity Curve</h3>
            <Badge variant={snapshot.netPnl >= 0 ? 'success' : 'danger'}>
              {formatCurrency(snapshot.netPnl, sym)}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={equityCurve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'dd/MM')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} width={45} />
              <Tooltip
                formatter={(v: number) => [formatCurrencyFull(v, sym), 'Equity']}
                labelFormatter={l => format(parseISO(l as string), 'dd MMM yyyy')}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="equity" stroke="#EA580C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Strategy Status */}
      {stratStatuses.length > 0 && (
        <Card noPad>
          <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Strategies</h3>
            <button onClick={() => onNavigate('strategies')} className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-slate-800">
            {stratStatuses.map(ss => (
              <div key={ss.strategy.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{ss.strategy.name}</span>
                    <Badge variant={ss.status === 'active' ? 'success' : ss.status === 'at-risk' ? 'danger' : ss.status === 'paused' ? 'warning' : 'default'}>
                      {ss.status}
                    </Badge>
                  </div>
                  {ss.activeCycles.length > 0 && (
                    <ProgressBar value={ss.cycleProgress} className="mt-1.5" color={ss.status === 'at-risk' ? 'bg-red-500' : 'bg-primary-500'} />
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-500">Bet: {sym}{ss.currentBet}</div>
                  <div className={cn('text-xs font-medium', getNetColor(ss.todayNet))}>
                    {ss.todayNet >= 0 ? '+' : ''}{formatCurrency(ss.todayNet, sym)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Calendar Heatmap */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            {format(new Date(calMonth.year, calMonth.month - 1, 1), 'MMMM yyyy')}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const d = new Date(calMonth.year, calMonth.month - 2, 1)
                setCalMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >‹</button>
            <button
              onClick={() => {
                const d = new Date(calMonth.year, calMonth.month, 1)
                setCalMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >›</button>
          </div>
        </div>
        <CalendarHeatmap days={calDays} sym={sym} />
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-600" /> Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <p key={i} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{insight}</p>
            ))}
          </div>
        </Card>
      )}

      {/* Recent plays */}
      {todayPlays.length > 0 && (
        <Card noPad>
          <div className="p-4 border-b border-surface-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Plays</h3>
            <button onClick={() => onNavigate('results')} className="text-xs text-primary-600 dark:text-primary-400">View All</button>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-slate-800">
            {todayPlays.slice(0, 5).map(play => {
              const game = games.find(g => g.id === play.gameId)
              const strategy = strategies.find(s => s.id === play.strategyId)
              return (
                <div key={play.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{game?.name ?? '—'}</span>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{strategy?.name ?? '—'}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{sym}{play.cost}</div>
                    <div className={cn('text-xs font-medium', getNetColor(play.net))}>{play.net >= 0 ? '+' : ''}{sym}{play.net}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {plays.length === 0 && strategies.length === 0 && (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Welcome to Lotto Tracker Pro</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Start by setting up your games and strategies</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={() => onNavigate('games')}>Add Game</Button>
            <Button size="sm" variant="secondary" onClick={() => onNavigate('strategies')}>Add Strategy</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// Calendar heatmap sub-component
function CalendarHeatmap({ days, sym }: { days: ReturnType<typeof computeCalendarHeatmap>; sym: string }) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (days.length === 0) return <p className="text-xs text-slate-400 text-center py-4">No data this month</p>

  const firstDay = parseISO(days[0].date)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0

  const cells = [...Array(startDow).fill(null), ...days]

  const maxAbs = Math.max(...days.filter(d => d.hasData).map(d => Math.abs(d.net)), 1)

  function getCellColor(day: typeof days[0] | null) {
    if (!day || !day.hasData) return 'bg-surface-100 dark:bg-slate-800'
    const intensity = Math.min(1, Math.abs(day.net) / maxAbs)
    if (day.net > 0) {
      if (intensity > 0.66) return 'bg-emerald-500'
      if (intensity > 0.33) return 'bg-emerald-300'
      return 'bg-emerald-200'
    } else if (day.net < 0) {
      if (intensity > 0.66) return 'bg-red-500'
      if (intensity > 0.33) return 'bg-red-300'
      return 'bg-red-200'
    }
    return 'bg-slate-200 dark:bg-slate-700'
  }

  const hovered = days.find(d => d.date === hoveredDay)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map(d => <div key={d} className="text-center text-[10px] text-slate-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              'aspect-square rounded-md transition-all cursor-default',
              day ? getCellColor(day) : 'bg-transparent',
              day?.hasData && 'cursor-pointer hover:opacity-80'
            )}
            onMouseEnter={() => day && setHoveredDay(day.date)}
            onMouseLeave={() => setHoveredDay(null)}
            title={day ? `${day.date}: ${sym}${day.net >= 0 ? '+' : ''}${day.net}` : ''}
          >
            {day && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[9px] text-white font-bold opacity-80">
                  {parseISO(day.date).getDate()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {hovered && hovered.hasData && (
        <div className="mt-2 p-2 bg-surface-100 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
          <span className="font-medium">{format(parseISO(hovered.date), 'dd MMM')}</span>
          {' · '}Cost: {sym}{hovered.cost}
          {' · '}Win: {sym}{hovered.winnings}
          {' · '}Net: <span className={getNetColor(hovered.net)}>{hovered.net >= 0 ? '+' : ''}{sym}{hovered.net}</span>
          {' · '}{hovered.plays} play{hovered.plays !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
        <span>Less</span>
        <div className="flex gap-0.5">
          {['bg-surface-200', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-600'].map((c, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
          ))}
        </div>
        <span>More (Win)</span>
        <div className="flex gap-0.5 ml-1">
          {['bg-red-200', 'bg-red-400', 'bg-red-600'].map((c, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
          ))}
        </div>
        <span>More (Loss)</span>
      </div>
    </div>
  )
}
