import { parseISO, getDaysInMonth } from 'date-fns'
import type { Game, Strategy, StrategyCycle, PlayRecord } from '../types'
import { generateId } from '../utils'

const DOW_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── GAME ACTIVE ON DATE ──────────────────────────────────────────────────────

export function isGameActiveOnDate(game: Game, date: string): boolean {
  if (!game.isActive) return false
  const d = parseISO(date)
  const dow = DOW_MAP[d.getDay()]
  if (!game.activeDays.includes(dow as any)) return false
  if ((game.skipDaysOfMonth ?? []).includes(d.getDate())) return false
  return true
}

// ─── DATE-BASED SCHEDULE CHECK ────────────────────────────────────────────────

export function isDateBasedStrategyScheduledOn(strategy: Strategy, date: string): boolean {
  if (!strategy.isActive) return false
  if (strategy.type !== 'date-based') return false

  const d = parseISO(date)
  const dow = DOW_MAP[d.getDay()]
  const dayOfMonth = d.getDate()
  const daysInMonth = getDaysInMonth(d)

  switch (strategy.dateSchedule) {
    case 'every-day':    return true
    case 'weekdays':     return !['Sat', 'Sun'].includes(dow)
    case 'specific-days': return (strategy.specificDays ?? []).includes(dow as any)
    case 'first-x-days': return dayOfMonth <= (strategy.firstXDays ?? 5)
    case 'last-x-days':  return dayOfMonth > daysInMonth - (strategy.lastXDays ?? 5)
    case 'custom':       return (strategy.customCalendarDays ?? []).includes(dayOfMonth)
    default:             return true
  }
}

// ─── TRIGGER CHECK (does this result fire the trigger?) ───────────────────────

export function doesResultFireTrigger(strategy: Strategy, resultNumber: number): boolean {
  if (!strategy.isActive) return false
  if (strategy.type !== 'trigger-based') return false
  if (strategy.triggerMode === 'manual') return false

  if (strategy.triggerMode === 'any-in-set') {
    return strategy.numbers.includes(resultNumber)
  }
  if (strategy.triggerMode === 'specific-numbers') {
    return (strategy.triggerNumbers ?? []).includes(resultNumber)
  }
  return false
}

// ─── AUTO-PLAY RESULT ─────────────────────────────────────────────────────────

export interface AutoPlayOutput {
  // Plays to create
  plays: Omit<PlayRecord, 'id' | 'createdAt'>[]
  // Cycles to create (with pre-set id so plays can reference them)
  newCycles: (Omit<StrategyCycle, never> & { id: string })[]
  // Updates to existing cycles
  cycleUpdates: { cycleId: string; updates: Partial<StrategyCycle> }[]
  // Strategies newly triggered (no play today — starts next draw)
  triggered: { strategyName: string; triggerNumber: number }[]
  // Summary for toast
  playsSummary: { strategyName: string; cost: number; payout: number; net: number; won: boolean }[]
}

