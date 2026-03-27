#!/usr/bin/env bash
set -euo pipefail

# ./run-phase.sh 1 # uses claude-sonnet-4-6 (default)
# ./run-phase.sh 1 50 --model claude-opus-4-5
# ./run-phase.sh 2 20 --model claude-sonnet-4-6 --review-model claude-haiku-4-5
# ./run-phase.sh 1 50 --cli codex --model o4-mini --review-cli claude
# ./run-phase.sh 3 --cli copilot --telegram
# MODEL=claude-opus-4-5 ./run-phase.sh 1 # env var alternative

# How to trigger a graceful stop of the current phase:
# touch .stop-phase-1
# Or just Ctrl-C — the SIGINT trap handles it cleanly

# ─── Colors & Formatting ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Configuration ───────────────────────────────────────────────
PHASE="${1:?Usage: ./run-phase.sh <phase_number> [max_tasks] [--cli <tool>] [--model <model>] [--review-cli <tool>] [--review-model <model>] [--telegram]}"
MAX_TASKS="${2:-50}"
MAX_REVIEW_ATTEMPTS=3
FEATURE_DIR="tasks/prd-milescontrol"
LOG_DIR="logs/phase-${PHASE}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
STOP_FILE=".stop-phase-${PHASE}"
ALL_FIRST_PASS=true          # track if all reviews pass on first attempt

# CLI defaults
EXEC_CLI="claude"
EXEC_MODEL=""
REVIEW_CLI=""
REVIEW_MODEL=""
TELEGRAM_ENABLED=false

# Telegram config (set via env or .env file)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Parse optional flags from remaining args
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli)            EXEC_CLI="${2:?--cli requires a value}"; shift 2 ;;
    --model)          EXEC_MODEL="${2:?--model requires a value}"; shift 2 ;;
    --review-cli)     REVIEW_CLI="${2:?--review-cli requires a value}"; shift 2 ;;
    --review-model)   REVIEW_MODEL="${2:?--review-model requires a value}"; shift 2 ;;
    --telegram)       TELEGRAM_ENABLED=true; shift ;;
    *) shift ;;
  esac
done

# Defaults: review CLI/model falls back to exec CLI/model
REVIEW_CLI="${REVIEW_CLI:-$EXEC_CLI}"

# Set default models per CLI if not specified
resolve_default_model() {
  local cli="$1"
  case "$cli" in
    claude)   echo "claude-sonnet-4-6" ;;
    copilot)  echo "claude-sonnet-4" ;;
    opencode) echo "claude-sonnet-4-6" ;;
    codex)    echo "o4-mini" ;;
    *)        echo ""; ;;
  esac
}

EXEC_MODEL="${EXEC_MODEL:-$(resolve_default_model "$EXEC_CLI")}"
REVIEW_MODEL="${REVIEW_MODEL:-$(resolve_default_model "$REVIEW_CLI")}"

# Context files: only pass what's needed per invocation type
# Full context for execute (needs PRD + techspec to understand requirements)
CTX_EXECUTE="@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md"
# Lightweight context for review (only needs tasks + phase progress)
CTX_REVIEW="@${FEATURE_DIR}/tasks.md"
# Minimal context for fix (only needs the review artifact)
CTX_FIX="@${FEATURE_DIR}/tasks.md"

# Load .env if present (for Telegram tokens)
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  eval "$(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' .env)"
  set +a
  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
  TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
fi

mkdir -p "$LOG_DIR"

# ─── Helpers ─────────────────────────────────────────────────────
log() { echo -e "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/run_${TIMESTAMP}.log"; }

banner() {
  local msg="$1"
  local color="${2:-$CYAN}"
  echo ""
  log "${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  log "${color}${BOLD}  ${msg}${RESET}"
  log "${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
}

# ─── Telegram Notifications ──────────────────────────────────────
telegram_send() {
  local message="$1"
  if ! $TELEGRAM_ENABLED; then return 0; fi
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    log "${YELLOW}⚠️  Telegram enabled but TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set.${RESET}"
    return 0
  fi
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d parse_mode="Markdown" \
    -d text="${message}" \
    > /dev/null 2>&1 || true
}

