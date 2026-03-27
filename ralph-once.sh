#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  ralph-once.sh — Human-In-The-Loop single task runner
# ═══════════════════════════════════════════════════════════════════
#
# Runs ONE full iteration: execute → review → fix → QA → bugfix
# Pauses between each step for human approval before continuing.
#
# Usage:
#   ./ralph-once.sh <phase> <task_id>
#   ./ralph-once.sh <phase> <task_id> --cli claude --model claude-sonnet-4-6
#   ./ralph-once.sh <phase> <task_id> --cli copilot --review-cli claude
#   ./ralph-once.sh <phase> <task_id> --cli codex --model o4-mini --review-model o3
#   ./ralph-once.sh <phase> <task_id> --cli opencode
#
# Examples:
# # Claude only (default)
# ./ralph-once.sh 6 6.1
# # Codex for execution, Claude for review
# ./ralph-once.sh 6 6.1 --cli codex --model o4-mini --review-cli claude --review-model claude-sonnet-4-6
# # Copilot for everything
# ./ralph-once.sh 6 6.1 --cli copilot
# # Resume from QA step
# ./ralph-once.sh 6 6.1 --skip-to qa
# # Non-interactive (same as run-phase behavior)
# ./ralph-once.sh 6 6.1 --auto
#
# Each step shows a HUMAN CHECKPOINT where you can continue (y/Enter), skip (n), or quit (q).
#
# Options:
#   --cli <tool>           CLI for execution: claude | copilot | opencode | codex (default: claude)
#   --model <model>        Model for execution (default varies by CLI)
#   --review-cli <tool>    CLI for review (default: same as --cli)
#   --review-model <model> Model for review (default: same as --model)
#   --skip-to <step>       Skip to a specific step: execute | review | fix | qa | bugfix
#   --auto                 Skip human confirmations (non-interactive mode)
#   --max-fix-attempts <n> Max review+fix cycles (default: 3)
#
# Supported CLIs:
#   claude   → claude -p --dangerously-skip-permissions --model <model> "<prompt>"
#   copilot  → copilot --model <model> "<prompt>"
#   opencode → opencode --model <model> "<prompt>"
#   codex    → codex --model <model> --full-auto "<prompt>"
#
# Examples:
#   ./ralph-once.sh 6 6.1
#   ./ralph-once.sh 6 6.1 --cli claude --model claude-opus-4-5
#   ./ralph-once.sh 6 6.1 --cli copilot --review-cli claude --review-model claude-haiku-4-5
#   ./ralph-once.sh 6 6.1 --cli codex --model o4-mini --review-cli claude --review-model claude-sonnet-4-6
#   ./ralph-once.sh 6 6.1 --skip-to review
#   ./ralph-once.sh 6 6.1 --auto

# ─── Colors & Formatting ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Configuration ──────────────────────────────────────────────
PHASE="${1:?Usage: ./ralph-once.sh <phase> <task_id> [options]}"
TASK_ID="${2:?Usage: ./ralph-once.sh <phase> <task_id> [options]}"
FEATURE_DIR="tasks/prd-milescontrol"
LOG_DIR="logs/phase-${PHASE}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_FIX_ATTEMPTS=3
SKIP_TO=""
AUTO_MODE=false

# CLI defaults
EXEC_CLI="claude"
EXEC_MODEL=""
REVIEW_CLI=""
REVIEW_MODEL=""
TELEGRAM_ENABLED=false

# Telegram config (set via env or .env file)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Parse optional flags
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli)            EXEC_CLI="${2:?--cli requires a value}"; shift 2 ;;
    --model)          EXEC_MODEL="${2:?--model requires a value}"; shift 2 ;;
    --review-cli)     REVIEW_CLI="${2:?--review-cli requires a value}"; shift 2 ;;
    --review-model)   REVIEW_MODEL="${2:?--review-model requires a value}"; shift 2 ;;
    --skip-to)        SKIP_TO="${2:?--skip-to requires a value}"; shift 2 ;;
    --auto)           AUTO_MODE=true; shift ;;
    --max-fix-attempts) MAX_FIX_ATTEMPTS="${2:?--max-fix-attempts requires a value}"; shift 2 ;;
    --telegram)       TELEGRAM_ENABLED=true; shift ;;
    *)                echo "Unknown option: $1"; exit 1 ;;
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

