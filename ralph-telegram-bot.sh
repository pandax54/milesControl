#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  ralph-telegram-bot.sh — Telegram Bot listener for ralph-once & run-phase
# ═══════════════════════════════════════════════════════════════════
#
# Listens for Telegram commands and triggers ralph-once or run-phase accordingly.
#
# Usage:
#   ./ralph-telegram-bot.sh
#
# Environment variables (or set in .env):
#   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather
#   TELEGRAM_CHAT_ID    — Your chat/group ID (for authorization)
#
# Telegram commands:
#   /run <phase> <task_id>               — Run ralph-once in auto mode
#   /run <phase> <task_id> --skip-to qa  — Run with skip-to
#   /phase <phase_number>                — Run entire phase with run-phase.sh
#   /phase <phase_number> [max_tasks] [options] — Run phase with options
#   /status                              — Show current running task/phase
#   /logs <task_id|phase_number>         — Get last 30 lines of latest log
#   /stop <phase_number>                 — Gracefully stop a running phase
#   /help                                — Show available commands

# ─── Load env ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  eval "$(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "${SCRIPT_DIR}/.env")"
  set +a
fi

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in .env or environment}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:?Set TELEGRAM_CHAT_ID in .env or environment}"
API_BASE="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
OFFSET=0
POLL_INTERVAL=2
PID_FILE="/tmp/ralph-running.pid"
PID_TYPE_FILE="/tmp/ralph-running-type.txt"  # "task" or "phase"

# ─── Helpers ─────────────────────────────────────────────────────
send_message() {
  local chat_id="$1"
  local text="$2"
  curl -s -X POST "${API_BASE}/sendMessage" \
    -d chat_id="$chat_id" \
    -d parse_mode="Markdown" \
    -d text="$text" > /dev/null 2>&1
}

is_authorized() {
  local chat_id="$1"
  [[ "$chat_id" == "$TELEGRAM_CHAT_ID" ]]
}

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