telegram_notify_step() {
  local step_name="$1"
  local status="$2"
  local details="${3:-}"

  local emoji=""
  case "$status" in
    started)   emoji="🔄" ;;
    completed) emoji="✅" ;;
    failed)    emoji="❌" ;;
    skipped)   emoji="⏭" ;;
    warning)   emoji="⚠️" ;;
  esac

  local msg="${emoji} *run-phase* — Phase \`${PHASE}\`
*Step:* ${step_name}
*Status:* ${status}"

  if [[ -n "$details" ]]; then
    msg+="
*Details:* ${details}"
  fi
  msg+="
_$(date '+%Y-%m-%d %H:%M:%S')_"

  telegram_send "$msg"
}

# ─── Progress Checks ────────────────────────────────────────────
STEP_RESULTS_FILE=$(mktemp /tmp/ralph-phase-results.XXXXXX)
trap "rm -f '$STEP_RESULTS_FILE'" EXIT

step_result_set() {
  local key="$1" val="$2"
  grep -v "^${key}=" "$STEP_RESULTS_FILE" > "${STEP_RESULTS_FILE}.tmp" 2>/dev/null || true
  mv "${STEP_RESULTS_FILE}.tmp" "$STEP_RESULTS_FILE"
  echo "${key}=${val}" >> "$STEP_RESULTS_FILE"
}

step_result_count() {
  wc -l < "$STEP_RESULTS_FILE" 2>/dev/null | tr -d ' '
}

progress_check() {
  local step_name="$1"
  local check_type="$2"
  shift 2
  local args=("$@")

  log "${BLUE}📋 Progress check: ${step_name} [${check_type}]${RESET}"

  case "$check_type" in
    git_commit)
      local latest_msg
      latest_msg=$(git log --oneline -1 2>/dev/null || echo "")
      if [[ -n "$latest_msg" ]]; then
        log "${GREEN}  ✓ Latest commit: ${latest_msg}${RESET}"
        step_result_set "${step_name}_git" "pass: ${latest_msg}"
        return 0
      else
        log "${RED}  ✗ No commit found${RESET}"
        step_result_set "${step_name}_git" "fail: no commit"
        return 1
      fi
      ;;
    file_exists)
      local all_found=true
      for f in "${args[@]}"; do
        if [[ -f "$f" ]]; then
          log "${GREEN}  ✓ File exists: ${f}${RESET}"
        else
          log "${RED}  ✗ File missing: ${f}${RESET}"
          all_found=false
        fi
      done
      if $all_found; then
        step_result_set "${step_name}_files" "pass"
        return 0
      else
        step_result_set "${step_name}_files" "fail: missing files"
        return 1
      fi
      ;;
    review_status)
      local task_id_arg="${args[0]:-}"
      if [[ -n "$task_id_arg" ]] && review_passed "$task_id_arg"; then
        log "${GREEN}  ✓ Review status: APPROVED${RESET}"
        step_result_set "${step_name}_review" "pass: approved"
        return 0
      else
        log "${YELLOW}  ⚠ Review status: NOT APPROVED${RESET}"
        step_result_set "${step_name}_review" "warning: not approved"
        return 1
      fi
      ;;
    task_marked)
      local tid="${args[0]:-}"
      if [[ -n "$tid" ]] && grep -qE "^\s*- \[x\] ${tid}" "${FEATURE_DIR}/tasks.md" 2>/dev/null; then
        log "${GREEN}  ✓ Task ${tid} marked complete in tasks.md${RESET}"
        step_result_set "${step_name}_task_marked" "pass"
        return 0
      else
        log "${YELLOW}  ⚠ Task ${tid} not yet marked in tasks.md${RESET}"
        step_result_set "${step_name}_task_marked" "warning: not marked"
        return 1
      fi
      ;;
    tests)
      log "${DIM}  Running: pnpm test (quick check)...${RESET}"
      if pnpm test > /dev/null 2>&1; then
        log "${GREEN}  ✓ Tests pass${RESET}"
        step_result_set "${step_name}_tests" "pass"
        return 0
      else
        log "${RED}  ✗ Tests failing${RESET}"
        step_result_set "${step_name}_tests" "fail: tests failing"
        return 1
      fi
      ;;
    typecheck)
      log "${DIM}  Running: npx tsc --noEmit (quick check)...${RESET}"
      if npx tsc --noEmit > /dev/null 2>&1; then
        log "${GREEN}  ✓ Type check passes${RESET}"
        step_result_set "${step_name}_typecheck" "pass"
        return 0
      else
        log "${RED}  ✗ Type errors found${RESET}"
        step_result_set "${step_name}_typecheck" "fail: type errors"
        return 1
      fi
      ;;
    build)
      log "${DIM}  Running: pnpm build (quick check)...${RESET}"
      if pnpm build > /dev/null 2>&1; then
        log "${GREEN}  ✓ Build succeeds${RESET}"
        step_result_set "${step_name}_build" "pass"
        return 0
      else
        log "${RED}  ✗ Build failed${RESET}"
        step_result_set "${step_name}_build" "fail: build broken"
        return 1
      fi
      ;;
    bugs_open)
      if has_bugs; then
        local count
        count=$(grep -ciE "status:\s*(open|new|unfixed)" "${FEATURE_DIR}/bugs.md" 2>/dev/null || echo "0")
        log "${YELLOW}  ⚠ Open bugs: ${count}${RESET}"
        step_result_set "${step_name}_bugs" "warning: ${count} open bugs"
        return 1
      else
        log "${GREEN}  ✓ No open bugs${RESET}"
        step_result_set "${step_name}_bugs" "pass: no bugs"
        return 0
      fi
      ;;
  esac
}

