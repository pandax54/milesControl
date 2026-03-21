#!/usr/bin/env bash
set -euo pipefail

INPUT_JSON=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"

if [[ -z "$PROJECT_DIR" ]]; then
  PROJECT_DIR=$(python3 - <<'PY' "$INPUT_JSON"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("cwd", ""))
PY
)
fi

if [[ -z "$PROJECT_DIR" ]]; then
  exit 0
fi

SESSION_ID=$(python3 - <<'PY' "$INPUT_JSON"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("session_id", ""))
PY
)

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

STATE_FILE="$PROJECT_DIR/.claude/.runtime/session-ports-$SESSION_ID.txt"

if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

while IFS= read -r PORT || [[ -n "$PORT" ]]; do
  if [[ -z "$PORT" ]]; then
    continue
  fi

  while IFS= read -r PID || [[ -n "$PID" ]]; do
    if [[ -z "$PID" ]]; then
      continue
    fi

    PROCESS_USER=$(ps -o user= -p "$PID" 2>/dev/null | tr -d ' ' || true)
    if [[ "$PROCESS_USER" != "$USER" ]]; then
      continue
    fi

    if [[ "$PID" == "$$" || "$PID" == "$PPID" ]]; then
      continue
    fi

    kill "$PID" 2>/dev/null || true
  done < <(lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

done < "$STATE_FILE"

sleep 0.3

while IFS= read -r PORT || [[ -n "$PORT" ]]; do
  if [[ -z "$PORT" ]]; then
    continue
  fi

  while IFS= read -r PID || [[ -n "$PID" ]]; do
    if [[ -z "$PID" ]]; then
      continue
    fi

    PROCESS_USER=$(ps -o user= -p "$PID" 2>/dev/null | tr -d ' ' || true)
    if [[ "$PROCESS_USER" != "$USER" ]]; then
      continue
    fi

    if [[ "$PID" == "$$" || "$PID" == "$PPID" ]]; then
      continue
    fi

    kill -9 "$PID" 2>/dev/null || true
  done < <(lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

done < "$STATE_FILE"

rm -f "$STATE_FILE"
