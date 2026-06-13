import React, { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './components/dashboard/Dashboard'
import { GamesPage } from './components/games/GamesPage'
import { StrategiesPage } from './components/strategies/StrategiesPage'
import { ResultsPage } from './components/results/ResultsPage'
import { AnalyticsPage } from './components/analytics/AnalyticsPage'
import { ReportsPage } from './components/reports/ReportsPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { ToastProvider } from './components/ToastContext'
import { useTheme } from './hooks/useTheme'

type Page = 'dashboard' | 'analytics' | 'results' | 'games' | 'strategies' | 'reports' | 'settings'

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard')
  useTheme()

  function renderPage() {
    switch (page) {
      case 'dashboard':   return <Dashboard onNavigate={p => setPage(p as Page)} />
      case 'analytics':   return <AnalyticsPage />
      case 'results':     return <ResultsPage />
      case 'games':       return <GamesPage />
      case 'strategies':  return <StrategiesPage />
      case 'reports':     return <ReportsPage />
      case 'settings':    return <SettingsPage />
      default:            return <Dashboard onNavigate={p => setPage(p as Page)} />
    }
  }

  return (
    <AppLayout page={page} onNavigate={p => setPage(p as Page)}>
      {renderPage()}
    </AppLayout>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