# Context files
CTX_EXECUTE="@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md"
CTX_REVIEW="@${FEATURE_DIR}/tasks.md"
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
log() {
  echo -e "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/ralph_${TASK_ID}_${TIMESTAMP}.log"
}

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
  # Send via Telegram Bot API (fire-and-forget)
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d parse_mode="Markdown" \
    -d text="${message}" \
    > /dev/null 2>&1 || true
}

telegram_notify_step() {
  local step_name="$1"
  local status="$2"  # started | completed | failed | skipped
  local details="${3:-}"

  local emoji=""
  case "$status" in
    started)   emoji="🔄" ;;
    completed) emoji="✅" ;;
    failed)    emoji="❌" ;;
    skipped)   emoji="⏭" ;;
    warning)   emoji="⚠️" ;;
  esac

  local msg="${emoji} *ralph-once* — Task \`${TASK_ID}\`
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
# Track step results for final summary (bash 3.2-compatible using temp file)
STEP_RESULTS_FILE=$(mktemp /tmp/ralph-step-results.XXXXXX)
trap "rm -f '$STEP_RESULTS_FILE'" EXIT

step_result_set() {
  local key="$1" val="$2"
  # Remove existing entry, then append
  grep -v "^${key}=" "$STEP_RESULTS_FILE" > "${STEP_RESULTS_FILE}.tmp" 2>/dev/null || true
  mv "${STEP_RESULTS_FILE}.tmp" "$STEP_RESULTS_FILE"
  echo "${key}=${val}" >> "$STEP_RESULTS_FILE"
}

step_result_get() {
  local key="$1"
  grep "^${key}=" "$STEP_RESULTS_FILE" 2>/dev/null | head -1 | cut -d= -f2-
}

step_result_count() {
  wc -l < "$STEP_RESULTS_FILE" 2>/dev/null | tr -d ' '
}

progress_check() {
  local step_name="$1"
  local check_type="$2"  # git_commit | file_exists | review_status | tests | build
  shift 2
  local args=("$@")

  log "${BLUE}📋 Progress check: ${step_name} [${check_type}]${RESET}"

  case "$check_type" in
    git_commit)
      # Verify a commit was made
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
      # Verify expected files exist
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
      if review_passed; then
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
      # Check if task is marked as done in tasks.md
      if grep -qE "^\s*- \[x\] ${TASK_ID}" "${FEATURE_DIR}/tasks.md" 2>/dev/null; then
        log "${GREEN}  ✓ Task ${TASK_ID} marked complete in tasks.md${RESET}"
        step_result_set "${step_name}_task_marked" "pass"
        return 0
      else
        log "${YELLOW}  ⚠ Task ${TASK_ID} not yet marked in tasks.md${RESET}"
        step_result_set "${step_name}_task_marked" "warning: not marked"
        return 1
      fi
      ;;
    tests)
      # Run quick test verification
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

# Print a progress summary block
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

  # Send Telegram summary
  telegram_notify_step "$step_name" "completed" "${pass_count}✓ ${warn_count}⚠ ${fail_count}✗ → ${overall}"
}

