# Lotto Tracker Pro

A production-grade Progressive Web App (PWA) for personal lottery result accounting and analytics.

> ⚠️ **Disclaimer:** This app is strictly an accounting and analytics tool. It does not provide predictions, tips, probabilities, or gambling advice of any kind.

## Features

- 📊 **Dashboard** — Today's P&L, lifetime totals, equity curve, calendar heatmap
- 🎯 **Analytics** — ROI, win rate, drawdown, streaks, risk score, capital efficiency
- 📋 **Results** — Enter draw results and record plays with automatic cycle management
- 🎮 **Games** — Configure unlimited games (FRBD, GZBD, GALI, DSWR, etc.)
- ⚡ **Strategies** — Date-based and trigger-based strategies with progression cycles
- 📄 **Reports** — Daily P&L drill-down, strategy/game breakdown, audit log
- 💾 **Export** — PDF, Excel (.xlsx), CSV, JSON backup/restore
- 🌙 **Themes** — Light, Dark, System + 5 premium themes
- 📱 **PWA** — Installable on iPhone, Android, and desktop

## Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Recharts · vite-plugin-pwa

## Deployment to GitHub Pages

### 1. Fork / create repo

Create a new GitHub repository named `lotto-tracker-pro`.

### 2. Update base path

In `vite.config.ts`, set:
```ts
base: '/lotto-tracker-pro/',  // must match your repo name
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lotto-tracker-pro.git
git push -u origin main
```

### 4. Enable GitHub Pages

Go to **Settings → Pages → Source → GitHub Actions**.

### 5. Done

The workflow in `.github/workflows/deploy.yml` will automatically build and deploy on every push to `main`.

Your app will be live at: `https://YOUR_USERNAME.github.io/lotto-tracker-pro/`

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data Storage

All data is stored in your browser's `localStorage`. Nothing is ever sent to any server.
Use **Settings → Data → Export Backup** to save a JSON backup regularly.