progress_summary() {
  local step_name="$1"
  echo ""
  log "${BLUE}${BOLD}┌─── Progress Summary: ${step_name} ───${RESET}"
  local pass_count=0
  local fail_count=0
  local warn_count=0

  while IFS='=' read -r key val; do
    if [[ "$key" == ${step_name}* ]]; then
      local check_name="${key#${step_name}_}"
      if [[ "$val" == pass* ]]; then
        log "${GREEN}│  ✓ ${check_name}: ${val}${RESET}"
        ((pass_count++)) || true
      elif [[ "$val" == warning* ]]; then
        log "${YELLOW}│  ⚠ ${check_name}: ${val}${RESET}"
        ((warn_count++)) || true
      else
        log "${RED}│  ✗ ${check_name}: ${val}${RESET}"
        ((fail_count++)) || true
      fi
    fi
  done < "$STEP_RESULTS_FILE"

  local overall="PASS"
  if [[ $fail_count -gt 0 ]]; then overall="FAIL"; fi

  log "${BLUE}│  Result: ${pass_count} passed, ${warn_count} warnings, ${fail_count} failed → ${overall}${RESET}"
  log "${BLUE}${BOLD}└───────────────────────────────────${RESET}"

  telegram_notify_step "$step_name" "completed" "${pass_count}✓ ${warn_count}⚠ ${fail_count}✗ → ${overall}"
}

should_stop() {
  if [[ -f "$STOP_FILE" ]]; then
    log "${RED}🛑 Stop file detected (.stop-phase-${PHASE}). Finishing cleanly.${RESET}"
    rm -f "$STOP_FILE"
    exit 0
  fi
}

trap 'log "🛑 Interrupted (SIGINT). Cleaning up."; rm -f "$STOP_FILE"; exit 130' INT
trap 'rm -f "$STOP_FILE" "$STEP_RESULTS_FILE"' EXIT

count_incomplete() {
  grep -cE "^\s*- \[ \] ${PHASE}\." "${FEATURE_DIR}/tasks.md" || echo 0
}

next_task_id() {
  grep -oE "\- \[ \] ${PHASE}\.[0-9]+" "${FEATURE_DIR}/tasks.md" \
    | head -1 \
    | grep -oE "${PHASE}\.[0-9]+" || echo ""
}

next_task_line() {
  grep -E "^\s*- \[ \] ${PHASE}\." "${FEATURE_DIR}/tasks.md" \
    | head -1 \
    | sed 's/^\s*- \[ \] //' || echo ""
}

has_bugs() {
  [[ -f "${FEATURE_DIR}/bugs.md" ]] \
    && grep -qiE "status:\s*(open|new|unfixed)" "${FEATURE_DIR}/bugs.md" 2>/dev/null
}

review_passed() {
  local task_id="$1"
  local review_file="${FEATURE_DIR}/${task_id}_task_review.md"
  [[ -f "$review_file" ]] \
    && grep -qiE "(\*\*)?status(\*\*)?:\s*.*(approved|approved with observations)" "$review_file" 2>/dev/null
}

