#!/usr/bin/env bash
# Facer Tender Radar — daily scrape + Firestore sync
# Runs via cron at 06:00 Africa/Harare

set -euo pipefail

RADAR_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$RADAR_DIR/radar.log"
SA="$RADAR_DIR/serviceAccount.json"

export GOOGLE_APPLICATION_CREDENTIALS="$SA"

stamp() { date '+%Y-%m-%d %H:%M:%S'; }

{
  echo "──────────────────────────────────────────"
  echo "$(stamp)  START"

  cd "$RADAR_DIR"

  echo "$(stamp)  scraping PRAZ eGP…"
  /usr/bin/python3 run.py scrape --source praz

  echo "$(stamp)  syncing to Firestore (min-score 30)…"
  /usr/bin/python3 run.py sync --min-score 30

  echo "$(stamp)  DONE"
} >> "$LOG" 2>&1
