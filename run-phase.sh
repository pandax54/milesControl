#!/usr/bin/env bash
set -euo pipefail

# ./run-phase.sh 1 # uses claude-sonnet-4-6 (default)
# ./run-phase.sh 1 50 --model claude-opus-4-5
# ./run-phase.sh 2 20 --model claude-sonnet-4-6 --review-model claude-haiku-4-5
# MODEL=claude-opus-4-5 ./run-phase.sh 1 # env var alternative
# # After (reviews use cheaper model, ~80% cheaper reviews):
# ./run-phase.sh 4 50 --model claude-sonnet-4-6 --review-model claude-haiku-4-5

# How to trigger a graceful stop of the current phase:
# touch .stop-phase-1
# Or just Ctrl-C — the SIGINT trap handles it cleanly

# ─── Configuration ───────────────────────────────────────────────
PHASE="${1:?Usage: ./run-phase.sh <phase_number> [max_tasks] [--model <model>] [--review-model <model>]}"
MAX_TASKS="${2:-50}"
MAX_REVIEW_ATTEMPTS=3
FEATURE_DIR="tasks/prd-milescontrol"
LOG_DIR="logs/phase-${PHASE}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MODEL="claude-sonnet-4-6"   # default model for execution
REVIEW_MODEL=""              # lighter model for reviews (empty = use MODEL)
STOP_FILE=".stop-phase-${PHASE}"
ALL_FIRST_PASS=true          # track if all reviews pass on first attempt

# Parse optional flags from remaining args
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="${2:?--model requires a value}"; shift 2 ;;
    --review-model) REVIEW_MODEL="${2:?--review-model requires a value}"; shift 2 ;;
    *) shift ;;
  esac
done

# Default review model to main model if not set
REVIEW_MODEL="${REVIEW_MODEL:-$MODEL}"

# Context files: only pass what's needed per invocation type
# Full context for execute (needs PRD + techspec to understand requirements)
CTX_EXECUTE="@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md"
# Lightweight context for review (only needs tasks + phase progress)
CTX_REVIEW="@${FEATURE_DIR}/tasks.md"
# Minimal context for fix (only needs the review artifact)
CTX_FIX="@${FEATURE_DIR}/tasks.md"

mkdir -p "$LOG_DIR"

# ─── Helpers ─────────────────────────────────────────────────────
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/run_${TIMESTAMP}.log"; }

should_stop() {
  if [[ -f "$STOP_FILE" ]]; then
    log "🛑 Stop file detected (.stop-phase-${PHASE}). Finishing cleanly."
    rm -f "$STOP_FILE"
    exit 0
  fi
}

trap 'log "🛑 Interrupted (SIGINT). Cleaning up."; rm -f "$STOP_FILE"; exit 130' INT
trap 'rm -f "$STOP_FILE"' EXIT

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
    && grep -qiE "(\*\*)?status(\*\*)?:\s*(\*\*)?(approved|approved with observations)" "$review_file" 2>/dev/null
}

