import type { PlayRecord, GameResult, Strategy, StrategyCycle, OpeningBalance, AnalyticsSnapshot, DashboardStats, EquityPoint, CalendarDay, StrategyStatus } from '../types'
import { groupBy, sumBy, dateRange, toISODate } from '../utils'
import { parseISO, subDays, format } from 'date-fns'

export function computeDashboardStats(
  plays: PlayRecord[],
  opening: OpeningBalance | null,
  strategies: Strategy[],
  cycles: StrategyCycle[],
  todayStr: string,
): DashboardStats {
  const monthStart = todayStr.slice(0, 8) + '01'

  const todayPlays = plays.filter(p => p.date === todayStr)
  const monthPlays = plays.filter(p => p.date >= monthStart && p.date <= todayStr)

  const todayCost = sumBy(todayPlays, p => p.cost)
  const todayWinnings = sumBy(todayPlays, p => p.payout)
  const todayNet = todayWinnings - todayCost

  const totalAppCost = sumBy(plays, p => p.cost)
  const totalAppWinnings = sumBy(plays, p => p.payout)
  const openCost = opening?.openingCost ?? 0
  const openWin = opening?.openingWinnings ?? 0

  const lifetimeCost = totalAppCost + openCost
  const lifetimeWinnings = totalAppWinnings + openWin
  const lifetimeNet = lifetimeWinnings - lifetimeCost

  const monthCost = sumBy(monthPlays, p => p.cost)
  const monthWinnings = sumBy(monthPlays, p => p.payout)
  const monthNet = monthWinnings - monthCost

  const activeCycles = cycles.filter(c => c.status === 'active').length
  const activeStrategies = strategies.filter(s => s.isActive).length

  // Current exposure: cost of active cycles that haven't won yet
  const currentExposure = cycles
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.totalCost, 0)

  const roi = lifetimeCost > 0 ? ((lifetimeNet / lifetimeCost) * 100) : 0

  const daysWithPlays = new Set(plays.map(p => p.date))
  const winDays = new Set(plays.filter(p => p.net > 0).map(p => p.date))
  const winRate = daysWithPlays.size > 0 ? (winDays.size / daysWithPlays.size) * 100 : 0

  return {
    todayCost, todayWinnings, todayNet,
    lifetimeCost, lifetimeWinnings, lifetimeNet,
    currentExposure, activeCycles, activeStrategies,
    thisMonthCost: monthCost, thisMonthWinnings: monthWinnings, thisMonthNet: monthNet,
    roi, winRate,
  }
}

export function computeEquityCurve(plays: PlayRecord[], opening: OpeningBalance | null): EquityPoint[] {
  if (plays.length === 0) return []

  const sorted = [...plays].sort((a, b) => a.date.localeCompare(b.date))
  const byDate = groupBy(sorted, p => p.date)
  const dates = Object.keys(byDate).sort()

  let runningNet = opening?.openingNet ?? 0
  const points: EquityPoint[] = []

  for (const date of dates) {
    const dayPlays = byDate[date]
    const cost = sumBy(dayPlays, p => p.cost)
    const winnings = sumBy(dayPlays, p => p.payout)
    const net = winnings - cost
    runningNet += net
    points.push({ date, equity: runningNet, cost, winnings, net })
  }

  return points
}

