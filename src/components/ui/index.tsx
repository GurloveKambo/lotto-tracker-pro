import React from 'react'
import { cn } from '../../utils'
import { X, ChevronDown, Check, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

// ─── BUTTON ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
    secondary: 'bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-surface-200 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void; noPad?: boolean }
export function Card({ children, className, onClick, noPad }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-sm',
        !noPad && 'p-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 transition-colors',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-surface-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
          'outline-none',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── TEXTAREA ────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <textarea
        id={inputId}
        rows={3}
        className={cn(
          'w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 resize-none transition-colors outline-none',
          error ? 'border-red-400' : 'border-surface-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[]
}
export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="relative">
        <select
          id={inputId}
          className={cn(
            'w-full px-3 py-2 pr-8 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
            'appearance-none outline-none transition-colors',
            error ? 'border-red-400' : 'border-surface-200 dark:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
            className
          )}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; label?: string; size?: 'sm' | 'md' }
export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          'relative rounded-full transition-colors',
          size === 'sm' ? 'w-8 h-4' : 'w-11 h-6',
          checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
        )}
        onClick={() => onChange(!checked)}
      >
        <span className={cn(
          'absolute top-0.5 bg-white rounded-full shadow transition-transform',
          size === 'sm' ? 'w-3 h-3 left-0.5' : 'w-5 h-5 left-0.5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5'),
        )} />
      </div>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string }
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  }
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium', variants[variant], className)}>{children}</span>
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-slide-up', sizes[size])}>
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────

interface ConfirmProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string; variant?: 'danger' | 'primary' }
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }: ConfirmProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

interface EmptyProps { icon?: React.ReactNode; title: string; message?: string; action?: React.ReactNode }
export function EmptyState({ icon, title, message, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-700 mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {message && <p className="text-xs text-slate-500 dark:text-slate-500 mb-4 max-w-xs">{message}</p>}
      {action}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: string; subValue?: string; trend?: 'up' | 'down' | 'neutral'; trendValue?: string; color?: 'default' | 'success' | 'danger' | 'warning'; icon?: React.ReactNode }
export function StatCard({ label, value, subValue, trend, trendValue, color = 'default', icon }: StatCardProps) {
  const colors = {
    default: 'text-slate-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-red-500 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 truncate">{label}</p>
          <p className={cn('text-xl font-bold leading-tight', colors[color])}>{value}</p>
          {subValue && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subValue}</p>}
        </div>
        {icon && <div className="text-slate-400 dark:text-slate-600 flex-shrink-0">{icon}</div>}
      </div>
      {trendValue && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium',
          trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
          trend === 'down' ? 'text-red-500 dark:text-red-400' : 'text-slate-500'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'} {trendValue}
        </div>
      )}
    </Card>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

interface ProgressProps { value: number; max?: number; color?: string; className?: string; label?: string }
export function ProgressBar({ value, max = 100, color = 'bg-primary-500', className, label }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full', className)}>
      {label && <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{label}</span><span>{pct.toFixed(0)}%</span></div>}
      <div className="w-full h-1.5 bg-surface-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

interface TabsProps { tabs: { id: string; label: string; icon?: React.ReactNode }[]; active: string; onChange: (id: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-surface-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            active === tab.id
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps { message: string; type?: ToastType; onClose: () => void }
export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <Info className="w-4 h-4 text-blue-500" />,
  }
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xl px-4 py-3 text-sm max-w-xs">
        {icons[type]}
        <span className="text-slate-700 dark:text-slate-200">{message}</span>
        <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
      </div>
    </div>
  )
}

// ─── NUMBER GRID ─────────────────────────────────────────────────────────────

interface NumberGridProps { selected: number[]; onChange: (numbers: number[]) => void; min?: number; max?: number; label?: string }
export function NumberGrid({ selected, onChange, min = 0, max = 99, label }: NumberGridProps) {
  const toggle = (n: number) => {
    if (selected.includes(n)) onChange(selected.filter(x => x !== n))
    else onChange([...selected, n].sort((a, b) => a - b))
  }
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  return (
    <div>
      {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">{label} ({selected.length} selected)</label>}
      <div className="flex flex-wrap gap-1.5">
        {nums.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => toggle(n)}
            className={cn(
              'w-9 h-9 rounded-lg text-xs font-mono font-semibold transition-all',
              selected.includes(n)
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-surface-200 dark:hover:bg-slate-700'
            )}
          >
            {String(n).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── LOADING SPINNER ─────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return <div className={cn('border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin', s[size])} />
}