run_claude() {
  local log_file="$1"
  local prompt="$2"
  local model="${3:-$MODEL}"
  claude -p --dangerously-skip-permissions --model "$model" "$prompt" \
    2>&1 | tee "$log_file"
  return "${PIPESTATUS[0]}"
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
log "Starting Phase ${PHASE} | model: ${MODEL} | review model: ${REVIEW_MODEL} | max tasks: ${MAX_TASKS}"
log "To stop gracefully: touch ${STOP_FILE}  (or Ctrl-C)"

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
    log "✅ All Phase ${PHASE} tasks complete!"
    break
  fi

  if [[ "$task_num" -ge "$MAX_TASKS" ]]; then
    log "⚠️  Hit max tasks cap (${MAX_TASKS}). Stopping."
    break
  fi

  task_num=$((task_num + 1))
  TASK_ID=$(next_task_id)
  TASK_DESC=$(next_task_line)

  if [[ -z "$TASK_ID" ]]; then
    log "No more incomplete tasks found for Phase ${PHASE}."
    break
  fi

  log "━━━ Task #${task_num} — ${TASK_ID} ━━━"
  log "Description: ${TASK_DESC}"

  # ── Step 1: Execute Task (.claude/commands/execute-task) ──────
  log "▶ Executing task ${TASK_ID}..."

  run_claude "$LOG_DIR/task_${task_num}_execute_${TIMESTAMP}.log" \
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
    || { log "❌ Task execution failed. See $LOG_DIR/task_${task_num}_execute_${TIMESTAMP}.log"; exit 1; }

  # ── Step 2: Review + Fix Loop (.claude/agents/task-reviewer) ──
  review_attempt=0

  while [[ "$review_attempt" -lt "$MAX_REVIEW_ATTEMPTS" ]]; do
    should_stop

    review_attempt=$((review_attempt + 1))
    log "▶ Review attempt ${review_attempt}/${MAX_REVIEW_ATTEMPTS} for task ${TASK_ID}..."

    run_claude "$LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log" \
      "${CTX_REVIEW} @.claude/agents/task-reviewer.md

You are the task-reviewer agent. Follow @.claude/agents/task-reviewer.md exactly.

Review the following completed task:
  Task ID: ${TASK_ID}
  Description: ${TASK_DESC}

The task definition is in @${FEATURE_DIR}/tasks.md.
Generate the review artifact as ${FEATURE_DIR}/${TASK_ID}_task_review.md.
Git commit: 'review(phase${PHASE}): review task ${TASK_ID}'" "$REVIEW_MODEL" \
      || { log "❌ Review failed. See $LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log"; exit 1; }

    # Check if review passed
    if review_passed "$TASK_ID"; then
      log "✅ Task ${TASK_ID} review PASSED."
      break
    fi

    # Track that at least one task needed multiple attempts
    ALL_FIRST_PASS=false

    # If max attempts reached, warn and move on
    if [[ "$review_attempt" -ge "$MAX_REVIEW_ATTEMPTS" ]]; then
      log "⚠️  Max review attempts (${MAX_REVIEW_ATTEMPTS}) reached for task ${TASK_ID}. Moving on."
      break
    fi

    # ── Step 3: Analyze review & apply fixes ──────────────────
    log "▶ Applying review recommendations for task ${TASK_ID}..."

    run_claude "$LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log" \
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
      || { log "❌ Fix application failed. See $LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log"; exit 1; }
  done

  log "Task ${TASK_ID} complete. Pausing 5s..."
  sleep 5
done

# ─── QA Pass (.claude/commands/execute-qa) ───────────────────────
should_stop

if $ALL_FIRST_PASS; then
  log "━━━ All reviews passed first try — running lightweight QA ━━━"

  run_claude "$LOG_DIR/qa_${TIMESTAMP}.log" \
    "${CTX_REVIEW} @${PHASE_TASKS}

Run a lightweight verification for Phase ${PHASE}:
1. npx tsc --noEmit
2. pnpm test
3. pnpm run test:coverage
4. pnpm build

If ALL pass, write a brief QA summary to ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
Git commit: 'test(phase${PHASE}): QA report'" "$REVIEW_MODEL" \
    || log "⚠️  QA pass encountered issues. Check $LOG_DIR/qa_${TIMESTAMP}.log"
else
  log "━━━ Running full QA for Phase ${PHASE} ━━━"

  run_claude "$LOG_DIR/qa_${TIMESTAMP}.log" \
    "${CTX_EXECUTE} @${PHASE_TASKS} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Run QA for ALL completed Phase ${PHASE} tasks.
Write the QA report to ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
If bugs are found, document them in ${FEATURE_DIR}/bugs.md with status: Open.
Git commit: 'test(phase${PHASE}): QA report'
Update progress.txt (max 10 lines)." \
    || log "⚠️  QA pass encountered issues. Check $LOG_DIR/qa_${TIMESTAMP}.log"
fi

# ─── Bugfix Pass (.claude/commands/execute-bugfix) ───────────────
if has_bugs; then
  should_stop

  log "━━━ Bugs found — running bugfix pass ━━━"

  run_claude "$LOG_DIR/bugfix_${TIMESTAMP}.log" \
    "${CTX_FIX} @.claude/commands/execute-bugfix.md @${FEATURE_DIR}/bugs.md

Follow the instructions in @.claude/commands/execute-bugfix.md exactly.

Fix ALL bugs in @${FEATURE_DIR}/bugs.md with status: Open.
Fix in severity order: High → Medium → Low.
For each bug: fix root cause, create regression tests, run tests, build.
Update bugs.md with fix status.
Git commit: 'fix(phase${PHASE}): fix bugs'
Update progress.txt (max 10 lines)." \
    || log "⚠️  Bugfix pass encountered issues. Check $LOG_DIR/bugfix_${TIMESTAMP}.log"

  # ── Re-QA after bugfixes ──────────────────────────────────────
  should_stop

  log "━━━ Re-running QA after bugfixes ━━━"

  run_claude "$LOG_DIR/qa_recheck_${TIMESTAMP}.log" \
    "${CTX_FIX} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Re-verify Phase ${PHASE} after bugfixes.
Update the QA report at ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
If new bugs found, document them in ${FEATURE_DIR}/bugs.md.
Git commit: 'test(phase${PHASE}): QA re-verification after bugfixes'" \
    || log "⚠️  QA re-check encountered issues. Check $LOG_DIR/qa_recheck_${TIMESTAMP}.log"
fi

# ─── Summary ─────────────────────────────────────────────────────
log ""
log "╔══════════════════════════════════════════╗"
log "║   Phase ${PHASE} complete!               ║"
log "║   Model: ${MODEL}                        ║"
log "║   Review model: ${REVIEW_MODEL}           ║"
log "║   Tasks executed: ${task_num}            ║"
log "║   Logs: ${LOG_DIR}/                      ║"
log "╚══════════════════════════════════════════╝"