export function computeAutoPlays(
  gameId: string,
  drawDate: string,
  resultNumber: number,           // single number
  strategies: Strategy[],
  allCycles: StrategyCycle[],
  allPlays: PlayRecord[],
  payoutPerUnit: number,
  unitBet: number,
): AutoPlayOutput {
  const out: AutoPlayOutput = {
    plays: [], newCycles: [], cycleUpdates: [], triggered: [], playsSummary: [],
  }

  for (const strategy of strategies) {
    if (!strategy.isActive) continue

    // Prevent double-play: if a play already exists for this strategy+game+date, skip
    const alreadyPlayed = allPlays.some(
      p => p.strategyId === strategy.id && p.gameId === gameId && p.date === drawDate,
    )
    if (alreadyPlayed) continue

    // Find any active cycle for this strategy+game
    const activeC = allCycles.find(
      c => c.strategyId === strategy.id && c.gameId === gameId && c.status === 'active',
    )

    // ── DATE-BASED ──────────────────────────────────────────────────────────
    if (strategy.type === 'date-based') {
      if (!isDateBasedStrategyScheduledOn(strategy, drawDate)) continue

      const cycleId = activeC?.id ?? generateId()
      const currentBet = activeC?.currentBet ?? strategy.baseBet
      const gamesPlayed = (activeC?.gamesPlayed ?? 0) + 1

      if (!activeC) {
        // Create new cycle
        const cycleNum = allCycles.filter(c => c.strategyId === strategy.id && c.gameId === gameId).length + 1
        out.newCycles.push({
          id: cycleId,
          strategyId: strategy.id, gameId,
          cycleNumber: cycleNum,
          gamesPlayed: 0, gamesRemaining: strategy.cycleLength,
          currentBet: strategy.baseBet, startDate: drawDate,
          status: 'active', totalCost: 0, totalWinnings: 0,
        })
      }

      const { play, cycleUpdate } = buildPlay({
        strategy, gameId, drawDate, cycleId,
        currentBet, gamesPlayed,
        resultNumber, payoutPerUnit, unitBet,
        prevTotalCost: activeC?.totalCost ?? 0,
        prevTotalWinnings: activeC?.totalWinnings ?? 0,
      })

      out.plays.push(play)
      out.cycleUpdates.push({ cycleId, updates: cycleUpdate })
      out.playsSummary.push({
        strategyName: strategy.name,
        cost: play.cost, payout: play.payout, net: play.net,
        won: play.winningNumbers.length > 0,
      })
      continue
    }

    // ── TRIGGER-BASED ───────────────────────────────────────────────────────
    if (strategy.type === 'trigger-based') {
      if (strategy.triggerMode === 'manual') continue

      if (activeC) {
        // Strategy is already running — this is a normal play
        const gamesPlayed = activeC.gamesPlayed + 1
        const { play, cycleUpdate } = buildPlay({
          strategy, gameId, drawDate, cycleId: activeC.id,
          currentBet: activeC.currentBet, gamesPlayed,
          resultNumber, payoutPerUnit, unitBet,
          prevTotalCost: activeC.totalCost,
          prevTotalWinnings: activeC.totalWinnings,
        })
        out.plays.push(play)
        out.cycleUpdates.push({ cycleId: activeC.id, updates: cycleUpdate })
        out.playsSummary.push({
          strategyName: strategy.name,
          cost: play.cost, payout: play.payout, net: play.net,
          won: play.winningNumbers.length > 0,
        })
      } else {
        // No active cycle — check if this result fires the trigger
        if (!doesResultFireTrigger(strategy, resultNumber)) continue

        // Handle triggerBehaviour for waiting-trigger cycles
        const waitingC = allCycles.find(
          c => c.strategyId === strategy.id && c.gameId === gameId && c.status === 'waiting-trigger',
        )
        if (waitingC) {
          // Already waiting — ignore (prevent double-queueing)
          continue
        }

        // Trigger fires! Create a 'waiting-trigger' → will become 'active' on NEXT draw
        const cycleNum = allCycles.filter(c => c.strategyId === strategy.id && c.gameId === gameId).length + 1
        const newCycleId = generateId()
        out.newCycles.push({
          id: newCycleId,
          strategyId: strategy.id, gameId,
          cycleNumber: cycleNum,
          gamesPlayed: 0, gamesRemaining: strategy.cycleLength,
          currentBet: strategy.baseBet, startDate: drawDate,
          status: 'active',   // active immediately — plays start NEXT draw
          totalCost: 0, totalWinnings: 0,
          triggeredAt: drawDate,
        })

        // Record the trigger activation — but NO play today
        out.triggered.push({ strategyName: strategy.name, triggerNumber: resultNumber })
      }
    }
  }

  return out
}

// ─── SHARED PLAY BUILDER ──────────────────────────────────────────────────────

function buildPlay(opts: {
  strategy: Strategy
  gameId: string
  drawDate: string
  cycleId: string
  currentBet: number
  gamesPlayed: number
  resultNumber: number
  payoutPerUnit: number
  unitBet: number
  prevTotalCost: number
  prevTotalWinnings: number
}): {
  play: Omit<PlayRecord, 'id' | 'createdAt'>
  cycleUpdate: Partial<StrategyCycle>
} {
  const { strategy, gameId, drawDate, cycleId, currentBet, gamesPlayed, resultNumber, payoutPerUnit, unitBet, prevTotalCost, prevTotalWinnings } = opts

  const numberCount = strategy.numbers.length
  const cost = numberCount * currentBet

  // Win check: does the single result number appear in the strategy's numbers?
  const won = strategy.numbers.includes(resultNumber)
  const winningNumbers = won ? [resultNumber] : []
  const payout = won ? (payoutPerUnit / unitBet) * currentBet : 0
  const net = payout - cost

  const cycleComplete = won || gamesPlayed >= strategy.cycleLength
  const nextBet = won
    ? strategy.baseBet
    : parseFloat((currentBet * strategy.progressionMultiplier).toFixed(2))

  const play: Omit<PlayRecord, 'id' | 'createdAt'> = {
    date: drawDate, gameId,
    strategyId: strategy.id, cycleId,
    betAmount: currentBet, numberCount, cost,
    winningNumbers, payout, net,
    cycleGameIndex: gamesPlayed,
  }

  const cycleUpdate: Partial<StrategyCycle> = {
    gamesPlayed,
    gamesRemaining: Math.max(0, strategy.cycleLength - gamesPlayed),
    currentBet: nextBet,
    totalCost: prevTotalCost + cost,
    totalWinnings: prevTotalWinnings + payout,
    status: cycleComplete ? (won ? 'won' : 'completed') : 'active',
    endDate: cycleComplete ? drawDate : undefined,
  }

  return { play, cycleUpdate }
}
