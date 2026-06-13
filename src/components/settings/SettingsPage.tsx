import React, { useState, useRef } from 'react'
import { useStore } from '../../stores'
import { Button, Card, Input, Select, Toggle, Modal, Tabs, Textarea } from '../ui'
import { useToast } from '../ToastContext'
import { cn, today } from '../../utils'
import { exportJSON } from '../../services/export'
import { Sun, Moon, Monitor, Palette, DollarSign, Database, Shield, Info } from 'lucide-react'
import type { Theme, AppState } from '../../types'

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
]

const PREMIUM_THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'midnight', label: 'Midnight', color: '#1e1b4b' },
  { id: 'graphite', label: 'Graphite', color: '#374151' },
  { id: 'ocean', label: 'Ocean', color: '#0c4a6e' },
  { id: 'forest', label: 'Forest', color: '#14532d' },
  { id: 'gold', label: 'Gold', color: '#78350f' },
]

export function SettingsPage() {
  const { openingBalance, financialSettings, themeSettings, setOpeningBalance, updateFinancialSettings, updateThemeSettings, importData, clearAllData, exportData } = useStore()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState('general')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearText, setClearText] = useState('')

  // Opening balance form
  const [obForm, setObForm] = useState({
    openingDate: openingBalance?.openingDate ?? today(),
    mode: openingBalance?.mode ?? 'net' as 'net' | 'detailed',
    openingCost: openingBalance?.openingCost ?? 0,
    openingWinnings: openingBalance?.openingWinnings ?? 0,
    openingNet: openingBalance?.openingNet ?? 0,
    notes: openingBalance?.notes ?? '',
  })

  // Financial form
  const [finForm, setFinForm] = useState({ ...financialSettings })

  function saveOpeningBalance() {
    const net = obForm.mode === 'detailed' ? obForm.openingWinnings - obForm.openingCost : obForm.openingNet
    setOpeningBalance({ ...obForm, openingNet: net })
    toast('Opening balance saved', 'success')
  }

  function saveFinancial() {
    updateFinancialSettings(finForm)
    toast('Financial settings saved', 'success')
  }

  function handleExportBackup() {
    try { exportJSON(exportData(), `lotto-tracker-backup-${today()}.json`); toast('Backup exported', 'success') }
    catch { toast('Export failed', 'error') }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AppState
        if (!data.games || !data.strategies) { toast('Invalid backup file', 'error'); return }
        importData(data)
        toast(`Imported ${data.plays?.length ?? 0} plays, ${data.strategies?.length ?? 0} strategies`, 'success')
      } catch { toast('Failed to parse backup file', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClearData() {
    if (clearText !== 'DELETE') { toast('Type DELETE to confirm', 'error'); return }
    clearAllData()
    setClearConfirm(false)
    setClearText('')
    toast('All data cleared', 'success')
  }

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'balance', label: 'Opening Balance' },
    { id: 'theme', label: 'Theme' },
    { id: 'data', label: 'Data' },
    { id: 'about', label: 'About' },
  ]

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* GENERAL — Financial Settings */}
      {tab === 'general' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Financial Settings</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Currency Symbol" value={finForm.currencySymbol} onChange={e => setFinForm(f => ({ ...f, currencySymbol: e.target.value }))} placeholder="₹" />
                <Input label="Currency Code" value={finForm.currency} onChange={e => setFinForm(f => ({ ...f, currency: e.target.value }))} placeholder="INR" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Default Base Bet" type="number" min={1} value={finForm.defaultBaseBet} onChange={e => setFinForm(f => ({ ...f, defaultBaseBet: +e.target.value }))} />
                <Input label="Default Multiplier (×)" type="number" min={1} step={0.5} value={finForm.defaultMultiplier} onChange={e => setFinForm(f => ({ ...f, defaultMultiplier: +e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Unit Bet (base)" type="number" min={1} value={finForm.unitBet} onChange={e => setFinForm(f => ({ ...f, unitBet: +e.target.value }))} hint="The reference unit for payout calculation" />
                <Input label="Payout per Unit" type="number" min={1} value={finForm.payoutPerUnit} onChange={e => setFinForm(f => ({ ...f, payoutPerUnit: +e.target.value }))} hint={`₹${finForm.payoutPerUnit} for every ₹${finForm.unitBet} bet`} />
              </div>
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-xs text-primary-700 dark:text-primary-300">
                Payout rate: ₹{finForm.payoutPerUnit / finForm.unitBet} per ₹1 bet · e.g. ₹{finForm.unitBet} bet wins ₹{finForm.payoutPerUnit}
              </div>
              <Button onClick={saveFinancial} className="w-full">Save Financial Settings</Button>
            </div>
          </Card>
        </div>
      )}

      {/* OPENING BALANCE */}
      {tab === 'balance' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Opening Balance</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your historical performance before you started using this app. This is added to all lifetime totals.
            </p>
            <div className="space-y-3">
              <Input label="Opening Date" type="date" value={obForm.openingDate} onChange={e => setObForm(f => ({ ...f, openingDate: e.target.value }))} />

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Entry Mode</label>
                <div className="flex gap-2">
                  {(['net', 'detailed'] as const).map(m => (
                    <button key={m} onClick={() => setObForm(f => ({ ...f, mode: m }))}
                      className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                        obForm.mode === m ? 'bg-primary-600 text-white border-primary-600' : 'border-surface-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')}>
                      {m === 'net' ? 'Net Only' : 'Cost + Winnings'}
                    </button>
                  ))}
                </div>
              </div>

              {obForm.mode === 'net' ? (
                <Input
                  label={`Opening Net P&L (${financialSettings.currencySymbol})`}
                  type="number"
                  value={obForm.openingNet}
                  onChange={e => setObForm(f => ({ ...f, openingNet: +e.target.value }))}
                  hint="Positive = net profit, negative = net loss"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Input label={`Historical Cost (${financialSettings.currencySymbol})`} type="number" min={0} value={obForm.openingCost} onChange={e => setObForm(f => ({ ...f, openingCost: +e.target.value }))} />
                  <Input label={`Historical Winnings (${financialSettings.currencySymbol})`} type="number" min={0} value={obForm.openingWinnings} onChange={e => setObForm(f => ({ ...f, openingWinnings: +e.target.value }))} />
                  <div className="col-span-2 p-2 bg-surface-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500">
                    Computed net: {financialSettings.currencySymbol}{obForm.openingWinnings - obForm.openingCost >= 0 ? '+' : ''}{obForm.openingWinnings - obForm.openingCost}
                  </div>
                </div>
              )}

              <Textarea label="Notes (optional)" value={obForm.notes} onChange={e => setObForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Estimated from memory, Jan 2023 – May 2024" />

              {openingBalance && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
                  Currently saved: {financialSettings.currencySymbol}{openingBalance.openingNet >= 0 ? '+' : ''}{openingBalance.openingNet} as of {openingBalance.openingDate}
                </div>
              )}

              <Button onClick={saveOpeningBalance} className="w-full">Save Opening Balance</Button>
            </div>
          </Card>
        </div>
      )}

      {/* THEME */}
      {tab === 'theme' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h2>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => updateThemeSettings({ theme: t.id })}
                    className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                      themeSettings.theme === t.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-surface-200 dark:border-slate-700 text-slate-500')}>
                    {t.icon}
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Premium Themes</p>
              <div className="grid grid-cols-5 gap-2">
                {PREMIUM_THEMES.map(t => (
                  <button key={t.id} onClick={() => updateThemeSettings({ theme: t.id })}
                    className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                      themeSettings.theme === t.id ? 'border-primary-500 ring-2 ring-primary-500' : 'border-surface-200 dark:border-slate-700')}>
                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: t.color }} />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DATA MANAGEMENT */}
      {tab === 'data' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Backup & Restore</h2>
            </div>
            <div className="space-y-3">
              <Button variant="secondary" icon={<Database className="w-4 h-4" />} className="w-full" onClick={handleExportBackup}>
                Export Full Backup (JSON)
              </Button>
              <Button variant="secondary" icon={<Database className="w-4 h-4" />} className="w-full" onClick={() => fileRef.current?.click()}>
                Import from Backup
              </Button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">All data stored locally in your browser's localStorage.</p>
            </div>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
            </div>
            {!clearConfirm ? (
              <Button variant="danger" className="w-full" onClick={() => setClearConfirm(true)}>
                Clear All Data
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-red-600 dark:text-red-400">This will permanently delete all games, strategies, plays, results, and settings. Type <strong>DELETE</strong> to confirm.</p>
                <Input value={clearText} onChange={e => setClearText(e.target.value)} placeholder="Type DELETE" />
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => { setClearConfirm(false); setClearText('') }}>Cancel</Button>
                  <Button variant="danger" className="flex-1" onClick={handleClearData} disabled={clearText !== 'DELETE'}>Confirm Delete</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ABOUT */}
      {tab === 'about' && (
        <div className="space-y-4 animate-fade-in">
          <Card className="text-center py-6">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">LT</div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Lotto Tracker Pro</h2>
            <p className="text-xs text-slate-500 mt-1">Version 1.0.0</p>
            <p className="text-xs text-slate-400 mt-3 max-w-xs mx-auto">
              A personal lottery accounting and analytics app. Strictly for tracking — no predictions, tips, or gambling advice.
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Disclaimer</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This application is designed exclusively for personal financial accounting of lottery activity. It does not provide predictions, tips, probability analysis, or gambling advice of any kind. All data is stored locally on your device and is never transmitted anywhere. Use responsibly.
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Tech Stack</h3>
            <div className="flex flex-wrap gap-1.5">
              {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Zustand', 'Recharts', 'PWA'].map(t => (
                <span key={t} className="px-2 py-0.5 bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">{t}</span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