# Human-in-the-loop confirmation gate
confirm_step() {
  local step_name="$1"
  local description="$2"

  if $AUTO_MODE; then
    log "${DIM}[auto] Skipping confirmation for: ${step_name}${RESET}"
    return 0
  fi

  echo ""
  echo -e "${YELLOW}${BOLD}┌─────────────────────────────────────────────────┐${RESET}"
  echo -e "${YELLOW}${BOLD}│  HUMAN CHECKPOINT: ${step_name}${RESET}"
  echo -e "${YELLOW}${BOLD}├─────────────────────────────────────────────────┤${RESET}"
  echo -e "${YELLOW}│  ${description}${RESET}"
  echo -e "${YELLOW}${BOLD}└─────────────────────────────────────────────────┘${RESET}"
  echo ""
  echo -e "  ${GREEN}[y/enter]${RESET} Continue    ${RED}[n]${RESET} Skip this step    ${RED}[q]${RESET} Quit"
  echo -n "  → "

  read -r response
  case "$(echo "$response" | tr '[:upper:]' '[:lower:]')" in
    n|no|skip)
      log "${YELLOW}⏭  Skipped: ${step_name}${RESET}"
      return 1
      ;;
    q|quit|exit)
      log "${RED}🛑 Aborted by user.${RESET}"
      exit 0
      ;;
    *)
      return 0
      ;;
  esac
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

# Extract the task description from tasks.md
get_task_description() {
  grep -E "^\s*- \[[ x]\] ${TASK_ID}" "${FEATURE_DIR}/tasks.md" \
    | head -1 \
    | sed 's/^\s*- \[[ x]\] //' || echo ""
}

# Check if review passed
review_passed() {
  local review_file="${FEATURE_DIR}/${TASK_ID}_task_review.md"
  [[ -f "$review_file" ]] \
    && grep -qiE "(\*\*)?status(\*\*)?:\s*.*(approved|approved with observations)" "$review_file" 2>/dev/null
}

# Check for open bugs
has_bugs() {
  [[ -f "${FEATURE_DIR}/bugs.md" ]] \
    && grep -qiE "status:\s*(open|new|unfixed)" "${FEATURE_DIR}/bugs.md" 2>/dev/null
}

# Extract current phase tasks for lighter context
extract_phase_tasks() {
  local phase="$1"
  local out="${LOG_DIR}/phase_${phase}_tasks.txt"
  sed -n '1,/^### Phase/p' "${FEATURE_DIR}/tasks.md" > "$out"
  sed -n "/^### Phase ${phase}:/,/^### Phase/p" "${FEATURE_DIR}/tasks.md" | sed '$ d' >> "$out"
  echo "$out"
}

# Skip-to logic: returns 0 if step should run, 1 if skipped
should_run_step() {
  local step="$1"
  if [[ -z "$SKIP_TO" ]]; then
    return 0
  fi

  local steps=("execute" "review" "fix" "qa" "bugfix")
  local skip_idx=-1
  local step_idx=-1

  for i in "${!steps[@]}"; do
    [[ "${steps[$i]}" == "$SKIP_TO" ]] && skip_idx=$i
    [[ "${steps[$i]}" == "$step" ]] && step_idx=$i
  done

  if [[ $step_idx -lt $skip_idx ]]; then
    log "${DIM}⏭  Skipping ${step} (--skip-to ${SKIP_TO})${RESET}"
    return 1
  fi

  # Clear skip-to after reaching target
  if [[ $step_idx -eq $skip_idx ]]; then
    SKIP_TO=""
  fi
  return 0
}

# ─── Startup ────────────────────────────────────────────────────
TASK_DESC=$(get_task_description)
PHASE_TASKS=$(extract_phase_tasks "$PHASE")

if [[ -z "$TASK_DESC" ]]; then
  log "${RED}❌ Task ${TASK_ID} not found in ${FEATURE_DIR}/tasks.md${RESET}"
  exit 1
fi

