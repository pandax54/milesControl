#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ───────────────────────────────────────────────────────
# chmod +x run-all-phases.sh
# ./run-all-phases.sh                                              → phases 2–7
# ./run-all-phases.sh 3 5                                          → phases 3–5
# ./run-all-phases.sh 2 7 20                                       → max 20 tasks/phase
# ./run-all-phases.sh 2 7 50 --model claude-opus-4-5               → custom model
# ./run-all-phases.sh 2 7 50 --review-model claude-haiku-4-5       → cheaper reviews

# Cheaper reviews across all phases:
# ./run-all-phases.sh 4 7 50 --model claude-sonnet-4-6 --review-model claude-haiku-4-5
# Custom execution model:
# ./run-all-phases.sh 4 7 50 --model claude-opus-4-5

START_PHASE="${1:-2}"
END_PHASE="${2:-7}"
MAX_TASKS_PER_PHASE="${3:-50}"

# Consume positional args, collect remaining flags to forward
shift 3 2>/dev/null || shift $# 2>/dev/null || true
EXTRA_FLAGS=("$@")

LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_LOG="${LOG_DIR}/all_phases_${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$SUMMARY_LOG"; }

# ─── Phase Loop ──────────────────────────────────────────────────
PASSED_PHASES=()
FAILED_PHASE=""

for phase in $(seq "$START_PHASE" "$END_PHASE"); do
  log ""
  log "╔══════════════════════════════════════════╗"
  log "║   Starting Phase ${phase}                       ║"
  log "╚══════════════════════════════════════════╝"

  if ./run-phase.sh "$phase" "$MAX_TASKS_PER_PHASE" "${EXTRA_FLAGS[@]+${EXTRA_FLAGS[@]}}"; then
    PASSED_PHASES+=("$phase")
    log "✅ Phase ${phase} finished successfully."
  else
    FAILED_PHASE="$phase"
    log "❌ Phase ${phase} failed. Stopping pipeline."
    break
  fi

  if [[ "$phase" -lt "$END_PHASE" ]]; then
    log "Pausing 10s before Phase $((phase + 1))..."
    sleep 10
  fi
done

# ─── Final Summary ───────────────────────────────────────────────
log ""
log "╔══════════════════════════════════════════╗"
log "║          Pipeline Summary                ║"
log "╠══════════════════════════════════════════╣"
log "║  Phases requested: ${START_PHASE}–${END_PHASE}              ║"
log "║  Phases completed: ${PASSED_PHASES[*]:-none}                ║"
if [[ -n "$FAILED_PHASE" ]]; then
  log "║  Failed at phase:  ${FAILED_PHASE}                        ║"
  log "║  Status: STOPPED                       ║"
else
  log "║  Status: ALL DONE 🎉                   ║"
fi
log "║  Full log: ${SUMMARY_LOG}               ║"
log "╚══════════════════════════════════════════╝"

[[ -z "$FAILED_PHASE" ]]