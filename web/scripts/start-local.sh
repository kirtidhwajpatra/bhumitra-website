#!/bin/sh
# Starts the Astro dev server in the background on http://127.0.0.1:4321
# Logs go to $LOG (default: ./.astro-dev.log). Stop with: kill $(cat .astro-dev.pid)
cd "$(dirname "$0")/.." || exit 1
LOG="${LOG:-.astro-dev.log}"
if [ -f .astro-dev.pid ] && kill -0 "$(cat .astro-dev.pid)" 2>/dev/null; then
  echo "already running (pid $(cat .astro-dev.pid))"
  exit 0
fi
nohup npx astro dev --host 127.0.0.1 > "$LOG" 2>&1 &
echo $! > .astro-dev.pid
sleep 6
tail -5 "$LOG"