export function computeCalendarHeatmap(plays: PlayRecord[], year: number, month: number): CalendarDay[] {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthPlays = plays.filter(p => p.date.startsWith(monthStr))
  const byDate = groupBy(monthPlays, p => p.date)

  // Days in month
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthStr}-${String(d).padStart(2, '0')}`
    const dayPlays = byDate[date] ?? []
    const cost = sumBy(dayPlays, p => p.cost)
    const winnings = sumBy(dayPlays, p => p.payout)
    days.push({
      date,
      net: winnings - cost,
      cost,
      winnings,
      plays: dayPlays.length,
      hasData: dayPlays.length > 0,
    })
  }

  return days
}

export function computeAnalyticsSnapshot(plays: PlayRecord[], opening: OpeningBalance | null): AnalyticsSnapshot {
  const sorted = [...plays].sort((a, b) => a.date.localeCompare(b.date))
  const byDate = groupBy(sorted, p => p.date)
  const dates = Object.keys(byDate).sort()

  const totalCost = sumBy(plays, p => p.cost) + (opening?.openingCost ?? 0)
  const totalWinnings = sumBy(plays, p => p.payout) + (opening?.openingWinnings ?? 0)
  const netPnl = totalWinnings - totalCost
  const roi = totalCost > 0 ? (netPnl / totalCost) * 100 : 0

  // Streak calculation
  let currentStreak = 0
  let currentStreakType: 'win' | 'loss' | 'neutral' = 'neutral'
  let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0

  for (const date of dates) {
    const dayPlays = byDate[date]
    const dayNet = sumBy(dayPlays, p => p.net)
    if (dayNet > 0) {
      curWin++; curLoss = 0
      longestWin = Math.max(longestWin, curWin)
    } else if (dayNet < 0) {
      curLoss++; curWin = 0
      longestLoss = Math.max(longestLoss, curLoss)
    }
  }

  if (dates.length > 0) {
    const lastDate = dates[dates.length - 1]
    const lastNet = sumBy(byDate[lastDate], p => p.net)
    if (lastNet > 0) { currentStreakType = 'win'; currentStreak = curWin }
    else if (lastNet < 0) { currentStreakType = 'loss'; currentStreak = curLoss }
  }

  // Drawdown
  let peak = opening?.openingNet ?? 0
  let runningEquity = opening?.openingNet ?? 0
  let maxDrawdown = 0, currentDrawdown = 0
  for (const date of dates) {
    const dayNet = sumBy(byDate[date], p => p.net)
    runningEquity += dayNet
    if (runningEquity > peak) peak = runningEquity
    const dd = peak - runningEquity
    if (dd > maxDrawdown) maxDrawdown = dd
    currentDrawdown = dd
  }

  // Win rate (by day)
  const winDays = dates.filter(d => sumBy(byDate[d], p => p.net) > 0).length
  const winRate = dates.length > 0 ? (winDays / dates.length) * 100 : 0

  // Volatility: std dev of daily P&L
  const dailyNets = dates.map(d => sumBy(byDate[d], p => p.net))
  const mean = dailyNets.length > 0 ? sumBy(dailyNets, x => x) / dailyNets.length : 0
  const variance = dailyNets.length > 1 ? sumBy(dailyNets, x => Math.pow(x - mean, 2)) / dailyNets.length : 0
  const volatility = Math.sqrt(variance)

  // Capital efficiency: winnings / cost
  const capitalEfficiency = totalCost > 0 ? (totalWinnings / totalCost) * 100 : 0

  // Risk score (0-100, higher = riskier)
  const riskScore = Math.min(100, Math.max(0,
    (maxDrawdown / Math.max(1, Math.abs(totalCost))) * 50 +
    (volatility / Math.max(1, Math.abs(mean))) * 30 +
    (currentDrawdown > 0 ? 20 : 0)
  ))

  return {
    date: new Date().toISOString(),
    totalCost, totalWinnings, netPnl, roi, winRate,
    avgDailyCost: dates.length > 0 ? sumBy(plays, p => p.cost) / dates.length : 0,
    avgDailyWinnings: dates.length > 0 ? sumBy(plays, p => p.payout) / dates.length : 0,
    currentDrawdown, maxDrawdown, longestWinStreak: longestWin, longestLossStreak: longestLoss,
    currentStreak, currentStreakType,
    capitalEfficiency, riskScore, volatility,
  }
}

export function computeStrategyStatuses(
  strategies: Strategy[],
  cycles: StrategyCycle[],
  plays: PlayRecord[],
  todayStr: string,
): StrategyStatus[] {
  return strategies.map(strategy => {
    const activeCycles = cycles.filter(c => c.strategyId === strategy.id && c.status === 'active')
    const strategyPlays = plays.filter(p => p.strategyId === strategy.id)
    const todayPlays = strategyPlays.filter(p => p.date === todayStr)

    const currentBet = activeCycles.length > 0 ? activeCycles[0].currentBet : strategy.baseBet
    const cycleProgress = activeCycles.length > 0
      ? activeCycles[0].gamesPlayed / strategy.cycleLength
      : 0

    const todayCost = sumBy(todayPlays, p => p.cost)
    const todayNet = sumBy(todayPlays, p => p.net)
    const lifetimeCost = sumBy(strategyPlays, p => p.cost)
    const lifetimeNet = sumBy(strategyPlays, p => p.net)

    let status: StrategyStatus['status'] = 'idle'
    if (!strategy.isActive) status = 'paused'
    else if (activeCycles.length > 0) status = 'active'
    if (strategy.maxDailyLoss && todayCost > strategy.maxDailyLoss) status = 'at-risk'

    return { strategy, activeCycles, currentBet, todayCost, todayNet, lifetimeCost, lifetimeNet, cycleProgress, status }
  })
}

export function generateInsights(snapshot: AnalyticsSnapshot, strategies: StrategyStatus[]): string[] {
  const insights: string[] = []

  if (snapshot.currentDrawdown > snapshot.maxDrawdown * 0.8 && snapshot.maxDrawdown > 0)
    insights.push('⚠️ Approaching maximum historical drawdown. Consider reducing exposure.')

  if (snapshot.riskScore > 70)
    insights.push('🔴 Risk score is elevated. High volatility detected in recent sessions.')
  else if (snapshot.riskScore < 30)
    insights.push('🟢 Risk score is healthy. Performance is stable.')

  if (snapshot.currentStreakType === 'loss' && snapshot.currentStreak >= 5)
    insights.push(`📉 ${snapshot.currentStreak}-day losing streak in progress. Review active strategies.`)

  if (snapshot.currentStreakType === 'win' && snapshot.currentStreak >= 3)
    insights.push(`📈 ${snapshot.currentStreak}-day winning streak. Current momentum is positive.`)

  if (snapshot.capitalEfficiency > 90)
    insights.push('💡 Capital efficiency has improved significantly over the tracking period.')

  if (snapshot.roi < -20)
    insights.push('⚠️ Lifetime ROI is below -20%. Review your number selection and bet sizing.')

  const atRisk = strategies.filter(s => s.status === 'at-risk')
  if (atRisk.length > 0)
    insights.push(`⚠️ ${atRisk.map(s => s.strategy.name).join(', ')} ${atRisk.length === 1 ? 'has' : 'have'} exceeded daily loss limits.`)

  const highExp = strategies.filter(s => s.strategy.maxExposure && s.lifetimeCost > s.strategy.maxExposure)
  if (highExp.length > 0)
    insights.push(`🔴 High exposure detected in: ${highExp.map(s => s.strategy.name).join(', ')}.`)

  if (insights.length === 0)
    insights.push('✅ All systems normal. No significant risk signals detected.')

  return insights
}
