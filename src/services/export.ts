import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PlayRecord, GameResult, Strategy, Game, AuditRecord, AnalyticsSnapshot } from '../types'
import { formatDate, formatDateTime, formatCurrencyFull } from '../utils'
import { format } from 'date-fns'

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────

export function exportPlaysCSV(plays: PlayRecord[], games: Game[], strategies: Strategy[]): void {
  const gameMap = Object.fromEntries(games.map(g => [g.id, g.name]))
  const stratMap = Object.fromEntries(strategies.map(s => [s.id, s.name]))

  const rows = plays.map(p => ({
    Date: p.date,
    Game: gameMap[p.gameId] ?? p.gameId,
    Strategy: stratMap[p.strategyId] ?? p.strategyId,
    'Bet Amount': p.betAmount,
    'Number Count': p.numberCount,
    Cost: p.cost,
    'Winning Numbers': p.winningNumbers.join(','),
    Payout: p.payout,
    Net: p.net,
    Notes: p.notes ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  downloadString(csv, 'plays-export.csv', 'text/csv')
}

export function exportResultsCSV(results: GameResult[], games: Game[]): void {
  const gameMap = Object.fromEntries(games.map(g => [g.id, g.name]))
  const rows = results.map(r => ({
    Date: r.drawDate,
    Time: r.drawTime,
    Game: gameMap[r.gameId] ?? r.gameId,
    Number: r.resultNumber,
    Notes: r.notes ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  downloadString(XLSX.utils.sheet_to_csv(ws), 'results-export.csv', 'text/csv')
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────

export function exportFullExcel(
  plays: PlayRecord[],
  results: GameResult[],
  strategies: Strategy[],
  games: Game[],
  audits: AuditRecord[],
  snapshot: AnalyticsSnapshot,
): void {
  const wb = XLSX.utils.book_new()
  const gameMap = Object.fromEntries(games.map(g => [g.id, g.name]))
  const stratMap = Object.fromEntries(strategies.map(s => [s.id, s.name]))

  // Dashboard sheet
  const dashData = [
    ['Lotto Tracker Pro — Export', format(new Date(), 'dd MMM yyyy HH:mm')],
    [],
    ['Metric', 'Value'],
    ['Total Cost', snapshot.totalCost],
    ['Total Winnings', snapshot.totalWinnings],
    ['Net P&L', snapshot.netPnl],
    ['ROI', `${snapshot.roi.toFixed(2)}%`],
    ['Win Rate', `${snapshot.winRate.toFixed(1)}%`],
    ['Max Drawdown', snapshot.maxDrawdown],
    ['Risk Score', snapshot.riskScore.toFixed(0)],
    ['Longest Win Streak', snapshot.longestWinStreak],
    ['Longest Loss Streak', snapshot.longestLossStreak],
    ['Capital Efficiency', `${snapshot.capitalEfficiency.toFixed(1)}%`],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashData), 'Dashboard')

  // Plays sheet
  const playRows = plays.map(p => ({
    Date: p.date, Game: gameMap[p.gameId] ?? p.gameId,
    Strategy: stratMap[p.strategyId] ?? p.strategyId,
    'Bet': p.betAmount, 'Numbers': p.numberCount,
    Cost: p.cost, Winning: p.winningNumbers.join(','),
    Payout: p.payout, Net: p.net,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playRows), 'Plays')

  // Results sheet
  const resultRows = results.map(r => ({
    Date: r.drawDate, Time: r.drawTime,
    Game: gameMap[r.gameId] ?? r.gameId,
    Number: r.resultNumber, Notes: r.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resultRows), 'Results')

  // Strategies sheet
  const stratRows = strategies.map(s => ({
    Name: s.name, Type: s.type, Active: s.isActive,
    Numbers: s.numbers.join(','), 'Base Bet': s.baseBet,
    Multiplier: s.progressionMultiplier, 'Cycle Length': s.cycleLength,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stratRows), 'Strategies')

  // Games sheet
  const gameRows = games.map(g => ({
    Name: g.name, 'Draw Time': g.drawTime,
    'Active Days': g.activeDays.join(','),
    'Prev Day': g.belongsToPreviousDay, Active: g.isActive,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gameRows), 'Games')

  // Audit sheet
  const auditRows = audits.slice(-500).map(a => ({
    Timestamp: formatDateTime(a.timestamp),
    Action: a.action, Entity: a.entityType,
    Description: a.description,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditRows), 'Audit')

  XLSX.writeFile(wb, `lotto-tracker-pro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────

export function exportPDF(
  plays: PlayRecord[],
  strategies: Strategy[],
  games: Game[],
  snapshot: AnalyticsSnapshot,
  dateFrom?: string,
  dateTo?: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = format(new Date(), 'dd MMM yyyy HH:mm')
  const gameMap = Object.fromEntries(games.map(g => [g.id, g.name]))
  const stratMap = Object.fromEntries(strategies.map(s => [s.id, s.name]))

  // Header
  doc.setFillColor(234, 88, 12)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Lotto Tracker Pro', 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${now}`, 14, 22)
  if (dateFrom || dateTo) doc.text(`Period: ${dateFrom ?? '—'} to ${dateTo ?? '—'}`, pageW / 2, 22, { align: 'center' })
  doc.text(`Page 1`, pageW - 14, 22, { align: 'right' })

  // Summary
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Summary', 14, 40)

  const summaryData = [
    ['Total Cost', `₹${snapshot.totalCost.toLocaleString('en-IN')}`],
    ['Total Winnings', `₹${snapshot.totalWinnings.toLocaleString('en-IN')}`],
    ['Net P&L', `₹${snapshot.netPnl.toLocaleString('en-IN')}`],
    ['ROI', `${snapshot.roi.toFixed(2)}%`],
    ['Win Rate', `${snapshot.winRate.toFixed(1)}%`],
    ['Max Drawdown', `₹${snapshot.maxDrawdown.toLocaleString('en-IN')}`],
    ['Risk Score', `${snapshot.riskScore.toFixed(0)} / 100`],
    ['Capital Efficiency', `${snapshot.capitalEfficiency.toFixed(1)}%`],
  ]

  autoTable(doc, {
    startY: 44,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [234, 88, 12], textColor: 255 },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  })

  // Plays table
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Play Records', 14, finalY)

  const filtered = plays.slice(-100).map(p => [
    p.date, gameMap[p.gameId] ?? '—', stratMap[p.strategyId] ?? '—',
    `₹${p.cost}`, p.winningNumbers.length > 0 ? p.winningNumbers.join(',') : '—',
    `₹${p.payout}`, (p.net >= 0 ? '+' : '') + `₹${p.net}`,
  ])

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Date', 'Game', 'Strategy', 'Cost', 'Winning', 'Payout', 'Net']],
    body: filtered,
    theme: 'striped',
    headStyles: { fillColor: [234, 88, 12], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      doc.setTextColor(130, 130, 130)
      doc.setFontSize(8)
      doc.text(`Lotto Tracker Pro — Confidential — ${now}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
    },
  })

  doc.save(`lotto-tracker-pro-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(data: object, filename: string): void {
  downloadString(JSON.stringify(data, null, 2), filename, 'application/json')
}