banner "ralph-once — Single Task Runner (HILP)" "$BLUE"
log "${BOLD}Phase:${RESET}        ${PHASE}"
log "${BOLD}Task:${RESET}         ${TASK_ID}"
log "${BOLD}Description:${RESET}  ${TASK_DESC}"
log ""
log "${BOLD}Execution:${RESET}    ${EXEC_CLI} (${EXEC_MODEL})"
log "${BOLD}Review:${RESET}       ${REVIEW_CLI} (${REVIEW_MODEL})"
log "${BOLD}Max fixes:${RESET}    ${MAX_FIX_ATTEMPTS}"
log "${BOLD}Auto mode:${RESET}    ${AUTO_MODE}"
if [[ -n "${SKIP_TO:-}" ]]; then
  log "${BOLD}Skip to:${RESET}      ${SKIP_TO}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
#  STEP 1: Execute Task
# ═══════════════════════════════════════════════════════════════
if should_run_step "execute"; then
  banner "Step 1/5 — Execute Task ${TASK_ID}" "$GREEN"

  if confirm_step "EXECUTE" "Run task implementation with ${EXEC_CLI} (${EXEC_MODEL})"; then
    log "▶ Executing task ${TASK_ID}..."
    telegram_notify_step "Execute" "started" "Implementing task with ${EXEC_CLI}"

    run_ai "$EXEC_CLI" "$EXEC_MODEL" \
      "$LOG_DIR/ralph_${TASK_ID}_execute_${TIMESTAMP}.log" \
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
      || { log "${RED}❌ Task execution failed.${RESET}"; telegram_notify_step "Execute" "failed" "AI execution returned error"; exit 1; }

    log "${GREEN}✅ Execution step completed.${RESET}"

    # ── Progress checks after execution ──
    banner "Progress Check — Execute" "$BLUE"
    progress_check "execute" "task_marked" || true
    progress_check "execute" "git_commit" || true
    progress_check "execute" "typecheck" || true
    progress_check "execute" "tests" || true
    progress_summary "execute"
  fi
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 2: Review + Fix Loop
# ═══════════════════════════════════════════════════════════════
if should_run_step "review"; then
  banner "Step 2/5 — Review Task ${TASK_ID}" "$YELLOW"

  fix_attempt=0

  while [[ "$fix_attempt" -lt "$MAX_FIX_ATTEMPTS" ]]; do
    fix_attempt=$((fix_attempt + 1))

    if confirm_step "REVIEW (attempt ${fix_attempt}/${MAX_FIX_ATTEMPTS})" \
      "Run code review with ${REVIEW_CLI} (${REVIEW_MODEL})"; then

      log "▶ Review attempt ${fix_attempt}/${MAX_FIX_ATTEMPTS} for task ${TASK_ID}..."
      telegram_notify_step "Review (${fix_attempt}/${MAX_FIX_ATTEMPTS})" "started" "Reviewing with ${REVIEW_CLI}"

      run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
        "$LOG_DIR/ralph_${TASK_ID}_review_${fix_attempt}_${TIMESTAMP}.log" \
        "${CTX_REVIEW} @.claude/agents/task-reviewer.md

You are the task-reviewer agent. Follow @.claude/agents/task-reviewer.md exactly.

Review the following completed task:
  Task ID: ${TASK_ID}
  Description: ${TASK_DESC}

