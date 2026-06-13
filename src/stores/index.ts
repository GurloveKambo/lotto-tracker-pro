import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Game, Strategy, StrategyCycle, GameResult, PlayRecord,
  AuditRecord, OpeningBalance, FinancialSettings, ThemeSettings,
  AuditAction, AppState,
} from '../types'
import { generateId, today } from '../utils'

function audit(action: AuditAction, entityType: string, entityId: string, description: string, before?: unknown, after?: unknown): AuditRecord {
  return { id: generateId(), timestamp: new Date().toISOString(), action, entityType, entityId, before, after, description }
}

const DEFAULT_FINANCIAL: FinancialSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultBaseBet: 10,
  defaultMultiplier: 2,
  payoutPerUnit: 950,
  unitBet: 10,
}

const DEFAULT_THEME: ThemeSettings = { theme: 'system' }

interface StoreState extends AppState {
  // Game actions
  addGame: (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateGame: (id: string, updates: Partial<Game>) => void
  deleteGame: (id: string) => void
  // Strategy actions
  addStrategy: (s: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateStrategy: (id: string, updates: Partial<Strategy>) => void
  deleteStrategy: (id: string) => void
  toggleStrategy: (id: string) => void
  // Cycle actions
  addCycle: (cycle: Omit<StrategyCycle, 'id'>) => void
  updateCycle: (id: string, updates: Partial<StrategyCycle>) => void
  // Result actions
  addResult: (r: Omit<GameResult, 'id' | 'enteredAt'>) => void
  updateResult: (id: string, updates: Partial<GameResult>) => void
  deleteResult: (id: string) => void
  // Play actions
  addPlay: (p: Omit<PlayRecord, 'id' | 'createdAt'>) => void
  updatePlay: (id: string, updates: Partial<PlayRecord>) => void
  deletePlay: (id: string) => void
  bulkAddPlays: (plays: Omit<PlayRecord, 'id' | 'createdAt'>[]) => void
  // Balance actions
  setOpeningBalance: (b: Omit<OpeningBalance, 'id' | 'createdAt'>) => void
  // Settings actions
  updateFinancialSettings: (s: Partial<FinancialSettings>) => void
  updateThemeSettings: (s: Partial<ThemeSettings>) => void
  // Data management
  exportData: () => AppState
  importData: (data: AppState) => void
  clearAllData: () => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      games: [],
      strategies: [],
      cycles: [],
      results: [],
      plays: [],
      audits: [],
      openingBalance: null,
      financialSettings: DEFAULT_FINANCIAL,
      themeSettings: DEFAULT_THEME,

      addGame: (game) => {
        const now = new Date().toISOString()
        const newGame: Game = { skipDaysOfMonth: [], ...game, id: generateId(), createdAt: now, updatedAt: now }
        set(s => ({
          games: [...s.games, newGame],
          audits: [...s.audits, audit('game.created', 'game', newGame.id, `Added game "${newGame.name}"`, undefined, newGame)],
        }))
      },
      updateGame: (id, updates) => {
        const before = get().games.find(g => g.id === id)
        const after = { ...before, ...updates, updatedAt: new Date().toISOString() }
        set(s => ({
          games: s.games.map(g => g.id === id ? after as Game : g),
          audits: [...s.audits, audit('game.updated', 'game', id, `Updated game "${after.name}"`, before, after)],
        }))
      },
      deleteGame: (id) => {
        const game = get().games.find(g => g.id === id)
        set(s => ({
          games: s.games.filter(g => g.id !== id),
          audits: [...s.audits, audit('game.deleted', 'game', id, `Deleted game "${game?.name}"`, game)],
        }))
      },

      addStrategy: (strategy) => {
        const now = new Date().toISOString()
        const s: Strategy = { ...strategy, id: generateId(), createdAt: now, updatedAt: now }
        set(st => ({
          strategies: [...st.strategies, s],
          audits: [...st.audits, audit('strategy.created', 'strategy', s.id, `Added strategy "${s.name}"`, undefined, s)],
        }))
      },
      updateStrategy: (id, updates) => {
        const before = get().strategies.find(s => s.id === id)
        const after = { ...before, ...updates, updatedAt: new Date().toISOString() }
        set(s => ({
          strategies: s.strategies.map(st => st.id === id ? after as Strategy : st),
          audits: [...s.audits, audit('strategy.updated', 'strategy', id, `Updated strategy "${after.name}"`, before, after)],
        }))
      },
      deleteStrategy: (id) => {
        const strategy = get().strategies.find(s => s.id === id)
        set(s => ({
          strategies: s.strategies.filter(st => st.id !== id),
          audits: [...s.audits, audit('strategy.deleted', 'strategy', id, `Deleted strategy "${strategy?.name}"`, strategy)],
        }))
      },
      toggleStrategy: (id) => {
        const strategy = get().strategies.find(s => s.id === id)
        if (strategy) get().updateStrategy(id, { isActive: !strategy.isActive })
      },

      addCycle: (cycle) => {
        const newCycle: StrategyCycle = { ...cycle, id: (cycle as any).id ?? generateId() }
        set(s => ({ cycles: [...s.cycles, newCycle] }))
      },
      updateCycle: (id, updates) => {
        set(s => ({ cycles: s.cycles.map(c => c.id === id ? { ...c, ...updates } : c) }))
      },

      addResult: (r) => {
        const newR: GameResult = { ...r, id: generateId(), enteredAt: new Date().toISOString() }
        set(s => ({
          results: [...s.results, newR],
          audits: [...s.audits, audit('result.entered', 'result', newR.id, `Result entered for ${newR.drawDate}`, undefined, newR)],
        }))
      },
      updateResult: (id, updates) => {
        const before = get().results.find(r => r.id === id)
        set(s => ({
          results: s.results.map(r => r.id === id ? { ...r, ...updates } : r),
          audits: [...s.audits, audit('result.updated', 'result', id, `Updated result`, before, { ...before, ...updates })],
        }))
      },
      deleteResult: (id) => {
        const result = get().results.find(r => r.id === id)
        set(s => ({
          results: s.results.filter(r => r.id !== id),
          audits: [...s.audits, audit('result.deleted', 'result', id, `Deleted result`, result)],
        }))
      },

      addPlay: (p) => {
        const newP: PlayRecord = { ...p, id: generateId(), createdAt: new Date().toISOString() }
        set(s => ({
          plays: [...s.plays, newP],
          audits: [...s.audits, audit('play.created', 'play', newP.id, `Play recorded: cost ₹${newP.cost}, payout ₹${newP.payout}`, undefined, newP)],
        }))
      },
      updatePlay: (id, updates) => {
        const before = get().plays.find(p => p.id === id)
        set(s => ({
          plays: s.plays.map(p => p.id === id ? { ...p, ...updates } : p),
          audits: [...s.audits, audit('play.updated', 'play', id, `Updated play`, before, { ...before, ...updates })],
        }))
      },
      deletePlay: (id) => {
        const play = get().plays.find(p => p.id === id)
        set(s => ({
          plays: s.plays.filter(p => p.id !== id),
          audits: [...s.audits, audit('play.deleted', 'play', id, `Deleted play`, play)],
        }))
      },
      bulkAddPlays: (plays) => {
        const newPlays = plays.map(p => ({ ...p, id: generateId(), createdAt: new Date().toISOString() }))
        set(s => ({
          plays: [...s.plays, ...newPlays],
          audits: [...s.audits, audit('play.created', 'play', 'bulk', `Bulk import: ${newPlays.length} plays`, undefined, newPlays.length)],
        }))
      },

      setOpeningBalance: (b) => {
        const ob: OpeningBalance = { ...b, id: generateId(), createdAt: new Date().toISOString() }
        set(s => ({
          openingBalance: ob,
          audits: [...s.audits, audit('balance.set', 'balance', ob.id, `Opening balance set: ₹${ob.openingNet}`, s.openingBalance, ob)],
        }))
      },

      updateFinancialSettings: (updates) => {
        set(s => ({
          financialSettings: { ...s.financialSettings, ...updates },
          audits: [...s.audits, audit('settings.changed', 'settings', 'financial', `Financial settings updated`, s.financialSettings, { ...s.financialSettings, ...updates })],
        }))
      },
      updateThemeSettings: (updates) => {
        set(s => ({ themeSettings: { ...s.themeSettings, ...updates } }))
      },

      exportData: () => {
        const { addGame, updateGame, deleteGame, addStrategy, updateStrategy, deleteStrategy,
          toggleStrategy, addCycle, updateCycle, addResult, updateResult, deleteResult,
          addPlay, updatePlay, deletePlay, bulkAddPlays, setOpeningBalance,
          updateFinancialSettings, updateThemeSettings, exportData, importData, clearAllData,
          ...state } = get()
        return state as AppState
      },
      importData: (data) => {
        set(() => ({
          ...data,
          audits: [...(data.audits || []), audit('data.imported', 'app', 'import', `Data imported from backup`)],
        }))
      },
      clearAllData: () => {
        set(() => ({
          games: [],
          strategies: [],
          cycles: [],
          results: [],
          plays: [],
          audits: [audit('data.imported', 'app', 'clear', 'All data cleared')],
          openingBalance: null,
          financialSettings: DEFAULT_FINANCIAL,
          themeSettings: DEFAULT_THEME,
        }))
      },
    }),
    {
      name: 'lotto-tracker-pro-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
