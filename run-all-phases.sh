#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ───────────────────────────────────────────────────────
# chmod +x run-all-phases.sh
# ./run-all-phases.sh              → runs phases 2 through 7
# ./run-all-phases.sh 3 5          → runs phases 3 through 5
# ./run-all-phases.sh 2 7 20       → phases 2–7, max 20 tasks per phase

START_PHASE="${1:-2}"
END_PHASE="${2:-7}"
MAX_TASKS_PER_PHASE="${3:-50}"

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

  if ./run-phase.sh "$phase" "$MAX_TASKS_PER_PHASE"; then
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