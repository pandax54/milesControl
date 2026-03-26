#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  ralph-telegram-bot.sh — Telegram Bot listener for ralph-once
# ═══════════════════════════════════════════════════════════════════
#
# Listens for Telegram commands and triggers ralph-once.sh accordingly.
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
#   /status                              — Show current running task
#   /logs <task_id>                      — Get last 30 lines of latest log
#   /help                                — Show available commands

# ─── Load env ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "${SCRIPT_DIR}/.env")
  set +a
fi

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN in .env or environment}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:?Set TELEGRAM_CHAT_ID in .env or environment}"
API_BASE="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
OFFSET=0
POLL_INTERVAL=2
PID_FILE="/tmp/ralph-once-running.pid"

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
    send_message "$chat_id" "⚠️ Task already running (PID: ${running_pid}).
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
  nohup bash ./ralph-once.sh "$phase" "$task_id" \
    --auto --telegram "${extra_args[@]}" \
    > "/tmp/ralph-once-${task_id}.out" 2>&1 &

  echo $! > "$PID_FILE"

  send_message "$chat_id" "✅ Started! PID: $!
You'll receive progress updates here.
Use \`/status\` to check, \`/logs ${task_id}\` for output."
}

handle_status() {
  local chat_id="$1"
  if is_running; then
    local running_pid
    running_pid=$(cat "$PID_FILE")
    local runtime
    runtime=$(ps -o etime= -p "$running_pid" 2>/dev/null | xargs || echo "unknown")
    send_message "$chat_id" "🔄 *Task running*
PID: ${running_pid}
Runtime: ${runtime}"
  else
    send_message "$chat_id" "💤 No task currently running."
    # Clean up stale PID file
    rm -f "$PID_FILE"
  fi
}

handle_logs() {
  local chat_id="$1"
  local task_id="${2:-}"

  if [[ -z "$task_id" ]]; then
    send_message "$chat_id" "❌ Usage: \`/logs <task_id>\`"
    return
  fi

  # Find latest log for this task
  local log_file
  log_file=$(find "${SCRIPT_DIR}/logs" -name "ralph_${task_id}_*" -type f 2>/dev/null \
    | sort -r | head -1)

  if [[ -z "$log_file" ]]; then
    # Also check /tmp output
    if [[ -f "/tmp/ralph-once-${task_id}.out" ]]; then
      log_file="/tmp/ralph-once-${task_id}.out"
    else
      send_message "$chat_id" "❌ No logs found for task ${task_id}"
      return
    fi
  fi

  local tail_content
  tail_content=$(tail -30 "$log_file" | sed 's/\x1b\[[0-9;]*m//g')  # strip ANSI codes
  send_message "$chat_id" "\`\`\`
${tail_content}
\`\`\`"
}

handle_help() {
  local chat_id="$1"
  send_message "$chat_id" "🤖 *ralph-once Telegram Bot*

*Commands:*
\`/run <phase> <task_id>\` — Run a task
\`/run <phase> <task_id> --skip-to qa\` — Skip to step
\`/run <phase> <task_id> --cli opencode\` — Use opencode CLI
\`/status\` — Check if a task is running
\`/logs <task_id>\` — Get latest log output
\`/help\` — Show this message

*Examples:*
\`/run 6 6.1\`
\`/run 6 6.2 --skip-to review\`
\`/run 7 7.1 --cli opencode --model claude-sonnet-4-6\`"
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