# Run a command through the chosen CLI
run_ai() {
  local cli="$1"
  local model="$2"
  local log_file="$3"
  local prompt="$4"

  log "${DIM}CLI: ${cli} | Model: ${model}${RESET}"
  log "${DIM}Logging to: ${log_file}${RESET}"

  case "$cli" in
    claude)
      claude -p --dangerously-skip-permissions --model "$model" "$prompt" \
        2>&1 | tee "$log_file"
      return "${PIPESTATUS[0]}"
      ;;
    copilot)
      copilot -p "$prompt" --allow-all-tools --model "$model" \
        2>&1 | tee "$log_file"
      return "${PIPESTATUS[0]}"
      ;;
    opencode)
      opencode --model "$model" "$prompt" \
        2>&1 | tee "$log_file"
      return "${PIPESTATUS[0]}"
      ;;
    codex)
      codex --model "$model" --full-auto "$prompt" \
        2>&1 | tee "$log_file"
      return "${PIPESTATUS[0]}"
      ;;
    *)
      log "${RED}❌ Unknown CLI: ${cli}${RESET}"
      return 1
      ;;
  esac
}

# Archive completed phase progress to keep progress.txt bounded
archive_progress() {
  local phase="$1"
  local archive_file="${LOG_DIR}/progress-archive-phase${phase}.txt"
  if [[ -f progress.txt ]]; then
    cp progress.txt "$archive_file"
    # Keep only the last 80 lines (roughly the current phase's entries)
    tail -80 progress.txt > progress.txt.tmp && mv progress.txt.tmp progress.txt
    log "Archived progress.txt to ${archive_file}, trimmed to last 80 lines"
  fi
}

# Extract only current phase tasks from tasks.md for lighter context
extract_phase_tasks() {
  local phase="$1"
  local out="${LOG_DIR}/phase_${phase}_tasks.txt"
  # Extract overview + current phase block
  sed -n '1,/^### Phase/p' "${FEATURE_DIR}/tasks.md" > "$out"
  # macOS sed: remove last line instead of GNU head -n -1
  sed -n "/^### Phase ${phase}:/,/^### Phase/p" "${FEATURE_DIR}/tasks.md" | sed '$ d' >> "$out"
  echo "$out"
}

# ─── Startup info ────────────────────────────────────────────────
banner "run-phase — Phase ${PHASE} Runner" "$BLUE"
log "${BOLD}Phase:${RESET}        ${PHASE}"
log "${BOLD}Execution:${RESET}    ${EXEC_CLI} (${EXEC_MODEL})"
log "${BOLD}Review:${RESET}       ${REVIEW_CLI} (${REVIEW_MODEL})"
log "${BOLD}Max tasks:${RESET}    ${MAX_TASKS}"
log "${BOLD}Telegram:${RESET}     ${TELEGRAM_ENABLED}"
log ""
log "To stop gracefully: touch ${STOP_FILE}  (or Ctrl-C)"

telegram_send "🚀 *run-phase* starting Phase \`${PHASE}\`
Exec: ${EXEC_CLI} (${EXEC_MODEL})
Review: ${REVIEW_CLI} (${REVIEW_MODEL})
Max tasks: ${MAX_TASKS}
_$(date '+%Y-%m-%d %H:%M:%S')_"

# ─── Pre-phase setup ─────────────────────────────────────────────
archive_progress "$PHASE"
PHASE_TASKS=$(extract_phase_tasks "$PHASE")

# ─── Task Execution Loop ────────────────────────────────────────
task_num=0

while true; do
  should_stop

  remaining=$(count_incomplete)
  log "Phase ${PHASE} — ${remaining} task(s) remaining"

  if [[ "$remaining" -eq 0 ]]; then
    log "${GREEN}✅ All Phase ${PHASE} tasks complete!${RESET}"
    telegram_notify_step "Phase ${PHASE}" "completed" "All tasks done"
    break
  fi

  if [[ "$task_num" -ge "$MAX_TASKS" ]]; then
    log "${YELLOW}⚠️  Hit max tasks cap (${MAX_TASKS}). Stopping.${RESET}"
    telegram_notify_step "Phase ${PHASE}" "warning" "Hit max tasks cap (${MAX_TASKS})"
    break
  fi

  task_num=$((task_num + 1))
  TASK_ID=$(next_task_id)
  TASK_DESC=$(next_task_line)

  if [[ -z "$TASK_ID" ]]; then
    log "No more incomplete tasks found for Phase ${PHASE}."
    break
  fi

  banner "Task #${task_num} — ${TASK_ID}" "$GREEN"
  log "Description: ${TASK_DESC}"

  # ── Step 1: Execute Task ──────────────────────────────────────
  log "▶ Executing task ${TASK_ID}..."
  telegram_notify_step "Execute ${TASK_ID}" "started" "Task #${task_num}: ${TASK_DESC:0:50}"

  run_ai "$EXEC_CLI" "$EXEC_MODEL" \
    "$LOG_DIR/task_${task_num}_execute_${TIMESTAMP}.log" \
    "${CTX_EXECUTE} @${PHASE_TASKS} @.claude/commands/execute-task.md