The task definition is in @${FEATURE_DIR}/tasks.md.
Generate the review artifact as ${FEATURE_DIR}/${TASK_ID}_task_review.md.
Git commit: 'review(phase${PHASE}): review task ${TASK_ID}'" \
        || { log "${RED}❌ Review failed.${RESET}"; telegram_notify_step "Review" "failed" "AI review returned error"; exit 1; }

      # ── Progress checks after review ──
      banner "Progress Check — Review" "$BLUE"
      progress_check "review_${fix_attempt}" "file_exists" "${FEATURE_DIR}/${TASK_ID}_task_review.md" || true
      progress_check "review_${fix_attempt}" "review_status" || true
      progress_check "review_${fix_attempt}" "git_commit" || true
      progress_summary "review_${fix_attempt}"

      # Check review result
      if review_passed "$TASK_ID"; then
        log "${GREEN}✅ Task ${TASK_ID} review PASSED.${RESET}"
        telegram_notify_step "Review" "completed" "APPROVED"
        break
      fi

      log "${YELLOW}⚠️  Review did not pass.${RESET}"
      telegram_notify_step "Review" "warning" "Not approved, will attempt fixes"

      # If max attempts reached, stop
      if [[ "$fix_attempt" -ge "$MAX_FIX_ATTEMPTS" ]]; then
        log "${YELLOW}⚠️  Max review attempts (${MAX_FIX_ATTEMPTS}) reached. Moving on.${RESET}"
        break
      fi

      # ── Step 3: Apply fixes ────────────────────────────────
      if should_run_step "fix"; then
        banner "Step 3/5 — Apply Fixes (attempt ${fix_attempt})" "$RED"

        if confirm_step "FIX" \
          "Apply review fixes with ${EXEC_CLI} (${EXEC_MODEL})"; then

          log "▶ Applying review fixes for task ${TASK_ID}..."
          telegram_notify_step "Fix (${fix_attempt})" "started" "Applying review fixes"

          run_ai "$EXEC_CLI" "$EXEC_MODEL" \
            "$LOG_DIR/ralph_${TASK_ID}_fix_${fix_attempt}_${TIMESTAMP}.log" \
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
            || { log "${RED}❌ Fix application failed.${RESET}"; telegram_notify_step "Fix" "failed" "AI fix returned error"; exit 1; }

          log "${GREEN}✅ Fixes applied.${RESET}"

          # ── Progress checks after fix ──
          banner "Progress Check — Fix" "$BLUE"
          progress_check "fix_${fix_attempt}" "git_commit" || true
          progress_check "fix_${fix_attempt}" "typecheck" || true
          progress_check "fix_${fix_attempt}" "tests" || true
          progress_summary "fix_${fix_attempt}"
        fi
      fi
    else
      break
    fi
  done
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 4: QA Pass
# ═══════════════════════════════════════════════════════════════
if should_run_step "qa"; then
  banner "Step 4/5 — QA for Task ${TASK_ID}" "$CYAN"

  if confirm_step "QA" \
    "Run QA verification with ${REVIEW_CLI} (${REVIEW_MODEL})"; then

    log "▶ Running QA for task ${TASK_ID}..."
    telegram_notify_step "QA" "started" "Running QA verification"

    run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
      "$LOG_DIR/ralph_${TASK_ID}_qa_${TIMESTAMP}.log" \
      "${CTX_EXECUTE} @${PHASE_TASKS} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Run QA for the completed task ${TASK_ID}: ${TASK_DESC}
Write the QA report to ${FEATURE_DIR}/qa-report-task-${TASK_ID}.md.
If bugs are found, document them in ${FEATURE_DIR}/bugs.md with status: Open.
Git commit: 'test(phase${PHASE}): QA task ${TASK_ID}'
Update progress.txt (max 10 lines)." \
      || { log "${YELLOW}⚠️  QA encountered issues. Check logs.${RESET}"; telegram_notify_step "QA" "warning" "QA encountered issues"; }

    log "${GREEN}✅ QA step completed.${RESET}"

    # ── Progress checks after QA ──
    banner "Progress Check — QA" "$BLUE"
    progress_check "qa" "file_exists" "${FEATURE_DIR}/qa-report-task-${TASK_ID}.md" || true
    progress_check "qa" "git_commit" || true
    progress_check "qa" "bugs_open" || true
    progress_summary "qa"
  fi
fi

# ═══════════════════════════════════════════════════════════════
#  STEP 5: Bugfix Pass (only if bugs found)
# ═══════════════════════════════════════════════════════════════
if should_run_step "bugfix" && has_bugs; then
  banner "Step 5/5 — Bugfix Pass" "$RED"

  if confirm_step "BUGFIX" \
    "Fix open bugs with ${EXEC_CLI} (${EXEC_MODEL})"; then

    log "▶ Fixing bugs..."
    telegram_notify_step "Bugfix" "started" "Fixing open bugs"

    run_ai "$EXEC_CLI" "$EXEC_MODEL" \
      "$LOG_DIR/ralph_${TASK_ID}_bugfix_${TIMESTAMP}.log" \
      "${CTX_FIX} @.claude/commands/execute-bugfix.md @${FEATURE_DIR}/bugs.md

