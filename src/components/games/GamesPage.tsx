import React, { useState } from 'react'
import { useStore } from '../../stores'
import { Button, Card, Modal, Input, Toggle, Badge, ConfirmDialog, EmptyState } from '../ui'
import { useToast } from '../ToastContext'
import { cn, generateId, GAME_COLORS } from '../../utils'
import { Plus, Edit2, Trash2, Gamepad2, CalendarDays } from 'lucide-react'
import type { Game, DayOfWeek } from '../../types'
import { getDaysInMonth } from 'date-fns'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SAMPLE_GAMES = [
  { name: 'FRBD', drawTime: '11:45', activeDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as DayOfWeek[], skipDaysOfMonth: [], belongsToPreviousDay: false, color: '#F97316' },
  { name: 'GZBD', drawTime: '15:00', activeDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as DayOfWeek[], skipDaysOfMonth: [], belongsToPreviousDay: false, color: '#6366F1' },
  { name: 'GALI', drawTime: '18:30', activeDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as DayOfWeek[], skipDaysOfMonth: [], belongsToPreviousDay: false, color: '#10B981' },
  { name: 'DSWR', drawTime: '21:00', activeDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as DayOfWeek[], skipDaysOfMonth: [], belongsToPreviousDay: true, color: '#F59E0B' },
]

interface GameFormData {
  name: string
  drawTime: string
  activeDays: DayOfWeek[]
  skipDaysOfMonth: number[]
  belongsToPreviousDay: boolean
  color: string
  isActive: boolean
}

const DEFAULT_FORM: GameFormData = {
  name: '', drawTime: '18:00',
  activeDays: [...DAYS],
  skipDaysOfMonth: [],
  belongsToPreviousDay: false, color: '#F97316', isActive: true,
}

// How many days this game runs in a 28 / 29 / 30 / 31-day month
function activeDaysInMonth(form: GameFormData, daysInMonth: number): number {
  // count days of month whose dow is in activeDays and not in skipDaysOfMonth
  let count = 0
  const year = new Date().getFullYear()
  const month = new Date().getMonth() // current month as reference
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const dow = DAYS[((date.getDay() + 6) % 7)] // Mon=0 index in DAYS
    if (form.activeDays.includes(dow) && !form.skipDaysOfMonth.includes(d)) count++
  }
  return count
}

