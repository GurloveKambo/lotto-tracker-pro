import React, { useState, useMemo } from 'react'
import { useStore } from '../../stores'
import { computeAutoPlays } from '../../services/scheduling'
import {
  Button, Card, Modal, Input, Select, Badge,
  ConfirmDialog, EmptyState, Tabs, Textarea,
} from '../ui'
import { useToast } from '../ToastContext'
import { cn, today, getNetColor } from '../../utils'
import {
  Plus, ListChecks, Edit2, Trash2, Target,
  Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { GameResult, PlayRecord } from '../../types'
import { format, parseISO } from 'date-fns'

// ─── Single-number picker (0–99 radio grid) ───────────────────────────────────
function NumberPicker({
  value,
  onChange,
  label,
}: {
  value: number | null
  onChange: (n: number) => void
  label?: string
}) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          {label}
          {value !== null && (
            <span className="ml-2 text-primary-600 font-bold">
              → {String(value).padStart(2, '0')}
            </span>
          )}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 100 }, (_, i) => i).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'w-9 h-9 rounded-lg text-xs font-mono font-semibold transition-all',
              value === n
                ? 'bg-primary-600 text-white ring-2 ring-primary-400 scale-110 shadow'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-surface-200 dark:hover:bg-slate-700',
            )}
          >
            {String(n).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ResultsPage() {
  const {
    games, strategies, cycles, plays, results,
    addResult, updateResult, deleteResult,
    addPlay, updatePlay, deletePlay,
    addCycle, updateCycle,
    financialSettings,
  } = useStore()
  const { toast } = useToast()
  const [tab, setTab] = useState('results')

  // ── Result form ────────────────────────────────────────────────────────────
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [editingResult, setEditingResult] = useState<GameResult | null>(null)
  const [deleteResultId, setDeleteResultId] = useState<string | null>(null)
  const [rForm, setRForm] = useState({
    gameId: '',
    drawDate: today(),
    drawTime: '',
    resultNumber: null as number | null,
    notes: '',
  })
  const [autoPreview, setAutoPreview] = useState<ReturnType<typeof computeAutoPlays> | null>(null)

  // ── Manual play form ───────────────────────────────────────────────────────
  const [playModalOpen, setPlayModalOpen] = useState(false)
  const [editingPlay, setEditingPlay] = useState<PlayRecord | null>(null)
  const [deletePlayId, setDeletePlayId] = useState<string | null>(null)
  const [pForm, setPForm] = useState({
    date: today(),
    gameId: '',
    strategyId: '',
    betAmount: financialSettings.defaultBaseBet,
    winNumber: null as number | null,  // single winning number, null = no win
    notes: '',
  })

  // ── Expanded result rows ───────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sym = financialSettings.currencySymbol
  const { payoutPerUnit, unitBet } = financialSettings

  const sortedResults = useMemo(
    () => [...results].sort((a, b) =>
      b.drawDate.localeCompare(a.drawDate) || b.drawTime.localeCompare(a.drawTime)),
    [results],
  )
  const sortedPlays = useMemo(
    () => [...plays].sort((a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [plays],
  )

  // ── Result form helpers ────────────────────────────────────────────────────
  function openAddResult() {
    const g = games[0]
    setRForm({ gameId: g?.id ?? '', drawDate: today(), drawTime: g?.drawTime ?? '', resultNumber: null, notes: '' })
    setAutoPreview(null)
    setEditingResult(null)
    setResultModalOpen(true)
  }
  function openEditResult(r: GameResult) {
    setRForm({
      gameId: r.gameId,
      drawDate: r.drawDate,
      drawTime: r.drawTime,
      resultNumber: r.resultNumber,
      notes: r.notes ?? '',
    })
    setAutoPreview(null)
    setEditingResult(r)
    setResultModalOpen(true)
  }

  function refreshPreview(f: typeof rForm) {
    if (!f.gameId || f.resultNumber === null || editingResult) {
      setAutoPreview(null)
      return
    }
    const preview = computeAutoPlays(
      f.gameId, f.drawDate, f.resultNumber,
      strategies, cycles, plays, payoutPerUnit, unitBet,
    )
    setAutoPreview(preview)
  }

  function updateRForm(updates: Partial<typeof rForm>) {
    const next = { ...rForm, ...updates }
    setRForm(next)
    refreshPreview(next)
  }

  function saveResult() {
    if (!rForm.gameId) { toast('Select a game', 'error'); return }
    if (rForm.resultNumber === null) { toast('Select the winning number', 'error'); return }

    const resultData = {
      gameId: rForm.gameId,
      drawDate: rForm.drawDate,
      drawTime: rForm.drawTime,
      resultNumber: rForm.resultNumber,
      notes: rForm.notes || undefined,
    }

    if (editingResult) {
      updateResult(editingResult.id, resultData)
      toast('Result updated', 'success')
      setResultModalOpen(false)
      return
    }

    // Save result
    addResult(resultData)

    // Execute auto-plays
    if (autoPreview) {
      // 1. Create new cycles first
      autoPreview.newCycles.forEach(nc => addCycle(nc as any))

      // 2. Add plays
      autoPreview.plays.forEach(p => addPlay(p))

      // 3. Update cycles
      autoPreview.cycleUpdates.forEach(({ cycleId, updates }) => updateCycle(cycleId, updates))

      const playCount = autoPreview.plays.length
      const trigCount = autoPreview.triggered.length
      const totalCost = autoPreview.playsSummary.reduce((s, x) => s + x.cost, 0)
      const totalNet  = autoPreview.playsSummary.reduce((s, x) => s + x.net, 0)
      const wins      = autoPreview.playsSummary.filter(x => x.won).length

      const parts: string[] = []
      if (playCount > 0) {
        parts.push(`${playCount} strateg${playCount === 1 ? 'y' : 'ies'} played`)
        parts.push(`Cost ${sym}${totalCost}`)
        parts.push(`Net ${totalNet >= 0 ? '+' : ''}${sym}${totalNet}`)
        if (wins > 0) parts.push(`🎉 ${wins} win${wins > 1 ? 's' : ''}`)
      }
      if (trigCount > 0) {
        parts.push(`⚡ ${trigCount} trigger${trigCount > 1 ? 's' : ''} activated`)
      }

      if (parts.length > 0) {
        toast(parts.join(' · '), wins > 0 ? 'success' : 'info')
      } else {
        toast('Result saved', 'success')
      }
    } else {
      toast('Result saved', 'success')
    }

    setResultModalOpen(false)
  }

  // ── Manual play helpers ───────────────────────────────────────────────────
  function openAddPlay() {
    setPForm({
      date: today(),
      gameId: games[0]?.id ?? '',
      strategyId: strategies[0]?.id ?? '',
      betAmount: financialSettings.defaultBaseBet,
      winNumber: null,
      notes: '',
    })
    setEditingPlay(null)
    setPlayModalOpen(true)
  }
  function openEditPlay(p: PlayRecord) {
    setPForm({
      date: p.date,
      gameId: p.gameId,
      strategyId: p.strategyId,
      betAmount: p.betAmount,
      winNumber: p.winningNumbers[0] ?? null,
      notes: p.notes ?? '',
    })
    setEditingPlay(p)
    setPlayModalOpen(true)
  }

  function savePlay() {
    if (!pForm.gameId || !pForm.strategyId) { toast('Select game and strategy', 'error'); return }
    const strategy = strategies.find(s => s.id === pForm.strategyId)
    if (!strategy) return

    const numberCount = strategy.numbers.length
    const cost = numberCount * pForm.betAmount
    const won = pForm.winNumber !== null && strategy.numbers.includes(pForm.winNumber)
    const winningNumbers = won ? [pForm.winNumber!] : []
    const payout = won ? (payoutPerUnit / unitBet) * pForm.betAmount : 0
    const net = payout - cost

    let activeC = cycles.find(
      c => c.strategyId === pForm.strategyId && c.gameId === pForm.gameId && c.status === 'active',
    )
    if (!activeC) {
      const nc = {
        strategyId: pForm.strategyId, gameId: pForm.gameId,
        cycleNumber: cycles.filter(c => c.strategyId === pForm.strategyId && c.gameId === pForm.gameId).length + 1,
        gamesPlayed: 0, gamesRemaining: strategy.cycleLength,
        currentBet: pForm.betAmount, startDate: pForm.date,
        status: 'active' as const, totalCost: 0, totalWinnings: 0,
      }
      addCycle(nc as any)
      activeC = useStore.getState().cycles.slice(-1)[0]
    }

    const gamesPlayed = activeC.gamesPlayed + 1
    const cycleComplete = won || gamesPlayed >= strategy.cycleLength
    const nextBet = won
      ? strategy.baseBet
      : parseFloat((pForm.betAmount * strategy.progressionMultiplier).toFixed(2))

    const playData: Omit<PlayRecord, 'id' | 'createdAt'> = {
      date: pForm.date, gameId: pForm.gameId,
      strategyId: pForm.strategyId, cycleId: activeC.id,
      betAmount: pForm.betAmount, numberCount, cost,
      winningNumbers, payout, net,
      cycleGameIndex: gamesPlayed,
      notes: pForm.notes || undefined,
    }

    if (editingPlay) {
      updatePlay(editingPlay.id, playData)
      toast('Play updated', 'success')
    } else {
      addPlay(playData)
      updateCycle(activeC.id, {
        gamesPlayed,
        gamesRemaining: Math.max(0, strategy.cycleLength - gamesPlayed),
        currentBet: nextBet,
        totalCost: activeC.totalCost + cost,
        totalWinnings: activeC.totalWinnings + payout,
        status: cycleComplete ? (won ? 'won' : 'completed') : 'active',
        endDate: cycleComplete ? pForm.date : undefined,
      })
      toast(`Recorded · Net ${net >= 0 ? '+' : ''}${sym}${net}`, won ? 'success' : 'info')
    }
    setPlayModalOpen(false)
  }

  function playsForResult(r: GameResult) {
    return plays.filter(p => p.gameId === r.gameId && p.date === r.drawDate)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Results & Plays</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Target className="w-4 h-4" />} onClick={openAddPlay}>
            Manual
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddResult}>
            Enter Result
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'results', label: `Results (${results.length})` },
          { id: 'plays',   label: `Plays (${plays.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── RESULTS TAB ────────────────────────────────────────────────────── */}
      {tab === 'results' && (
        sortedResults.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="w-12 h-12" />}
            title="No results yet"
            message="Enter draw results — active strategies auto-play instantly."
            action={<Button size="sm" onClick={openAddResult}>Enter Result</Button>}
          />
        ) : (
          <div className="space-y-2">
            {sortedResults.map(r => {
              const game = games.find(g => g.id === r.gameId)
              const linked = playsForResult(r)
              const isExp = expandedId === r.id
              const dayNet = linked.reduce((s, p) => s + p.net, 0)

              return (
                <Card key={r.id} noPad>
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: game?.color ?? '#94a3b8' }}
                    >
                      {game?.name?.slice(0, 2) ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {game?.name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-400">{r.drawDate} {r.drawTime}</span>
                        {/* Single result number badge */}
                        <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2 py-0.5 rounded-lg text-sm font-mono font-bold">
                          {String(r.resultNumber).padStart(2, '0')}
                        </span>
                        {linked.length > 0 && (
                          <Badge variant={dayNet >= 0 ? 'success' : 'danger'}>
                            {linked.length} play{linked.length > 1 ? 's' : ''} · {dayNet >= 0 ? '+' : ''}{sym}{Math.abs(dayNet)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {linked.length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExp ? null : r.id)}
                          className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400"
                        >
                          {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={() => openEditResult(r)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteResultId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExp && linked.length > 0 && (
                    <div className="border-t border-surface-100 dark:border-slate-800 divide-y divide-surface-50 dark:divide-slate-800/50">
                      {linked.map(p => {
                        const strat = strategies.find(s => s.id === p.strategyId)
                        return (
                          <div key={p.id} className="px-3 py-2 flex justify-between items-center">
                            <div>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {strat?.name ?? '—'}
                              </span>
                              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-xs text-slate-500">
                                {sym}{p.betAmount}×{p.numberCount}={sym}{p.cost}
                              </span>
                              {p.winningNumbers.length > 0 && (
                                <span className="ml-2 text-xs font-semibold text-emerald-600">
                                  🎉 Won {String(p.winningNumbers[0]).padStart(2,'0')}
                                </span>
                              )}
                            </div>
                            <span className={cn('text-xs font-semibold', getNetColor(p.net))}>
                              {p.net >= 0 ? '+' : ''}{sym}{Math.abs(p.net)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ── PLAYS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'plays' && (
        sortedPlays.length === 0 ? (
          <EmptyState
            icon={<Target className="w-12 h-12" />}
            title="No plays recorded"
            message="Plays are auto-created when you enter results, or record manually."
            action={<Button size="sm" onClick={openAddPlay}>Manual Play</Button>}
          />
        ) : (
          <div className="space-y-2">
            {sortedPlays.map(p => {
              const game     = games.find(g => g.id === p.gameId)
              const strategy = strategies.find(s => s.id === p.strategyId)
              return (
                <Card key={p.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: game?.color ?? '#94a3b8' }}
                  >
                    {game?.name?.slice(0, 2) ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{game?.name ?? '—'}</span>
                      <span className="text-xs text-slate-400">{strategy?.name ?? '—'}</span>
                      <span className="text-xs text-slate-400">· {p.date}</span>
                      {p.winningNumbers.length > 0 && (
                        <span className="text-xs font-semibold text-emerald-600">
                          🎉 {String(p.winningNumbers[0]).padStart(2,'0')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs">
                      <span className="text-slate-500">{sym}{p.betAmount}×{p.numberCount}={sym}{p.cost}</span>
                      {p.payout > 0 && <span className="text-emerald-600">+{sym}{p.payout}</span>}
                      <span className={cn('font-medium', getNetColor(p.net))}>
                        {p.net >= 0 ? '+' : ''}{sym}{p.net}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditPlay(p)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeletePlayId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ── RESULT MODAL ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={editingResult ? 'Edit Result' : 'Enter Result'}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Game"
            value={rForm.gameId}
            onChange={e => {
              const g = games.find(x => x.id === e.target.value)
              updateRForm({ gameId: e.target.value, drawTime: g?.drawTime ?? rForm.drawTime })
            }}
            options={games.map(g => ({ value: g.id, label: g.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Draw Date" type="date" value={rForm.drawDate}
              onChange={e => updateRForm({ drawDate: e.target.value })} />
            <Input label="Draw Time" type="time" value={rForm.drawTime}
              onChange={e => updateRForm({ drawTime: e.target.value })} />
          </div>

          {/* Single number picker */}
          <NumberPicker
            label="Winning Number"
            value={rForm.resultNumber}
            onChange={n => updateRForm({ resultNumber: n })}
          />

          {/* Auto-play preview */}
          {!editingResult && autoPreview && (autoPreview.plays.length > 0 || autoPreview.triggered.length > 0) && (
            <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-3 space-y-2">
              {autoPreview.plays.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    {autoPreview.plays.length} strateg{autoPreview.plays.length === 1 ? 'y' : 'ies'} will auto-play
                  </p>
                  {autoPreview.playsSummary.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs text-primary-700 dark:text-primary-300">
                      <span>{s.strategyName}{s.won ? ' 🎉' : ''}</span>
                      <span className={cn('font-semibold', s.net >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {sym}{s.cost} cost · {s.net >= 0 ? '+' : ''}{sym}{s.net}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {autoPreview.triggered.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                    <Zap className="w-3.5 h-3.5" />
                    {autoPreview.triggered.length} trigger{autoPreview.triggered.length > 1 ? 's' : ''} activated — will play from next draw
                  </p>
                  {autoPreview.triggered.map((t, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                      ⚡ {t.strategyName} triggered by {String(t.triggerNumber).padStart(2,'0')}
                    </p>
                  ))}
                </>
              )}
            </div>
          )}

          {!editingResult && rForm.resultNumber !== null && autoPreview &&
            autoPreview.plays.length === 0 && autoPreview.triggered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-1">
              No active strategies scheduled for this game on this date.
            </p>
          )}

          <Textarea label="Notes (optional)" value={rForm.notes}
            onChange={e => setRForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any notes about this draw…" />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setResultModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={saveResult}>
              {editingResult ? 'Save' : (
                autoPreview && (autoPreview.plays.length > 0 || autoPreview.triggered.length > 0)
                  ? `Save & Execute (${autoPreview.plays.length + autoPreview.triggered.length})`
                  : 'Save Result'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MANUAL PLAY MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={playModalOpen}
        onClose={() => setPlayModalOpen(false)}
        title={editingPlay ? 'Edit Play' : 'Manual Play'}
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={pForm.date}
            onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Game" value={pForm.gameId}
              onChange={e => setPForm(f => ({ ...f, gameId: e.target.value }))}
              options={[{ value: '', label: 'Select…' }, ...games.map(g => ({ value: g.id, label: g.name }))]} />
            <Select label="Strategy" value={pForm.strategyId}
              onChange={e => setPForm(f => ({ ...f, strategyId: e.target.value }))}
              options={[{ value: '', label: 'Select…' }, ...strategies.map(s => ({ value: s.id, label: s.name }))]} />
          </div>
          <Input label={`Bet Amount (${sym})`} type="number" min={1} value={pForm.betAmount}
            onChange={e => setPForm(f => ({ ...f, betAmount: +e.target.value }))} />

          {pForm.strategyId && (() => {
            const s = strategies.find(x => x.id === pForm.strategyId)
            if (!s) return null
            return (
              <div className="px-3 py-2 bg-surface-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500">
                {s.numbers.length} numbers · Cost {sym}{s.numbers.length * pForm.betAmount}
                · Win pays {sym}{(payoutPerUnit / unitBet) * pForm.betAmount}
              </div>
            )
          })()}

          <NumberPicker
            label="Winning Number (tap the number that won, or leave unselected for no win)"
            value={pForm.winNumber}
            onChange={n => {
              // Tap same number again to deselect
              setPForm(f => ({ ...f, winNumber: f.winNumber === n ? null : n }))
            }}
          />

          {pForm.strategyId && (() => {
            const s = strategies.find(x => x.id === pForm.strategyId)
            if (!s) return null
            const cost   = s.numbers.length * pForm.betAmount
            const won    = pForm.winNumber !== null && s.numbers.includes(pForm.winNumber)
            const payout = won ? (payoutPerUnit / unitBet) * pForm.betAmount : 0
            const net    = payout - cost
            return (
              <div className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium',
                won ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-surface-50 dark:bg-slate-800/50 text-slate-500',
              )}>
                {won ? `🎉 Won! Payout ${sym}${payout}` : 'No win'} · Net {net >= 0 ? '+' : ''}{sym}{net}
                {pForm.winNumber !== null && !won && (
                  <span className="ml-1 text-amber-500">
                    · {String(pForm.winNumber).padStart(2,'0')} not in strategy numbers
                  </span>
                )}
              </div>
            )
          })()}

          <Textarea label="Notes" value={pForm.notes}
            onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional…" />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPlayModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={savePlay}>{editingPlay ? 'Save' : 'Record Play'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteResultId} onClose={() => setDeleteResultId(null)}
        onConfirm={() => { if (deleteResultId) { deleteResult(deleteResultId); toast('Deleted', 'success') } }}
        title="Delete Result" message="Permanently delete this draw result." confirmLabel="Delete" />
      <ConfirmDialog isOpen={!!deletePlayId} onClose={() => setDeletePlayId(null)}
        onConfirm={() => { if (deletePlayId) { deletePlay(deletePlayId); toast('Deleted', 'success') } }}
        title="Delete Play" message="Permanently delete this play record." confirmLabel="Delete" />
    </div>
  )
}