Follow the instructions in @.claude/commands/execute-task.md exactly.

Implement the following task from tasks.md:
  Task ID: ${TASK_ID}
  Full description: ${TASK_DESC}

This is the line in tasks.md: '- [ ] ${TASK_DESC}'
After implementation, mark it complete in tasks.md (change '- [ ]' to '- [x]').

Verification checklist (ALL must pass before committing):
1. npx tsc --noEmit
2. pnpm test
3. pnpm run test:coverage
4. pnpm build

Git commit: 'feat(phase${PHASE}): complete task ${TASK_ID} — <short description>'
Update progress.txt with a brief summary (max 10 lines for this task).

ONLY DO ONE TASK. Stop after committing." \
    || { log "${RED}❌ Task execution failed. See $LOG_DIR/task_${task_num}_execute_${TIMESTAMP}.log${RESET}"; telegram_notify_step "Execute ${TASK_ID}" "failed" "AI execution returned error"; exit 1; }

  log "${GREEN}✅ Execution step completed.${RESET}"

  # ── Progress checks after execution ──
  progress_check "execute_${TASK_ID}" "task_marked" "$TASK_ID" || true
  progress_check "execute_${TASK_ID}" "git_commit" || true
  progress_summary "execute_${TASK_ID}"

  # ── Step 2: Review + Fix Loop ─────────────────────────────────
  review_attempt=0

  while [[ "$review_attempt" -lt "$MAX_REVIEW_ATTEMPTS" ]]; do
    should_stop

    review_attempt=$((review_attempt + 1))
    log "▶ Review attempt ${review_attempt}/${MAX_REVIEW_ATTEMPTS} for task ${TASK_ID}..."
    telegram_notify_step "Review ${TASK_ID} (${review_attempt}/${MAX_REVIEW_ATTEMPTS})" "started" "Reviewing with ${REVIEW_CLI}"

    run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
      "$LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log" \
      "${CTX_REVIEW} @.claude/agents/task-reviewer.md

You are the task-reviewer agent. Follow @.claude/agents/task-reviewer.md exactly.

Review the following completed task:
  Task ID: ${TASK_ID}
  Description: ${TASK_DESC}

The task definition is in @${FEATURE_DIR}/tasks.md.
Generate the review artifact as ${FEATURE_DIR}/${TASK_ID}_task_review.md.
Git commit: 'review(phase${PHASE}): review task ${TASK_ID}'" \
      || { log "${RED}❌ Review failed. See $LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log${RESET}"; telegram_notify_step "Review ${TASK_ID}" "failed" "AI review returned error"; exit 1; }

    # ── Progress checks after review ──
    progress_check "review_${TASK_ID}_${review_attempt}" "file_exists" "${FEATURE_DIR}/${TASK_ID}_task_review.md" || true
    progress_check "review_${TASK_ID}_${review_attempt}" "review_status" "$TASK_ID" || true
    progress_check "review_${TASK_ID}_${review_attempt}" "git_commit" || true
    progress_summary "review_${TASK_ID}_${review_attempt}"

    # Check if review passed
    if review_passed "$TASK_ID"; then
      log "${GREEN}✅ Task ${TASK_ID} review PASSED.${RESET}"
      telegram_notify_step "Review ${TASK_ID}" "completed" "APPROVED"
      break
    fi

    # Track that at least one task needed multiple attempts
    ALL_FIRST_PASS=false
    telegram_notify_step "Review ${TASK_ID}" "warning" "Not approved, will attempt fixes"

    # If max attempts reached, warn and move on
    if [[ "$review_attempt" -ge "$MAX_REVIEW_ATTEMPTS" ]]; then
      log "${YELLOW}⚠️  Max review attempts (${MAX_REVIEW_ATTEMPTS}) reached for task ${TASK_ID}. Moving on.${RESET}"
      telegram_notify_step "Review ${TASK_ID}" "warning" "Max attempts reached, moving on"
      break
    fi

    # ── Step 3: Analyze review & apply fixes ──────────────────
    log "▶ Applying review recommendations for task ${TASK_ID}..."
    telegram_notify_step "Fix ${TASK_ID} (${review_attempt})" "started" "Applying review fixes"

    run_ai "$EXEC_CLI" "$EXEC_MODEL" \
      "$LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log" \
      "${CTX_FIX} @${FEATURE_DIR}/${TASK_ID}_task_review.md

