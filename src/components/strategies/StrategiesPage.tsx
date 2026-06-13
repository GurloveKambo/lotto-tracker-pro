import React, { useState } from 'react'
import { useStore } from '../../stores'
import { Button, Card, Modal, Input, Select, Toggle, Badge, ConfirmDialog, EmptyState, NumberGrid, ProgressBar, Textarea } from '../ui'
import { useToast } from '../ToastContext'
import { cn, formatCurrency } from '../../utils'
import { Plus, Edit2, Trash2, Zap, ChevronDown, ChevronUp, Power } from 'lucide-react'
import type { Strategy, StrategyType, DateSchedule, TriggerMode, TriggerBehaviour, DayOfWeek, CycleLength } from '../../types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface StrategyForm {
  name: string; type: StrategyType; numbers: number[]
  baseBet: number; progressionMultiplier: number; cycleLength: number
  isActive: boolean
  dateSchedule: DateSchedule; specificDays: DayOfWeek[]; firstXDays: number; lastXDays: number; customCalendarDays: number[]
  triggerMode: TriggerMode; triggerNumbers: number[]; triggerBehaviour: TriggerBehaviour
  maxDailyLoss: number | ''; maxExposure: number | ''
  notes: string
}

const DEFAULT_FORM: StrategyForm = {
  name: '', type: 'date-based', numbers: [],
  baseBet: 10, progressionMultiplier: 2, cycleLength: 8,
  isActive: true,
  dateSchedule: 'every-day', specificDays: [], firstXDays: 5, lastXDays: 5, customCalendarDays: [],
  triggerMode: 'any-in-set', triggerNumbers: [], triggerBehaviour: 'ignore',
  maxDailyLoss: '', maxExposure: '',
  notes: '',
}