# ─── Command Handlers ───────────────────────────────────────────
handle_run() {
  local chat_id="$1"
  shift
  local args=("$@")

  if [[ ${#args[@]} -lt 2 ]]; then
    send_message "$chat_id" "❌ Usage: \`/run <phase> <task_id> [options]\`
Example: \`/run 6 6.1\`
Example: \`/run 6 6.1 --skip-to qa\`"
    return
  fi

  if is_running; then
    local running_pid
    running_pid=$(cat "$PID_FILE")
    local running_type
    running_type=$(cat "$PID_TYPE_FILE" 2>/dev/null || echo "task")
    send_message "$chat_id" "⚠️ Already running a ${running_type} (PID: ${running_pid}).
Use \`/status\` to check progress."
    return
  fi

  local phase="${args[0]}"
  local task_id="${args[1]}"
  local extra_args=("${args[@]:2}")

  send_message "$chat_id" "🚀 Starting ralph-once: phase ${phase}, task ${task_id}
Options: --auto --telegram ${extra_args[*]:-}"

  # Run in background with auto + telegram flags
  cd "$SCRIPT_DIR"
  nohup ./ralph-once.sh "$phase" "$task_id" \
    --auto --telegram "${extra_args[@]}" \
    > "/tmp/ralph-once-${task_id}.out" 2>&1 &

  echo $! > "$PID_FILE"
  echo "task:${task_id}" > "$PID_TYPE_FILE"

  send_message "$chat_id" "✅ Started! PID: $!
You'll receive progress updates here.
Use \`/status\` to check, \`/logs ${task_id}\` for output."
}

handle_phase() {
  local chat_id="$1"
  shift
  local args=("$@")

  if [[ ${#args[@]} -lt 1 ]]; then
    send_message "$chat_id" "❌ Usage: \`/phase <phase_number> [max_tasks] [options]\`
Example: \`/phase 6\`
Example: \`/phase 6 20 --cli codex --model o4-mini\`
Example: \`/phase 7 50 --cli claude --review-cli claude --review-model claude-haiku-4-5\`"
    return
  fi

  if is_running; then
    local running_pid
    running_pid=$(cat "$PID_FILE")
    local running_type
    running_type=$(cat "$PID_TYPE_FILE" 2>/dev/null || echo "task")
    send_message "$chat_id" "⚠️ Already running a ${running_type} (PID: ${running_pid}).
Use \`/status\` to check progress or \`/stop\` to stop it."
    return
  fi

  local phase="${args[0]}"
  local extra_args=("${args[@]:1}")

  send_message "$chat_id" "🚀 Starting run-phase: Phase ${phase}
Options: --telegram ${extra_args[*]:-}"

  # Run in background with telegram flag
  cd "$SCRIPT_DIR"
  nohup ./run-phase.sh "$phase" "${extra_args[@]}" \
    --telegram \
    > "/tmp/ralph-phase-${phase}.out" 2>&1 &

  echo $! > "$PID_FILE"
  echo "phase:${phase}" > "$PID_TYPE_FILE"

  send_message "$chat_id" "✅ Phase ${phase} started! PID: $!
You'll receive progress updates here.
Use \`/status\` to check, \`/logs phase-${phase}\` for output.
Use \`/stop ${phase}\` to stop gracefully."
}

handle_stop() {
  local chat_id="$1"
  local phase="${2:-}"

  if [[ -z "$phase" ]]; then
    send_message "$chat_id" "❌ Usage: \`/stop <phase_number>\`"
    return
  fi

  local stop_file="${SCRIPT_DIR}/.stop-phase-${phase}"
  touch "$stop_file"
  send_message "$chat_id" "🛑 Stop signal sent for Phase ${phase}.
The phase will finish its current task and stop cleanly."
}

handle_status() {
  local chat_id="$1"
  if is_running; then
    local running_pid
    running_pid=$(cat "$PID_FILE")
    local running_type
    running_type=$(cat "$PID_TYPE_FILE" 2>/dev/null || echo "unknown")
    local runtime
    runtime=$(ps -o etime= -p "$running_pid" 2>/dev/null | xargs || echo "unknown")
    send_message "$chat_id" "🔄 *Running*
Type: ${running_type}
PID: ${running_pid}
Runtime: ${runtime}"
  else
    send_message "$chat_id" "💤 No task or phase currently running."
    # Clean up stale PID files
    rm -f "$PID_FILE" "$PID_TYPE_FILE"
  fi
}

handle_logs() {
  local chat_id="$1"
  local identifier="${2:-}"

  if [[ -z "$identifier" ]]; then
    send_message "$chat_id" "❌ Usage: \`/logs <task_id>\` or \`/logs phase-<number>\`"
    return
  fi

  local log_file=""

  # Check if this is a phase log request (e.g., "phase-6" or just a number)
  if [[ "$identifier" == phase-* ]]; then
    local phase_num="${identifier#phase-}"
    log_file=$(find "${SCRIPT_DIR}/logs/phase-${phase_num}" -name "run_*" -type f 2>/dev/null \
      | sort -r | head -1)
    if [[ -z "$log_file" ]] && [[ -f "/tmp/ralph-phase-${phase_num}.out" ]]; then
      log_file="/tmp/ralph-phase-${phase_num}.out"
    fi
  else
    # Task log request
    log_file=$(find "${SCRIPT_DIR}/logs" -name "ralph_${identifier}_*" -type f 2>/dev/null \
      | sort -r | head -1)
    if [[ -z "$log_file" ]]; then
      # Also check /tmp output
      if [[ -f "/tmp/ralph-once-${identifier}.out" ]]; then
        log_file="/tmp/ralph-once-${identifier}.out"
      fi
    fi
  fi

  if [[ -z "$log_file" ]]; then
    send_message "$chat_id" "❌ No logs found for ${identifier}"
    return
  fi

  local tail_content
  tail_content=$(tail -30 "$log_file" | sed 's/\x1b\[[0-9;]*m//g')  # strip ANSI codes
  send_message "$chat_id" "\`\`\`
${tail_content}
\`\`\`"
}

handle_help() {
  local chat_id="$1"
  send_message "$chat_id" "🤖 *ralph Telegram Bot*

*Single Task:*
\`/run <phase> <task_id>\` — Run one task
\`/run <phase> <task_id> --skip-to qa\` — Skip to step
\`/run <phase> <task_id> --cli opencode\` — Use opencode CLI

*Full Phase:*
\`/phase <phase_number>\` — Run entire phase
\`/phase <phase_number> <max_tasks>\` — Limit tasks
\`/phase <phase_number> 50 --cli codex --model o4-mini\` — Custom CLI
\`/stop <phase_number>\` — Gracefully stop phase

*Monitoring:*
\`/status\` — Check if something is running
\`/logs <task_id>\` — Get task log output
\`/logs phase-<number>\` — Get phase log output
\`/help\` — Show this message

*Examples:*
\`/run 6 6.1\`
\`/phase 7\`
\`/phase 7 20 --cli claude --review-model claude-haiku-4-5\`
\`/stop 7\`
\`/logs phase-7\`"
}

# ─── Main Loop ───────────────────────────────────────────────────
echo "🤖 ralph-telegram-bot started. Listening for commands..."
echo "   Bot token: ${TELEGRAM_BOT_TOKEN:0:10}..."
echo "   Authorized chat: ${TELEGRAM_CHAT_ID}"
echo "   Press Ctrl+C to stop."

while true; do
  # Long-poll for updates
  response=$(curl -s "${API_BASE}/getUpdates?offset=${OFFSET}&timeout=30" 2>/dev/null || echo "")

  if [[ -z "$response" ]] || ! echo "$response" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    sleep "$POLL_INTERVAL"
    continue
  fi

  # Parse updates
  updates=$(echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('ok') and data.get('result'):
    for u in data['result']:
        uid = u['update_id']
        msg = u.get('message', {})
        chat_id = msg.get('chat', {}).get('id', '')
        text = msg.get('text', '')
        print(f'{uid}|{chat_id}|{text}')
" 2>/dev/null || echo "")

  while IFS='|' read -r update_id chat_id text; do
    [[ -z "$update_id" ]] && continue
    OFFSET=$((update_id + 1))

    # Authorization check
    if ! is_authorized "$chat_id"; then
      send_message "$chat_id" "⛔ Unauthorized. Your chat ID: \`${chat_id}\`"
      continue
    fi

    # Parse command
    cmd=$(echo "$text" | awk '{print $1}')
    # shellcheck disable=SC2086
    args_str=$(echo "$text" | cut -d' ' -f2- 2>/dev/null || echo "")
    read -ra cmd_args <<< "$args_str"

    case "$cmd" in
      /run)    handle_run "$chat_id" "${cmd_args[@]}" ;;
      /phase)  handle_phase "$chat_id" "${cmd_args[@]}" ;;
      /stop)   handle_stop "$chat_id" "${cmd_args[0]:-}" ;;
      /status) handle_status "$chat_id" ;;
      /logs)   handle_logs "$chat_id" "${cmd_args[0]:-}" ;;
      /help|/start)  handle_help "$chat_id" ;;
      *)
        # Ignore non-command messages
        ;;
    esac
  done <<< "$updates"

  sleep "$POLL_INTERVAL"
done
