import React, { useMemo, useState } from 'react'
import { useStore } from '../../stores'
import { computeAnalyticsSnapshot } from '../../services/analytics'
import { exportPlaysCSV, exportResultsCSV, exportFullExcel, exportPDF, exportJSON } from '../../services/export'
import { Card, Button, Input, Select, Badge, Tabs } from '../ui'
import { cn, today, formatDate, formatDateTime, formatCurrencyFull, getNetColor, groupBy, sumBy, isInRange } from '../../utils'
import { Download, FileText, FileSpreadsheet, File, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '../ToastContext'
import { format, parseISO } from 'date-fns'

export function ReportsPage() {
  const { games, strategies, plays, results, audits, openingBalance, financialSettings } = useStore()
  const { toast } = useToast()
  const sym = financialSettings.currencySymbol
  const [tab, setTab] = useState('daily')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [filterGame, setFilterGame] = useState('')
  const [filterStrategy, setFilterStrategy] = useState('')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [auditSearch, setAuditSearch] = useState('')

  const snapshot = useMemo(() => computeAnalyticsSnapshot(plays, openingBalance), [plays, openingBalance])

  // Filtered plays
  const filteredPlays = useMemo(() => plays.filter(p => {
    if (!isInRange(p.date, dateFrom || undefined, dateTo || undefined)) return false
    if (filterGame && p.gameId !== filterGame) return false
    if (filterStrategy && p.strategyId !== filterStrategy) return false
    return true
  }), [plays, dateFrom, dateTo, filterGame, filterStrategy])

  // Daily P&L groups
  const dailyGroups = useMemo(() => {
    const byDate = groupBy(filteredPlays, p => p.date)
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayPlays]) => ({
        date,
        cost: sumBy(dayPlays, p => p.cost),
        winnings: sumBy(dayPlays, p => p.payout),
        net: sumBy(dayPlays, p => p.net),
        plays: dayPlays,
        gameBreakdown: Object.entries(groupBy(dayPlays, p => p.gameId)).map(([gid, gplays]) => ({
          game: games.find(g => g.id === gid),
          cost: sumBy(gplays, p => p.cost),
          winnings: sumBy(gplays, p => p.payout),
          net: sumBy(gplays, p => p.net),
          plays: gplays,
        })),
      }))
  }, [filteredPlays, games])

  // Strategy report
  const strategyReport = useMemo(() => strategies.map(s => {
    const sPlays = filteredPlays.filter(p => p.strategyId === s.id)
    const cost = sumBy(sPlays, p => p.cost)
    const winnings = sumBy(sPlays, p => p.payout)
    const net = winnings - cost
    const winDays = new Set(sPlays.filter(p => p.net > 0).map(p => p.date)).size
    const totalDays = new Set(sPlays.map(p => p.date)).size
    return { strategy: s, plays: sPlays.length, cost, winnings, net, roi: cost > 0 ? (net / cost) * 100 : 0, winRate: totalDays > 0 ? (winDays / totalDays) * 100 : 0 }
  }).filter(r => r.plays > 0).sort((a, b) => b.net - a.net), [filteredPlays, strategies])

  // Game report
  const gameReport = useMemo(() => games.map(g => {
    const gPlays = filteredPlays.filter(p => p.gameId === g.id)
    const cost = sumBy(gPlays, p => p.cost)
    const winnings = sumBy(gPlays, p => p.payout)
    const net = winnings - cost
    return { game: g, plays: gPlays.length, cost, winnings, net, roi: cost > 0 ? (net / cost) * 100 : 0 }
  }).filter(r => r.plays > 0).sort((a, b) => b.net - a.net), [filteredPlays, games])

  // Filtered audits
  const filteredAudits = useMemo(() => {
    let a = [...audits].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    if (auditSearch) a = a.filter(x => x.description.toLowerCase().includes(auditSearch.toLowerCase()) || x.action.includes(auditSearch.toLowerCase()))
    return a.slice(0, 200)
  }, [audits, auditSearch])

  // Totals for current filter
  const totals = useMemo(() => ({
    cost: sumBy(filteredPlays, p => p.cost),
    winnings: sumBy(filteredPlays, p => p.payout),
    net: sumBy(filteredPlays, p => p.net),
    plays: filteredPlays.length,
  }), [filteredPlays])

  function handleExportPDF() {
    try { exportPDF(filteredPlays, strategies, games, snapshot, dateFrom || undefined, dateTo || undefined); toast('PDF exported', 'success') }
    catch { toast('Export failed', 'error') }
  }
  function handleExportExcel() {
    try { exportFullExcel(plays, results, strategies, games, audits, snapshot); toast('Excel exported', 'success') }
    catch { toast('Export failed', 'error') }
  }
  function handleExportCSV() {
    try { exportPlaysCSV(filteredPlays, games, strategies); toast('CSV exported', 'success') }
    catch { toast('Export failed', 'error') }
  }
  function handleExportJSON() {
    const { exportData } = useStore.getState()
    try { exportJSON(exportData(), `lotto-tracker-backup-${today()}.json`); toast('Backup exported', 'success') }
    catch { toast('Export failed', 'error') }
  }

  const TABS = [
    { id: 'daily', label: 'Daily P&L' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'game', label: 'Game' },
    { id: 'reconciliation', label: 'Reconcile' },
    { id: 'audit', label: 'Audit' },
  ]

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Reports</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportPDF}>PDF</Button>
          <Button size="sm" variant="secondary" icon={<FileSpreadsheet className="w-3.5 h-3.5" />} onClick={handleExportExcel}>Excel</Button>
          <Button size="sm" variant="secondary" icon={<File className="w-3.5 h-3.5" />} onClick={handleExportCSV}>CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <Select label="Game" value={filterGame} onChange={e => setFilterGame(e.target.value)}
            options={[{ value: '', label: 'All Games' }, ...games.map(g => ({ value: g.id, label: g.name }))]} />
          <Select label="Strategy" value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)}
            options={[{ value: '', label: 'All Strategies' }, ...strategies.map(s => ({ value: s.id, label: s.name }))]} />
        </div>
        {/* Summary bar */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-surface-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500">{totals.plays} plays</span>
          <span className="text-slate-500">Cost: {sym}{totals.cost.toLocaleString('en-IN')}</span>
          <span className="text-emerald-600">Win: {sym}{totals.winnings.toLocaleString('en-IN')}</span>
          <span className={cn('font-semibold', getNetColor(totals.net))}>Net: {totals.net >= 0 ? '+' : ''}{sym}{Math.abs(totals.net).toLocaleString('en-IN')}</span>
        </div>
      </Card>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* DAILY P&L */}
      {tab === 'daily' && (
        <div className="space-y-2 animate-fade-in">
          {dailyGroups.length === 0 ? (
            <Card className="text-center py-8 text-sm text-slate-400">No data for selected filters.</Card>
          ) : dailyGroups.map(day => (
            <Card key={day.date} noPad>
              <button
                className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-surface-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{format(parseISO(day.date), 'dd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{format(parseISO(day.date), 'EEE, dd MMM yyyy')}</p>
                    <p className="text-xs text-slate-500">{day.plays.length} plays · Cost {sym}{day.cost}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', getNetColor(day.net))}>{day.net >= 0 ? '+' : ''}{sym}{Math.abs(day.net)}</span>
                  {expandedDay === day.date ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedDay === day.date && (
                <div className="border-t border-surface-100 dark:border-slate-800">
                  {/* Game breakdown */}
                  {day.gameBreakdown.map((gb, i) => (
                    <div key={i} className="px-3 py-2 border-b border-surface-50 dark:border-slate-800/50 last:border-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gb.game?.color ?? '#94a3b8' }} />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{gb.game?.name ?? 'Unknown'}</span>
                        </div>
                        <span className={cn('text-xs font-semibold', getNetColor(gb.net))}>{gb.net >= 0 ? '+' : ''}{sym}{Math.abs(gb.net)}</span>
                      </div>
                      {/* Individual plays */}
                      {gb.plays.map(p => {
                        const strategy = strategies.find(s => s.id === p.strategyId)
                        return (
                          <div key={p.id} className="ml-3.5 py-1 flex justify-between text-xs text-slate-500">
                            <span>{strategy?.name ?? '—'} · {sym}{p.betAmount}/num · {p.numberCount} nums</span>
                            <div className="flex gap-2">
                              <span>{sym}{p.cost}</span>
                              {p.winningNumbers.length > 0 && <span className="text-emerald-600">+{sym}{p.payout}</span>}
                              <span className={getNetColor(p.net)}>{p.net >= 0 ? '+' : ''}{sym}{p.net}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  <div className="p-3 bg-surface-50 dark:bg-slate-800/50 flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Day Total</span>
                    <div className="flex gap-4">
                      <span>Cost: {sym}{day.cost}</span>
                      <span className="text-emerald-600">Win: {sym}{day.winnings}</span>
                      <span className={getNetColor(day.net)}>{day.net >= 0 ? '+' : ''}{sym}{Math.abs(day.net)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* STRATEGY REPORT */}
      {tab === 'strategy' && (
        <div className="animate-fade-in">
          {strategyReport.length === 0 ? (
            <Card className="text-center py-8 text-sm text-slate-400">No strategy data for selected filters.</Card>
          ) : (
            <Card noPad>
              <div className="p-3 border-b border-surface-100 dark:border-slate-800 grid grid-cols-6 gap-2 text-xs font-medium text-slate-500">
                <span className="col-span-2">Strategy</span>
                <span className="text-right">Plays</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Win</span>
                <span className="text-right">Net</span>
              </div>
              <div className="divide-y divide-surface-50 dark:divide-slate-800/50">
                {strategyReport.map(r => (
                  <div key={r.strategy.id} className="p-3 grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{r.strategy.name}</p>
                      <p className="text-[10px] text-slate-400">ROI: {r.roi.toFixed(1)}% · WR: {r.winRate.toFixed(0)}%</p>
                    </div>
                    <span className="text-xs text-right text-slate-600 dark:text-slate-400">{r.plays}</span>
                    <span className="text-xs text-right text-slate-600 dark:text-slate-400">{sym}{r.cost.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-right text-emerald-600">{sym}{r.winnings.toLocaleString('en-IN')}</span>
                    <span className={cn('text-xs text-right font-semibold', getNetColor(r.net))}>{r.net >= 0 ? '+' : ''}{sym}{Math.abs(r.net).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="p-3 bg-surface-50 dark:bg-slate-800/50 grid grid-cols-6 gap-2 text-xs font-bold">
                  <span className="col-span-2 text-slate-700 dark:text-slate-300">Total</span>
                  <span className="text-right text-slate-700 dark:text-slate-300">{strategyReport.reduce((s, r) => s + r.plays, 0)}</span>
                  <span className="text-right">{sym}{strategyReport.reduce((s, r) => s + r.cost, 0).toLocaleString('en-IN')}</span>
                  <span className="text-right text-emerald-600">{sym}{strategyReport.reduce((s, r) => s + r.winnings, 0).toLocaleString('en-IN')}</span>
                  <span className={cn('text-right', getNetColor(strategyReport.reduce((s, r) => s + r.net, 0)))}>
                    {(() => { const n = strategyReport.reduce((s, r) => s + r.net, 0); return `${n >= 0 ? '+' : ''}${sym}${Math.abs(n).toLocaleString('en-IN')}` })()}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* GAME REPORT */}
      {tab === 'game' && (
        <div className="animate-fade-in">
          {gameReport.length === 0 ? (
            <Card className="text-center py-8 text-sm text-slate-400">No game data for selected filters.</Card>
          ) : (
            <Card noPad>
              <div className="p-3 border-b border-surface-100 dark:border-slate-800 grid grid-cols-5 gap-2 text-xs font-medium text-slate-500">
                <span className="col-span-2">Game</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Win</span>
                <span className="text-right">Net</span>
              </div>
              <div className="divide-y divide-surface-50 dark:divide-slate-800/50">
                {gameReport.map(r => (
                  <div key={r.game.id} className="p-3 grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.game.color }} />
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">{r.game.name}</p>
                        <p className="text-[10px] text-slate-400">ROI: {r.roi.toFixed(1)}% · {r.plays} plays</p>
                      </div>
                    </div>
                    <span className="text-xs text-right text-slate-600 dark:text-slate-400">{sym}{r.cost.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-right text-emerald-600">{sym}{r.winnings.toLocaleString('en-IN')}</span>
                    <span className={cn('text-xs text-right font-semibold', getNetColor(r.net))}>{r.net >= 0 ? '+' : ''}{sym}{Math.abs(r.net).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RECONCILIATION */}
      {tab === 'reconciliation' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Financial Reconciliation</h3>
            <div className="space-y-2">
              {[
                { label: 'Opening Balance (historical)', value: openingBalance?.openingNet ?? 0, note: openingBalance?.openingDate ? `as of ${formatDate(openingBalance.openingDate)}` : 'not set' },
                { label: 'App Recorded Cost', value: -sumBy(plays, p => p.cost) },
                { label: 'App Recorded Winnings', value: sumBy(plays, p => p.payout) },
                { label: 'App Net', value: sumBy(plays, p => p.net) },
              ].map((row, i) => (
                <div key={i} className={cn('flex justify-between items-center py-2', i < 3 && 'border-b border-surface-100 dark:border-slate-800')}>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{row.label}</p>
                    {row.note && <p className="text-xs text-slate-400">{row.note}</p>}
                  </div>
                  <span className={cn('text-sm font-semibold', getNetColor(row.value))}>{row.value >= 0 ? '+' : ''}{sym}{Math.abs(row.value).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 bg-surface-50 dark:bg-slate-800/50 -mx-4 px-4 mt-2 rounded-b-2xl">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Lifetime Net</span>
                <span className={cn('text-base font-bold', getNetColor(snapshot.netPnl))}>{snapshot.netPnl >= 0 ? '+' : ''}{sym}{Math.abs(snapshot.netPnl).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>

          <Button variant="secondary" icon={<Download className="w-4 h-4" />} className="w-full" onClick={handleExportJSON}>
            Export Full Backup (JSON)
          </Button>
        </div>
      )}

      {/* AUDIT LOG */}
      {tab === 'audit' && (
        <div className="space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 outline-none"
              placeholder="Search audit log..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
            />
          </div>
          <Card noPad>
            <div className="divide-y divide-surface-50 dark:divide-slate-800/50 max-h-[60vh] overflow-y-auto">
              {filteredAudits.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No audit records found.</div>
              ) : filteredAudits.map(a => (
                <div key={a.id} className="p-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Badge variant={a.action.includes('deleted') ? 'danger' : a.action.includes('created') ? 'success' : 'default'} className="text-[10px]">
                      {a.action.split('.')[0]}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{a.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