Follow the instructions in @.claude/commands/execute-bugfix.md exactly.

Fix ALL bugs in @${FEATURE_DIR}/bugs.md with status: Open.
Fix in severity order: High → Medium → Low.
For each bug: fix root cause, create regression tests, run tests, build.
Update bugs.md with fix status.
Git commit: 'fix(phase${PHASE}): fix bugs for task ${TASK_ID}'
Update progress.txt (max 10 lines)." \
      || { log "${YELLOW}⚠️  Bugfix encountered issues. Check logs.${RESET}"; telegram_notify_step "Bugfix" "warning" "Bugfix had issues"; }

    log "${GREEN}✅ Bugfix step completed.${RESET}"

    # ── Progress checks after bugfix ──
    banner "Progress Check — Bugfix" "$BLUE"
    progress_check "bugfix" "git_commit" || true
    progress_check "bugfix" "tests" || true
    progress_check "bugfix" "bugs_open" || true
    progress_summary "bugfix"

    # Re-QA after bugfixes
    if confirm_step "RE-QA" \
      "Re-verify after bugfixes with ${REVIEW_CLI} (${REVIEW_MODEL})"; then

      log "▶ Re-running QA after bugfixes..."

      run_ai "$REVIEW_CLI" "$REVIEW_MODEL" \
        "$LOG_DIR/ralph_${TASK_ID}_qa_recheck_${TIMESTAMP}.log" \
        "${CTX_FIX} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Re-verify task ${TASK_ID} after bugfixes.
Update the QA report at ${FEATURE_DIR}/qa-report-task-${TASK_ID}.md.
If new bugs found, document them in ${FEATURE_DIR}/bugs.md.
Git commit: 'test(phase${PHASE}): QA re-verification task ${TASK_ID}'" \
        || { log "${YELLOW}⚠️  QA re-check encountered issues. Check logs.${RESET}"; telegram_notify_step "Re-QA" "warning" "Re-QA had issues"; }

      log "${GREEN}✅ Re-QA completed.${RESET}"

      # ── Progress checks after re-QA ──
      banner "Progress Check — Re-QA" "$BLUE"
      progress_check "reqa" "bugs_open" || true
      progress_check "reqa" "tests" || true
      progress_summary "reqa"
    fi
  fi
elif should_run_step "bugfix"; then
  log "${DIM}No open bugs found. Skipping bugfix step.${RESET}"
fi

# ═══════════════════════════════════════════════════════════════
#  Summary
# ═══════════════════════════════════════════════════════════════
banner "Done!" "$GREEN"
log "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
log "${GREEN}${BOLD}║  ralph-once complete!                                    ║${RESET}"
log "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${RESET}"
log "${GREEN}║  Task:         ${TASK_ID} — ${TASK_DESC:0:35}${RESET}"
log "${GREEN}║  Exec CLI:     ${EXEC_CLI} (${EXEC_MODEL})${RESET}"
log "${GREEN}║  Review CLI:   ${REVIEW_CLI} (${REVIEW_MODEL})${RESET}"
log "${GREEN}║  Logs:         ${LOG_DIR}/ralph_${TASK_ID}_*${RESET}"
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
telegram_send "🏁 *ralph-once complete!*
Task: \`${TASK_ID}\` — ${TASK_DESC:0:50}
Exec: ${EXEC_CLI} (${EXEC_MODEL})
Review: ${REVIEW_CLI} (${REVIEW_MODEL})
_$(date '+%Y-%m-%d %H:%M:%S')_"