export function StrategiesPage() {
  const { strategies, cycles, plays, addStrategy, updateStrategy, deleteStrategy, toggleStrategy, financialSettings } = useStore()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<StrategyForm>(DEFAULT_FORM)
  const sym = financialSettings.currencySymbol

  function openAdd() { setForm(DEFAULT_FORM); setEditingId(null); setModalOpen(true) }
  function openEdit(s: Strategy) {
    setForm({
      name: s.name, type: s.type, numbers: s.numbers,
      baseBet: s.baseBet, progressionMultiplier: s.progressionMultiplier, cycleLength: s.cycleLength,
      isActive: s.isActive,
      dateSchedule: s.dateSchedule ?? 'every-day', specificDays: s.specificDays ?? [], firstXDays: s.firstXDays ?? 5,
      lastXDays: s.lastXDays ?? 5, customCalendarDays: s.customCalendarDays ?? [],
      triggerMode: s.triggerMode ?? 'any-in-set', triggerNumbers: s.triggerNumbers ?? [],
      triggerBehaviour: s.triggerBehaviour ?? 'ignore',
      maxDailyLoss: s.maxDailyLoss ?? '', maxExposure: s.maxExposure ?? '',
      notes: '',
    })
    setEditingId(s.id)
    setModalOpen(true)
  }

  function upd<K extends keyof StrategyForm>(key: K, value: StrategyForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSave() {
    if (!form.name.trim()) { toast('Strategy name is required', 'error'); return }
    if (form.numbers.length === 0) { toast('Select at least one number', 'error'); return }
    if (form.baseBet < 1) { toast('Base bet must be at least ₹1', 'error'); return }

    const payload: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'> = {
      name: form.name, type: form.type, numbers: form.numbers,
      baseBet: form.baseBet, progressionMultiplier: form.progressionMultiplier,
      cycleLength: form.cycleLength, isActive: form.isActive,
      dateSchedule: form.type === 'date-based' ? form.dateSchedule : undefined,
      specificDays: form.dateSchedule === 'specific-days' ? form.specificDays : undefined,
      firstXDays: form.dateSchedule === 'first-x-days' ? form.firstXDays : undefined,
      lastXDays: form.dateSchedule === 'last-x-days' ? form.lastXDays : undefined,
      customCalendarDays: form.dateSchedule === 'custom' ? form.customCalendarDays : undefined,
      triggerMode: form.type === 'trigger-based' ? form.triggerMode : undefined,
      triggerNumbers: form.triggerMode === 'specific-numbers' ? form.triggerNumbers : undefined,
      triggerBehaviour: form.type === 'trigger-based' ? form.triggerBehaviour : undefined,
      maxDailyLoss: form.maxDailyLoss === '' ? undefined : Number(form.maxDailyLoss),
      maxExposure: form.maxExposure === '' ? undefined : Number(form.maxExposure),
    }
    if (editingId) { updateStrategy(editingId, payload); toast(`"${form.name}" updated`, 'success') }
    else { addStrategy(payload); toast(`"${form.name}" added`, 'success') }
    setModalOpen(false)
  }

  function toggleDay(day: DayOfWeek) {
    upd('specificDays', form.specificDays.includes(day) ? form.specificDays.filter(d => d !== day) : [...form.specificDays, day])
  }
  function toggleCalDay(day: number) {
    upd('customCalendarDays', form.customCalendarDays.includes(day) ? form.customCalendarDays.filter(d => d !== day) : [...form.customCalendarDays, day].sort((a, b) => a - b))
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Strategies</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{strategies.length} strateg{strategies.length !== 1 ? 'ies' : 'y'} · {strategies.filter(s => s.isActive).length} active</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>New</Button>
      </div>

      {strategies.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-12 h-12" />}
          title="No strategies yet"
          message="Create strategies to track your number sets, bet progression, and cycle performance."
          action={<Button size="sm" onClick={openAdd}>Create Strategy</Button>}
        />
      ) : (
        <div className="space-y-2">
          {strategies.map(s => {
            const sCycles = cycles.filter(c => c.strategyId === s.id && c.status === 'active')
            const sPlays = plays.filter(p => p.strategyId === s.id)
            const lifetimeNet = sPlays.reduce((sum, p) => sum + p.net, 0)
            const isExpanded = expandedId === s.id

            return (
              <Card key={s.id} noPad>
                <div className="p-3 flex items-center gap-3">
                  <div className={cn('w-2 h-10 rounded-full flex-shrink-0', s.isActive ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</span>
                      <Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? 'Active' : 'Paused'}</Badge>
                      <Badge variant="info">{s.type === 'date-based' ? 'Date' : 'Trigger'}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.numbers.length} numbers · {sym}{s.baseBet} base · ×{s.progressionMultiplier} prog · {s.cycleLength}-game cycle
                    </div>
                    {sCycles.length > 0 && (
                      <ProgressBar value={sCycles[0].gamesPlayed} max={s.cycleLength} className="mt-1.5" label="" />
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggleStrategy(s.id)} className={cn('p-1.5 rounded-lg transition-colors', s.isActive ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'text-slate-400 hover:bg-surface-100 dark:hover:bg-slate-800')}>
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-400">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-surface-100 dark:border-slate-800 p-3 space-y-3">
                    {/* Numbers */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Numbers ({s.numbers.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {s.numbers.map(n => (
                          <span key={n} className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-xs font-mono font-semibold flex items-center justify-center">
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      {s.type === 'date-based' && (
                        <p><span className="font-medium">Schedule:</span> {s.dateSchedule?.replace(/-/g, ' ')}
                          {s.dateSchedule === 'first-x-days' && ` (first ${s.firstXDays} days)`}
                          {s.dateSchedule === 'last-x-days' && ` (last ${s.lastXDays} days)`}
                          {s.dateSchedule === 'specific-days' && ` (${s.specificDays?.join(', ')})`}
                        </p>
                      )}
                      {s.type === 'trigger-based' && (
                        <>
                          <p><span className="font-medium">Trigger:</span> {s.triggerMode?.replace(/-/g, ' ')}</p>
                          <p><span className="font-medium">Behaviour:</span> {s.triggerBehaviour}</p>
                        </>
                      )}
                      {s.maxDailyLoss && <p><span className="font-medium">Max Daily Loss:</span> {sym}{s.maxDailyLoss}</p>}
                      {s.maxExposure && <p><span className="font-medium">Max Exposure:</span> {sym}{s.maxExposure}</p>}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Plays', value: sPlays.length },
                        { label: 'Total Cost', value: formatCurrency(sPlays.reduce((s, p) => s + p.cost, 0), sym) },
                        { label: 'Net P&L', value: formatCurrency(lifetimeNet, sym), colored: true, net: lifetimeNet },
                      ].map(stat => (
                        <div key={stat.label} className="bg-surface-50 dark:bg-slate-800 rounded-xl p-2 text-center">
                          <p className="text-[10px] text-slate-500 mb-0.5">{stat.label}</p>
                          <p className={cn('text-xs font-semibold', stat.colored ? (stat.net! >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-900 dark:text-white')}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Strategy Builder Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Strategy' : 'New Strategy'} size="lg">
        <div className="space-y-5">
          {/* Name & type */}
          <Input label="Strategy Name" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Alpha Set, Weekend Play" />
          <Select
            label="Strategy Type"
            value={form.type}
            onChange={e => upd('type', e.target.value as StrategyType)}
            options={[{ value: 'date-based', label: 'Date Based — plays on a schedule' }, { value: 'trigger-based', label: 'Trigger Based — plays on result match' }]}
          />

          {/* Date-based settings */}
          {form.type === 'date-based' && (
            <div className="space-y-3 p-3 bg-surface-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Schedule</p>
              <Select
                label="When to play"
                value={form.dateSchedule}
                onChange={e => upd('dateSchedule', e.target.value as DateSchedule)}
                options={[
                  { value: 'every-day', label: 'Every Day' },
                  { value: 'specific-days', label: 'Specific Days of Week' },
                  { value: 'first-x-days', label: 'First X Days of Month' },
                  { value: 'last-x-days', label: 'Last X Days of Month' },
                  { value: 'weekdays', label: 'Weekdays Only (Mon–Fri)' },
                  { value: 'custom', label: 'Custom Calendar Days' },
                ]}
              />
              {form.dateSchedule === 'specific-days' && (
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', form.specificDays.includes(d) ? 'bg-primary-600 text-white' : 'bg-surface-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400')}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
              {form.dateSchedule === 'first-x-days' && <Input label="First X days" type="number" min={1} max={28} value={form.firstXDays} onChange={e => upd('firstXDays', +e.target.value)} />}
              {form.dateSchedule === 'last-x-days' && <Input label="Last X days" type="number" min={1} max={28} value={form.lastXDays} onChange={e => upd('lastXDays', +e.target.value)} />}
              {form.dateSchedule === 'custom' && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Select day numbers (1–31)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <button key={d} type="button" onClick={() => toggleCalDay(d)}
                        className={cn('w-8 h-8 rounded-lg text-xs font-medium', form.customCalendarDays.includes(d) ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trigger-based settings */}
          {form.type === 'trigger-based' && (
            <div className="space-y-3 p-3 bg-surface-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Trigger Settings</p>
              <Select
                label="Trigger condition"
                value={form.triggerMode}
                onChange={e => upd('triggerMode', e.target.value as TriggerMode)}
                options={[
                  { value: 'any-in-set', label: 'Any number from my set wins' },
                  { value: 'specific-numbers', label: 'Specific trigger numbers win' },
                  { value: 'manual', label: 'Manual trigger' },
                ]}
              />
              {form.triggerMode === 'specific-numbers' && (
                <NumberGrid label="Trigger numbers" selected={form.triggerNumbers} onChange={v => upd('triggerNumbers', v)} min={0} max={99} />
              )}
              <Select
                label="When triggered while active"
                value={form.triggerBehaviour}
                onChange={e => upd('triggerBehaviour', e.target.value as TriggerBehaviour)}
                options={[
                  { value: 'ignore', label: 'Ignore — continue current cycle' },
                  { value: 'queue', label: 'Queue — start after current cycle ends' },
                  { value: 'restart', label: 'Restart — reset current cycle' },
                ]}
              />
            </div>
          )}

          {/* Numbers */}
          <NumberGrid label="Strategy Numbers" selected={form.numbers} onChange={v => upd('numbers', v)} min={0} max={99} />

          {/* Bet settings */}
          <div className="grid grid-cols-3 gap-3">
            <Input label={`Base Bet (${financialSettings.currencySymbol})`} type="number" min={1} value={form.baseBet} onChange={e => upd('baseBet', +e.target.value)} />
            <Input label="Multiplier (×)" type="number" min={1} step={0.5} value={form.progressionMultiplier} onChange={e => upd('progressionMultiplier', +e.target.value)} />
            <Input label="Cycle Length" type="number" min={1} value={form.cycleLength} onChange={e => upd('cycleLength', +e.target.value)} />
          </div>
          <div className="p-2 bg-surface-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400">
            Cost per game: {financialSettings.currencySymbol}{form.baseBet * form.numbers.length} · Full cycle cost (no wins): {financialSettings.currencySymbol}{
              Array.from({ length: form.cycleLength }, (_, i) => form.baseBet * Math.pow(form.progressionMultiplier, i) * form.numbers.length)
                .reduce((a, b) => a + b, 0).toFixed(0)
            }
          </div>

          {/* Risk limits */}
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Max Daily Loss (${financialSettings.currencySymbol})`} type="number" min={0} value={form.maxDailyLoss} onChange={e => upd('maxDailyLoss', e.target.value === '' ? '' : +e.target.value)} placeholder="Optional" hint="Strategy pauses if exceeded" />
            <Input label={`Max Exposure (${financialSettings.currencySymbol})`} type="number" min={0} value={form.maxExposure} onChange={e => upd('maxExposure', e.target.value === '' ? '' : +e.target.value)} placeholder="Optional" hint="Triggers at-risk alert" />
          </div>

          <Toggle checked={form.isActive} onChange={v => upd('isActive', v)} label="Strategy is active" />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Strategy'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteStrategy(deleteId); toast('Strategy deleted', 'success') } }}
        title="Delete Strategy"
        message="This permanently deletes the strategy. Historical plays will remain but become unlinked."
        confirmLabel="Delete"
      />
    </div>
  )
}
