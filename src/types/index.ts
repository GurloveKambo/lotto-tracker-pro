// ─── CORE MODELS ──────────────────────────────────────────────────────────────

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
export type Theme = 'light' | 'dark' | 'system' | 'midnight' | 'graphite' | 'ocean' | 'forest' | 'gold'

// ─── GAME ─────────────────────────────────────────────────────────────────────

export interface Game {
  id: string
  name: string
  drawTime: string            // "HH:MM"
  activeDays: DayOfWeek[]
  skipDaysOfMonth: number[]   // day-of-month numbers to skip (1–31), e.g. [1] = skip 1st of every month
  belongsToPreviousDay: boolean
  color: string               // hex
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── STRATEGY ─────────────────────────────────────────────────────────────────

export type StrategyType = 'date-based' | 'trigger-based'
export type DateSchedule = 'every-day' | 'specific-days' | 'first-x-days' | 'last-x-days' | 'weekdays' | 'custom'
export type TriggerMode = 'any-in-set' | 'specific-numbers' | 'manual'
export type TriggerBehaviour = 'ignore' | 'queue' | 'restart'
export type CycleLength = 8 | 12 | number

export interface Strategy {
  id: string
  name: string
  type: StrategyType
  numbers: number[]           // exactly 36 numbers (1–36 or 0-99, user-defined)
  baseBet: number
  progressionMultiplier: number
  cycleLength: CycleLength
  isActive: boolean
  // Date-based config
  dateSchedule?: DateSchedule
  specificDays?: DayOfWeek[]
  firstXDays?: number
  lastXDays?: number
  customCalendarDays?: number[] // day-of-month
  // Trigger-based config
  triggerMode?: TriggerMode
  triggerNumbers?: number[]
  triggerBehaviour?: TriggerBehaviour
  // Risk limits
  maxDailyLoss?: number
  maxExposure?: number
  // Metadata
  createdAt: string
  updatedAt: string
}

// ─── GAME RESULT ──────────────────────────────────────────────────────────────

export interface GameResult {
  id: string
  gameId: string
  drawDate: string            // "YYYY-MM-DD"
  drawTime: string            // "HH:MM"
  resultNumber: number        // single winning number
  enteredAt: string
  notes?: string
}

// ─── STRATEGY CYCLE ───────────────────────────────────────────────────────────

export interface StrategyCycle {
  id: string
  strategyId: string
  gameId: string
  cycleNumber: number
  gamesPlayed: number
  gamesRemaining: number
  currentBet: number
  startDate: string
  endDate?: string
  status: 'waiting-trigger' | 'active' | 'won' | 'completed' | 'paused'
  totalCost: number
  totalWinnings: number
  triggeredAt?: string        // date trigger fired
  triggeredByResultId?: string
}

// ─── PLAY RECORD ──────────────────────────────────────────────────────────────

export interface PlayRecord {
  id: string
  date: string                // "YYYY-MM-DD"
  gameId: string
  strategyId: string
  cycleId: string
  resultId?: string
  betAmount: number
  numberCount: number
  cost: number                // numberCount × betAmount
  winningNumbers: number[]
  payout: number              // winningNumbers.length × 95 × betAmount (₹950 per ₹10)
  net: number                 // payout - cost
  cycleGameIndex: number      // position within cycle (1-based)
  triggeredBy?: string        // resultId that triggered this play
  notes?: string
  createdAt: string
}

// ─── AUDIT RECORD ─────────────────────────────────────────────────────────────

export type AuditAction =
  | 'game.created' | 'game.updated' | 'game.deleted'
  | 'strategy.created' | 'strategy.updated' | 'strategy.deleted'
  | 'result.entered' | 'result.updated' | 'result.deleted'
  | 'play.created' | 'play.updated' | 'play.deleted'
  | 'balance.set' | 'settings.changed' | 'data.imported' | 'data.exported'

export interface AuditRecord {
  id: string
  timestamp: string
  action: AuditAction
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  description: string
}

// ─── OPENING BALANCE ──────────────────────────────────────────────────────────

export interface OpeningBalance {
  id: string
  openingDate: string
  mode: 'net' | 'detailed'
  openingCost: number
  openingWinnings: number
  openingNet: number
  notes?: string
  createdAt: string
}

// ─── FINANCIAL SETTINGS ───────────────────────────────────────────────────────

export interface FinancialSettings {
  currency: string            // '₹'
  currencySymbol: string
  defaultBaseBet: number
  defaultMultiplier: number
  payoutPerUnit: number       // 950 (₹950 per ₹10)
  unitBet: number             // 10
}

// ─── ANALYTICS SNAPSHOT ───────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  date: string
  totalCost: number
  totalWinnings: number
  netPnl: number
  roi: number
  winRate: number
  avgDailyCost: number
  avgDailyWinnings: number
  currentDrawdown: number
  maxDrawdown: number
  longestWinStreak: number
  longestLossStreak: number
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'neutral'
  capitalEfficiency: number
  riskScore: number
  volatility: number
}

// ─── THEME SETTINGS ───────────────────────────────────────────────────────────

export interface ThemeSettings {
  theme: Theme
  accentColor?: string
}

// ─── REPORT DEFINITION ────────────────────────────────────────────────────────

export type ReportType = 'daily-pnl' | 'strategy' | 'game' | 'analytics' | 'audit' | 'reconciliation'

export interface ReportDefinition {
  id: string
  name: string
  type: ReportType
  filters: {
    dateFrom?: string
    dateTo?: string
    strategyIds?: string[]
    gameIds?: string[]
  }
  createdAt: string
}

// ─── APP STATE ────────────────────────────────────────────────────────────────

export interface AppState {
  games: Game[]
  strategies: Strategy[]
  cycles: StrategyCycle[]
  results: GameResult[]
  plays: PlayRecord[]
  audits: AuditRecord[]
  openingBalance: OpeningBalance | null
  financialSettings: FinancialSettings
  themeSettings: ThemeSettings
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export interface DashboardStats {
  todayCost: number
  todayWinnings: number
  todayNet: number
  lifetimeCost: number
  lifetimeWinnings: number
  lifetimeNet: number
  currentExposure: number
  activeCycles: number
  activeStrategies: number
  thisMonthCost: number
  thisMonthWinnings: number
  thisMonthNet: number
  roi: number
  winRate: number
}

// ─── STRATEGY STATUS ──────────────────────────────────────────────────────────

export interface StrategyStatus {
  strategy: Strategy
  activeCycles: StrategyCycle[]
  currentBet: number
  todayCost: number
  todayNet: number
  lifetimeCost: number
  lifetimeNet: number
  cycleProgress: number       // 0-1
  status: 'active' | 'idle' | 'paused' | 'at-risk'
}

// ─── CHART DATA ───────────────────────────────────────────────────────────────

export interface EquityPoint {
  date: string
  equity: number
  cost: number
  winnings: number
  net: number
}

export interface CalendarDay {
  date: string
  net: number
  cost: number
  winnings: number
  plays: number
  hasData: boolean
}