Read the review at @${FEATURE_DIR}/${TASK_ID}_task_review.md for task ${TASK_ID}.

Task reviewed: ${TASK_DESC}

Apply ALL recommendations and fix ALL issues flagged in the review:
1. Fix CRITICAL issues first, then MAJOR, then MINOR.
2. Run 'npx tsc --noEmit' — fix any type errors.
3. Run 'pnpm test' — fix any test failures.
4. Run 'pnpm run test:coverage' — ensure coverage thresholds are met.
5. Run 'pnpm build' — ensure build succeeds.
6. Git commit: 'fix(phase${PHASE}): apply review fixes for task ${TASK_ID}'
7. Update progress.txt (max 5 lines for fixes)." \
      || { log "${RED}❌ Fix application failed. See $LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log${RESET}"; telegram_notify_step "Fix ${TASK_ID}" "failed" "AI fix returned error"; exit 1; }

    log "${GREEN}✅ Fixes applied.${RESET}"

    # ── Progress checks after fix ──
    progress_check "fix_${TASK_ID}_${review_attempt}" "git_commit" || true
    progress_check "fix_${TASK_ID}_${review_attempt}" "typecheck" || true
    progress_check "fix_${TASK_ID}_${review_attempt}" "tests" || true
    progress_summary "fix_${TASK_ID}_${review_attempt}"
  done

  log "Task ${TASK_ID} complete. Pausing 5s..."
  sleep 5
done

# ─── QA Pass ─────────────────────────────────────────────────────
should_stop

if $ALL_FIRST_PASS; then
  banner "Lightweight QA — Phase ${PHASE}" "$CYAN"
  telegram_notify_step "QA (lightweight)" "started" "All reviews passed first try"

  run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
    "$LOG_DIR/qa_${TIMESTAMP}.log" \
    "${CTX_REVIEW} @${PHASE_TASKS}

Run a lightweight verification for Phase ${PHASE}:
1. npx tsc --noEmit
2. pnpm test
3. pnpm run test:coverage
4. pnpm build

If ALL pass, write a brief QA summary to ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
Git commit: 'test(phase${PHASE}): QA report'" \
    || { log "${YELLOW}⚠️  QA pass encountered issues. Check $LOG_DIR/qa_${TIMESTAMP}.log${RESET}"; telegram_notify_step "QA" "warning" "QA had issues"; }
else
  banner "Full QA — Phase ${PHASE}" "$CYAN"
  telegram_notify_step "QA (full)" "started" "Some reviews needed fixes"

  run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
    "$LOG_DIR/qa_${TIMESTAMP}.log" \
    "${CTX_EXECUTE} @${PHASE_TASKS} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Run QA for ALL completed Phase ${PHASE} tasks.
Write the QA report to ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
If bugs are found, document them in ${FEATURE_DIR}/bugs.md with status: Open.
Git commit: 'test(phase${PHASE}): QA report'
Update progress.txt (max 10 lines)." \
    || { log "${YELLOW}⚠️  QA pass encountered issues. Check $LOG_DIR/qa_${TIMESTAMP}.log${RESET}"; telegram_notify_step "QA" "warning" "QA had issues"; }
fi

# ── Progress checks after QA ──
progress_check "qa" "file_exists" "${FEATURE_DIR}/qa-report-phase${PHASE}.md" || true
progress_check "qa" "git_commit" || true
progress_check "qa" "bugs_open" || true
progress_summary "qa"

# ─── Bugfix Pass ─────────────────────────────────────────────────
if has_bugs; then
  should_stop

  banner "Bugfix Pass — Phase ${PHASE}" "$RED"
  telegram_notify_step "Bugfix" "started" "Fixing open bugs"

  run_ai "$EXEC_CLI" "$EXEC_MODEL" \
    "$LOG_DIR/bugfix_${TIMESTAMP}.log" \
    "${CTX_FIX} @.claude/commands/execute-bugfix.md @${FEATURE_DIR}/bugs.md

