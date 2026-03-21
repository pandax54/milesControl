#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
PHASE="${1:?Usage: ./run-phase.sh <phase_number> [max_tasks]}"
MAX_TASKS="${2:-50}"
MAX_REVIEW_ATTEMPTS=3
FEATURE_DIR="tasks/prd-milescontrol"
LOG_DIR="logs/phase-${PHASE}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Claude context files (@ notation — expanded by Claude CLI)
CTX="@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md @${FEATURE_DIR}/tasks.md @progress.txt"

mkdir -p "$LOG_DIR"

# ─── Helpers ─────────────────────────────────────────────────────
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/run_${TIMESTAMP}.log"; }

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
    && grep -qiE "status:\s*(approved|approved with observations)" "$review_file" 2>/dev/null
}

run_claude() {
  local log_file="$1"
  local prompt="$2"
  claude -p --dangerously-skip-permissions "$prompt" \
    2>&1 | tee "$log_file"
  return "${PIPESTATUS[0]}"
}

# ─── Task Execution Loop ────────────────────────────────────────
task_num=0

while true; do
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
    "${CTX} @.claude/commands/execute-task.md

Follow the instructions in @.claude/commands/execute-task.md exactly.

Implement the following task from tasks.md:
  Task ID: ${TASK_ID}
  Full description: ${TASK_DESC}

This is the line in tasks.md: '- [ ] ${TASK_DESC}'
After implementation, mark it complete in tasks.md (change '- [ ]' to '- [x]').
Git commit: 'feat(phase${PHASE}): complete task ${TASK_ID} — <short description>'
Update progress.txt.

ONLY DO ONE TASK. Stop after committing." \
    || { log "❌ Task execution failed. See $LOG_DIR/task_${task_num}_execute_${TIMESTAMP}.log"; exit 1; }

  # ── Step 2: Review + Fix Loop (.claude/agents/task-reviewer) ──
  review_attempt=0

  while [[ "$review_attempt" -lt "$MAX_REVIEW_ATTEMPTS" ]]; do
    review_attempt=$((review_attempt + 1))
    log "▶ Review attempt ${review_attempt}/${MAX_REVIEW_ATTEMPTS} for task ${TASK_ID}..."

    run_claude "$LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log" \
      "${CTX} @.claude/agents/task-reviewer.md

You are the task-reviewer agent. Follow @.claude/agents/task-reviewer.md exactly.

Review the following completed task:
  Task ID: ${TASK_ID}
  Description: ${TASK_DESC}

The task definition is in @${FEATURE_DIR}/tasks.md.
Generate the review artifact as ${FEATURE_DIR}/${TASK_ID}_task_review.md.
Git commit: 'review(phase${PHASE}): review task ${TASK_ID}'" \
      || { log "❌ Review failed. See $LOG_DIR/task_${task_num}_review_${review_attempt}_${TIMESTAMP}.log"; exit 1; }

    # Check if review passed
    if review_passed "$TASK_ID"; then
      log "✅ Task ${TASK_ID} review PASSED."
      break
    fi

    # If max attempts reached, warn and move on
    if [[ "$review_attempt" -ge "$MAX_REVIEW_ATTEMPTS" ]]; then
      log "⚠️  Max review attempts (${MAX_REVIEW_ATTEMPTS}) reached for task ${TASK_ID}. Moving on."
      break
    fi

    # ── Step 3: Analyze review & apply fixes ──────────────────
    log "▶ Applying review recommendations for task ${TASK_ID}..."

    run_claude "$LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log" \
      "${CTX} @${FEATURE_DIR}/${TASK_ID}_task_review.md

Read the review at @${FEATURE_DIR}/${TASK_ID}_task_review.md for task ${TASK_ID}.

Task reviewed: ${TASK_DESC}

Apply ALL recommendations and fix ALL issues flagged in the review:
1. Fix CRITICAL issues first, then MAJOR, then MINOR.
2. Run 'npx tsc --noEmit' — fix any type errors.
3. Run 'pnpm test' — fix any test failures.
4. Run 'pnpm run test:coverage' — ensure coverage thresholds are met.
5. Git commit: 'fix(phase${PHASE}): apply review fixes for task ${TASK_ID}'
6. Update progress.txt." \
      || { log "❌ Fix application failed. See $LOG_DIR/task_${task_num}_fix_${review_attempt}_${TIMESTAMP}.log"; exit 1; }
  done

  log "Task ${TASK_ID} complete. Pausing 5s..."
  sleep 5
done

# ─── QA Pass (.claude/commands/execute-qa) ───────────────────────
log "━━━ Running QA for Phase ${PHASE} ━━━"

run_claude "$LOG_DIR/qa_${TIMESTAMP}.log" \
  "${CTX} @.claude/commands/execute-qa.md

Follow the instructions in @.claude/commands/execute-qa.md exactly.

Run QA for ALL completed Phase ${PHASE} tasks.
Write the QA report to ${FEATURE_DIR}/qa-report-phase${PHASE}.md.
If bugs are found, document them in ${FEATURE_DIR}/bugs.md with status: Open.
Git commit: 'test(phase${PHASE}): QA report'
Update progress.txt." \
  || log "⚠️  QA pass encountered issues. Check $LOG_DIR/qa_${TIMESTAMP}.log"

# ─── Bugfix Pass (.claude/commands/execute-bugfix) ───────────────
if has_bugs; then
  log "━━━ Bugs found — running bugfix pass ━━━"

  run_claude "$LOG_DIR/bugfix_${TIMESTAMP}.log" \
    "${CTX} @.claude/commands/execute-bugfix.md @${FEATURE_DIR}/bugs.md

Follow the instructions in @.claude/commands/execute-bugfix.md exactly.

Fix ALL bugs in @${FEATURE_DIR}/bugs.md with status: Open.
Fix in severity order: High → Medium → Low.
For each bug: fix root cause, create regression tests, run tests.
Update bugs.md with fix status.
Git commit: 'fix(phase${PHASE}): fix bugs'
Update progress.txt." \
    || log "⚠️  Bugfix pass encountered issues. Check $LOG_DIR/bugfix_${TIMESTAMP}.log"

  # ── Re-QA after bugfixes ──────────────────────────────────────
  log "━━━ Re-running QA after bugfixes ━━━"

  run_claude "$LOG_DIR/qa_recheck_${TIMESTAMP}.log" \
    "${CTX} @.claude/commands/execute-qa.md

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
log "║   Tasks executed: ${task_num}            ║"
log "║   Logs: ${LOG_DIR}/                      ║"
log "╚══════════════════════════════════════════╝"