export function GamesPage() {
  const { games, addGame, updateGame, deleteGame } = useStore()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<GameFormData>(DEFAULT_FORM)

  // Reference month for the skip-days calendar (current month)
  const now = new Date()
  const refYear = now.getFullYear()
  const refMonth = now.getMonth() // 0-indexed
  const daysThisMonth = getDaysInMonth(new Date(refYear, refMonth))
  const daysNextMonth = getDaysInMonth(new Date(refYear, refMonth + 1))

  function openAdd() { setForm(DEFAULT_FORM); setEditingGame(null); setModalOpen(true) }
  function openEdit(game: Game) {
    setForm({
      name: game.name, drawTime: game.drawTime, activeDays: game.activeDays,
      skipDaysOfMonth: game.skipDaysOfMonth ?? [],
      belongsToPreviousDay: game.belongsToPreviousDay,
      color: game.color, isActive: game.isActive,
    })
    setEditingGame(game)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast('Game name is required', 'error'); return }
    if (form.activeDays.length === 0) { toast('Select at least one active day', 'error'); return }
    if (editingGame) {
      updateGame(editingGame.id, form)
      toast(`"${form.name}" updated`, 'success')
    } else {
      addGame(form)
      toast(`"${form.name}" added`, 'success')
    }
    setModalOpen(false)
  }

  function toggleDay(day: DayOfWeek) {
    setForm(f => ({
      ...f,
      activeDays: f.activeDays.includes(day)
        ? f.activeDays.filter(d => d !== day)
        : [...f.activeDays, day],
    }))
  }

  function toggleSkipDay(day: number) {
    setForm(f => ({
      ...f,
      skipDaysOfMonth: f.skipDaysOfMonth.includes(day)
        ? f.skipDaysOfMonth.filter(d => d !== day)
        : [...f.skipDaysOfMonth, day].sort((a, b) => a - b),
    }))
  }

  function loadSamples() {
    SAMPLE_GAMES.forEach(g => {
      if (!games.some(existing => existing.name === g.name))
        addGame({ ...g, isActive: true })
    })
    toast('Sample games added', 'success')
  }

  // Active day summary for a game
  function gameDaySummary(game: Game) {
    const skip = game.skipDaysOfMonth ?? []
    const activeDaysCount = activeDaysInMonth({ ...game, skipDaysOfMonth: skip }, daysThisMonth)
    return `${activeDaysCount} days/month this month`
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Games</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {games.length} game{games.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Game</Button>
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 className="w-12 h-12" />}
          title="No games yet"
          message="Add your lottery games (FRBD, GZBD, GALI, DSWR) or load sample games."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={openAdd}>Add Game</Button>
              <Button size="sm" variant="secondary" onClick={loadSamples}>Load Samples</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {games.map(game => (
            <Card key={game.id} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: game.color }}
              >
                {game.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{game.name}</span>
                  <Badge variant={game.isActive ? 'success' : 'default'}>
                    {game.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {game.belongsToPreviousDay && <Badge variant="info">Prev Day</Badge>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Draw: {game.drawTime}
                  {' · '}
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {gameDaySummary(game)}
                  </span>
                  {(game.skipDaysOfMonth ?? []).length > 0 && (
                    <span className="ml-1 text-amber-500">
                      · skips day{(game.skipDaysOfMonth ?? []).length > 1 ? 's' : ''}{' '}
                      {(game.skipDaysOfMonth ?? []).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(game)}
                  className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(game.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Game Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGame ? 'Edit Game' : 'Add Game'}
        size="lg"
      >
        <div className="space-y-5">
          <Input
            label="Game Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. FRBD, GZBD, GALI, DSWR"
          />
          <Input
            label="Draw Time"
            type="time"
            value={form.drawTime}
            onChange={e => setForm(f => ({ ...f, drawTime: e.target.value }))}
          />

          {/* Days of week */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Active Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    form.activeDays.includes(day)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Skip days of month */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary-600" />
                Skip Days of Month
              </label>
              {form.skipDaysOfMonth.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, skipDaysOfMonth: [] }))}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Summary line */}
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Active days this month ({daysThisMonth}d): {' '}
              <span className="font-semibold text-primary-600">
                {activeDaysInMonth(form, daysThisMonth)} plays
              </span>
              {' · '}Next month ({daysNextMonth}d):{' '}
              <span className="font-semibold text-primary-600">
                {activeDaysInMonth(form, daysNextMonth)} plays
              </span>
              {form.skipDaysOfMonth.length > 0 && (
                <span className="ml-1 text-amber-500">
                  · skipping day{form.skipDaysOfMonth.length > 1 ? 's' : ''}{' '}
                  {form.skipDaysOfMonth.join(', ')}
                </span>
              )}
            </div>

            {/* Day picker grid — 1..31 */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                const isSkipped = form.skipDaysOfMonth.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleSkipDay(d)}
                    title={isSkipped ? `Day ${d} is skipped` : `Click to skip day ${d}`}
                    className={cn(
                      'h-8 rounded-lg text-xs font-medium transition-all border',
                      isSkipped
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600',
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              Red = skipped. E.g. skip day 1 → game runs {daysThisMonth - (form.skipDaysOfMonth.includes(1) ? 1 : 0)} days this month.
            </p>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Colour
            </label>
            <div className="flex flex-wrap gap-2">
              {GAME_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn(
                    'w-7 h-7 rounded-lg transition-transform',
                    form.color === c && 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Toggle
            checked={form.belongsToPreviousDay}
            onChange={v => setForm(f => ({ ...f, belongsToPreviousDay: v }))}
            label="Results belong to previous day (e.g. DSWR)"
          />
          <Toggle
            checked={form.isActive}
            onChange={v => setForm(f => ({ ...f, isActive: v }))}
            label="Game is active"
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {editingGame ? 'Save Changes' : 'Add Game'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) { deleteGame(deleteId); toast('Game deleted', 'success') }
        }}
        title="Delete Game"
        message="This will permanently delete the game. Associated plays and results will remain but become unlinked."
        confirmLabel="Delete"
      />
    </div>
  )
}