Follow the instructions in @.claude/commands/execute-bugfix.md exactly.

Fix ALL bugs in @${FEATURE_DIR}/bugs.md with status: Open.
Fix in severity order: High → Medium → Low.
For each bug: fix root cause, create regression tests, run tests, build.
Update bugs.md with fix status.
Git commit: 'fix(phase${PHASE}): fix bugs'
Update progress.txt (max 10 lines)." \
    || { log "${YELLOW}⚠️  Bugfix pass encountered issues. Check $LOG_DIR/bugfix_${TIMESTAMP}.log${RESET}"; telegram_notify_step "Bugfix" "warning" "Bugfix had issues"; }

  log "${GREEN}✅ Bugfix step completed.${RESET}"

  # ── Progress checks after bugfix ──
  progress_check "bugfix" "git_commit" || true
  progress_check "bugfix" "tests" || true
  progress_check "bugfix" "bugs_open" || true
  progress_summary "bugfix"

  # ── Re-QA after bugfixes ──────────────────────────────────────
  should_stop

  banner "Re-QA after Bugfixes — Phase ${PHASE}" "$CYAN"
  telegram_notify_step "Re-QA" "started" "Re-verifying after bugfixes"

  run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
    "$LOG_DIR/qa_recheck_${TIMESTAMP}.log" \
    "${CTX_FIX} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Re-verify Phase ${PHASE} after bugfixes.
Update the QA report at ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
If new bugs found, document them in ${FEATURE_DIR}/bugs.md.
Git commit: 'test(phase${PHASE}): QA re-verification after bugfixes'" \
    || { log "${YELLOW}⚠️  QA re-check encountered issues. Check $LOG_DIR/qa_recheck_${TIMESTAMP}.log${RESET}"; telegram_notify_step "Re-QA" "warning" "Re-QA had issues"; }

  log "${GREEN}✅ Re-QA completed.${RESET}"

  # ── Progress checks after re-QA ──
  progress_check "reqa" "bugs_open" || true
  progress_check "reqa" "tests" || true
  progress_summary "reqa"
fi

# ─── Summary ─────────────────────────────────────────────────────
banner "Done!" "$GREEN"
log "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
log "${GREEN}${BOLD}║  Phase ${PHASE} complete!                                ║${RESET}"
log "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${RESET}"
log "${GREEN}║  Exec CLI:     ${EXEC_CLI} (${EXEC_MODEL})${RESET}"
log "${GREEN}║  Review CLI:   ${REVIEW_CLI} (${REVIEW_MODEL})${RESET}"
log "${GREEN}║  Tasks executed: ${task_num}${RESET}"
log "${GREEN}║  Logs:         ${LOG_DIR}/${RESET}"
log "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"

# ── Final progress report ──
if [[ $(step_result_count) -gt 0 ]]; then
  echo ""
  log "${BOLD}Final Progress Report:${RESET}"
  total_pass=0; total_fail=0; total_warn=0
  sort "$STEP_RESULTS_FILE" > "${STEP_RESULTS_FILE}.sorted"
  while IFS='=' read -r key val; do
    if [[ "$val" == pass* ]]; then
      log "  ${GREEN}✓${RESET} ${key}: ${val}"
      ((total_pass++)) || true
    elif [[ "$val" == warning* ]]; then
      log "  ${YELLOW}⚠${RESET} ${key}: ${val}"
      ((total_warn++)) || true
    else
      log "  ${RED}✗${RESET} ${key}: ${val}"
      ((total_fail++)) || true
    fi
  done < "${STEP_RESULTS_FILE}.sorted"
  rm -f "${STEP_RESULTS_FILE}.sorted"
  log "${BOLD}Totals: ${total_pass} passed, ${total_warn} warnings, ${total_fail} failed${RESET}"
fi

# Send final Telegram notification
telegram_send "🏁 *run-phase complete!*
Phase: \`${PHASE}\`
Exec: ${EXEC_CLI} (${EXEC_MODEL})
Review: ${REVIEW_CLI} (${REVIEW_MODEL})
Tasks: ${task_num}
_$(date '+%Y-%m-%d %H:%M:%S')_"