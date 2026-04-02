#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  workflow.sh — End-to-end Jira → Branch → PRD → Code → PR pipeline
# ═══════════════════════════════════════════════════════════════════
#
# Orchestrates the full development lifecycle for a Jira issue:
#   1. Pick an assigned Jira issue (or specify one)
#   2. Transition to In Progress
#   3. Create git worktree + branch
#   4. Read the task, ask clarification questions if needed
#   5. Create PRD → wait for review
#   6. Create Tech Spec + Tasks → wait for review
#   7. Execute tasks (via ralph-once.sh / run-phase.sh)
#   8. Push + create PR → transition to Code Review
#   9. After merge → transition to QA
#
# Usage:
#   ./workflow.sh                                 — Pick next assigned issue interactively
#   ./workflow.sh <ISSUE_KEY>                     — Start with a specific issue
#   ./workflow.sh <ISSUE_KEY> --resume            — Resume from last completed phase
#   ./workflow.sh <ISSUE_KEY> --skip-to <phase>   — Skip to a specific phase
#   ./workflow.sh <ISSUE_KEY> --plan-only         — Run planning (phases 1–6), stop before impl
#   ./workflow.sh <ISSUE_KEY> --implement         — Skip to implementation using existing plan
#   ./workflow.sh <ISSUE_KEY> --implement --phase 2           — Implement only phase 2
#   ./workflow.sh <ISSUE_KEY> --implement --task <file.md>    — Implement one task file
#
# Phases: pick, branch, clarify, prd, techspec, tasks, implement, pr, qa
#
# Options:
#   --cli <tool>            CLI for AI work (claude|copilot|opencode|codex, default: claude)
#   --feature-model <model> Model for feature/implementation work (default: claude-opus-4-6)
#   --review-model <model>  Model for review work (default: claude-sonnet-4-6)
#   --model <model>         Shorthand: sets both --feature-model and --review-model
#   --telegram              Enable Telegram notifications
#   --auto                  Skip human confirmations (for non-interactive steps)
#   --skip-to <phase>       Start from a specific phase
#   --resume                Detect progress and resume
#   --plan-only             Run planning phases only (1–6), stop before implementation
#   --implement             Skip straight to implementation (requires existing plan)
#   --phase <N>             With --implement: run only phase N
#   --task <file>           With --implement: run only the specified task file
#   --project-repo <path>   Path to the actual project repo (default: cwd)

# ─── Colors & Formatting ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Load env ────────────────────────────────────────────────────
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

# ─── Configuration ──────────────────────────────────────────────
ISSUE_KEY="${1:-}"
PROJECT_REPO="${PROJECT_REPO:-.}"
EXEC_CLI="claude"
FEATURE_MODEL=""
REVIEW_MODEL=""
TELEGRAM_ENABLED=false
AUTO_MODE=false
SKIP_TO=""
RESUME=false
PLAN_ONLY=false
IMPLEMENT_ONLY=false
IMPLEMENT_PHASE=""
IMPLEMENT_TASK=""
GITHUB_REMOTE="${GITHUB_REMOTE:-origin}"
BASE_BRANCH="${BASE_BRANCH:-main}"

# Telegram config
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Auto-enable Telegram if credentials are available in env
if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
  TELEGRAM_ENABLED=true
fi

# Parse flags
if [[ -n "$ISSUE_KEY" && "$ISSUE_KEY" != --* ]]; then
  shift
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli)             EXEC_CLI="${2:?--cli requires value}"; shift 2 ;;
    --model)           FEATURE_MODEL="${2:?--model requires value}"; REVIEW_MODEL="$FEATURE_MODEL"; shift 2 ;;
    --feature-model)   FEATURE_MODEL="${2:?--feature-model requires value}"; shift 2 ;;
    --review-model)    REVIEW_MODEL="${2:?--review-model requires value}"; shift 2 ;;
    --telegram)        TELEGRAM_ENABLED=true; shift ;;
    --auto)            AUTO_MODE=true; shift ;;
    --skip-to)         SKIP_TO="${2:?--skip-to requires value}"; shift 2 ;;
    --resume)          RESUME=true; shift ;;
    --plan-only)       PLAN_ONLY=true; shift ;;
    --implement)       IMPLEMENT_ONLY=true; shift ;;
    --phase)           IMPLEMENT_PHASE="${2:?--phase requires value}"; shift 2 ;;
    --task)            IMPLEMENT_TASK="${2:?--task requires value}"; shift 2 ;;
    --project-repo)    PROJECT_REPO="${2:?--project-repo requires value}"; shift 2 ;;
    *)                 shift ;;
  esac
done

# Resolve default models
FEATURE_MODEL="${FEATURE_MODEL:-claude-opus-4-6}"
REVIEW_MODEL="${REVIEW_MODEL:-claude-sonnet-4-6}"

# State file for tracking progress
STATE_DIR="${SCRIPT_DIR}/.workflow-state"
mkdir -p "$STATE_DIR"

LOG_DIR="${SCRIPT_DIR}/logs/workflow"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ─── Helpers ─────────────────────────────────────────────────────
log() {
  echo -e "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/workflow_${TIMESTAMP}.log"
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

telegram_send() {
  if ! $TELEGRAM_ENABLED; then return 0; fi
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then return 0; fi
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d parse_mode="Markdown" \
    -d text="$1" \
    > /dev/null 2>&1 || true
}

confirm_step() {
  local step_name="$1"
  local description="$2"

  if $AUTO_MODE; then
    log "${DIM}[auto] Skipping confirmation for: ${step_name}${RESET}"
    return 0
  fi

  echo ""
  echo -e "${YELLOW}${BOLD}┌─────────────────────────────────────────────────┐${RESET}"
  echo -e "${YELLOW}${BOLD}│  CHECKPOINT: ${step_name}${RESET}"
  echo -e "${YELLOW}${BOLD}├─────────────────────────────────────────────────┤${RESET}"
  echo -e "${YELLOW}│  ${description}${RESET}"
  echo -e "${YELLOW}${BOLD}└─────────────────────────────────────────────────┘${RESET}"
  echo ""
  echo -e "  ${GREEN}[y/enter]${RESET} Continue    ${RED}[n]${RESET} Skip    ${RED}[q]${RESET} Quit"
  echo -n "  → "

  read -r response
  case "$(echo "$response" | tr '[:upper:]' '[:lower:]')" in
    n|no|skip) return 1 ;;
    q|quit|exit) log "${RED}🛑 Aborted by user.${RESET}"; exit 0 ;;
    *) return 0 ;;
  esac
}

# State management: track which phase has been completed for an issue
save_state() {
  local key="$1" value="$2"
  echo "$value" > "${STATE_DIR}/${ISSUE_KEY}_${key}"
}

load_state() {
  local key="$1"
  local file="${STATE_DIR}/${ISSUE_KEY}_${key}"
  if [[ -f "$file" ]]; then
    cat "$file"
  else
    echo ""
  fi
}

state_exists() {
  [[ -f "${STATE_DIR}/${ISSUE_KEY}_${1}" ]]
}

should_run_phase() {
  local phase="$1"
  if [[ -n "$SKIP_TO" ]]; then
    local phases=("pick" "branch" "clarify" "prd" "techspec" "tasks" "implement" "pr" "qa")
    local skip_idx=-1
    local phase_idx=-1
    for i in "${!phases[@]}"; do
      [[ "${phases[$i]}" == "$SKIP_TO" ]] && skip_idx=$i
      [[ "${phases[$i]}" == "$phase" ]] && phase_idx=$i
    done
    if [[ $phase_idx -lt $skip_idx ]]; then
      log "${DIM}⏭  Skipping phase: ${phase} (--skip-to ${SKIP_TO})${RESET}"
      return 1
    fi
    if [[ $phase_idx -eq $skip_idx ]]; then
      SKIP_TO=""
    fi
  fi

  if $RESUME && state_exists "${phase}_done"; then
    log "${DIM}⏭  Already completed: ${phase} (--resume)${RESET}"
    return 1
  fi

  return 0
}

# ─── Worktree & Issue Directory Helpers ──────────────────────────
ensure_worktree() {
  local wt
  wt=$(load_state "worktree")
  if [[ -z "$wt" || ! -d "$wt" ]]; then
    log "${RED}❌ Worktree path not found or invalid: '${wt}'. Run the branch phase first.${RESET}"
    exit 1
  fi
  if ! git -C "$wt" rev-parse --git-dir &>/dev/null; then
    log "${RED}❌ Worktree at '${wt}' is not a valid git repository.${RESET}"
    exit 1
  fi
  cd "$wt"
  log "${DIM}worktree: $(pwd)${RESET}"
}

resolve_issue_dir() {
  local wt
  wt=$(load_state "worktree")
  echo "${wt}/tasks/prd-${ISSUE_KEY}"
}

summarize_for_telegram() {
  local file="$1"
  local max_chars="${2:-400}"
  if [[ ! -f "$file" ]]; then echo "(file not found)"; return; fi
  local content
  content=$(grep -E '^#{1,3} |^- \[|^### Task' "$file" | head -20)
  if [[ ${#content} -gt $max_chars ]]; then
    content="${content:0:$max_chars}"
    content="${content% *}…"
  fi
  echo "$content"
}

run_ai() {
  local log_file="$1"
  local prompt="$2"

  log "${DIM}CLI: ${EXEC_CLI} | Model: ${FEATURE_MODEL}${RESET}"

  # Protect orchestration scripts from being modified by the AI
  local _protected=("${SCRIPT_DIR}/workflow.sh" "${SCRIPT_DIR}/ralph-once.sh" "${SCRIPT_DIR}/run-phase.sh" "${SCRIPT_DIR}/jira.sh")
  for _f in "${_protected[@]}"; do
    [[ -f "$_f" ]] && chmod u-w "$_f" 2>/dev/null || true
  done

  local _ai_exit=0
  case "$EXEC_CLI" in
    claude)
      claude -p --dangerously-skip-permissions --model "$FEATURE_MODEL" "$prompt" \
        2>&1 | tee "$log_file"
      _ai_exit="${PIPESTATUS[0]}"
      ;;
    copilot)
      copilot -p "$prompt" --allow-all-tools --model "$FEATURE_MODEL" \
        2>&1 | tee "$log_file"
      _ai_exit="${PIPESTATUS[0]}"
      ;;
    opencode)
      opencode --model "$FEATURE_MODEL" "$prompt" \
        2>&1 | tee "$log_file"
      _ai_exit="${PIPESTATUS[0]}"
      ;;
    codex)
      codex --model "$FEATURE_MODEL" --full-auto "$prompt" \
        2>&1 | tee "$log_file"
      _ai_exit="${PIPESTATUS[0]}"
      ;;
  esac

  # Restore write permissions on protected scripts
  for _f in "${_protected[@]}"; do
    [[ -f "$_f" ]] && chmod u+w "$_f" 2>/dev/null || true
  done

  return "$_ai_exit"
}

# Build branch name from issue: LD-14 "User login flow" → feature/LD-14-user-login-flow
build_branch_name() {
  local key="$1"
  local summary="$2"
  local slug
  slug=$(echo "$summary" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50)
  echo "feature/${key}-${slug}"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 1: Pick Issue
# ═══════════════════════════════════════════════════════════════════
phase_pick() {
  if [[ -n "$ISSUE_KEY" ]]; then
    log "Issue specified: ${ISSUE_KEY}"
    return 0
  fi

  banner "Phase 1: Pick Jira Issue" "$BLUE"

  # Capture issue keys for number-based selection
  local issues_output
  issues_output=$("${SCRIPT_DIR}/jira.sh" my-issues)
  echo "$issues_output"

  # Extract issue keys in order from the output
  local -a issue_keys
  while IFS= read -r key; do
    issue_keys+=("$key")
  done < <(echo "$issues_output" | grep -oE '\[([A-Z]+-[0-9]+)\]' | tr -d '[]')

  local num_issues=${#issue_keys[@]}

  if [[ $num_issues -eq 0 ]]; then
    log "${RED}No issues found. Exiting.${RESET}"
    exit 1
  fi

  echo ""
  echo -e "${BOLD}Pick an issue:${RESET}"
  echo -e "  Enter ${GREEN}number${RESET} (1-${num_issues}) or ${GREEN}issue key${RESET} (e.g. LD-14)"
  echo -e "  ${DIM}Press enter for #1 (highest priority): ${issue_keys[0]}${RESET}"
  echo -n "  → "
  read -r selection

  if [[ -z "$selection" ]]; then
    # Default: pick the first (highest priority)
    ISSUE_KEY="${issue_keys[0]}"
  elif [[ "$selection" =~ ^[0-9]+$ ]]; then
    # Number selection
    local idx=$((selection - 1))
    if [[ $idx -ge 0 && $idx -lt $num_issues ]]; then
      ISSUE_KEY="${issue_keys[$idx]}"
    else
      log "${RED}Invalid number: ${selection} (1-${num_issues} available)${RESET}"
      exit 1
    fi
  else
    # Direct issue key
    ISSUE_KEY="$selection"
  fi

  log "${GREEN}Selected: ${ISSUE_KEY}${RESET}"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 2: Create Branch + Worktree
# ═══════════════════════════════════════════════════════════════════
phase_branch() {
  banner "Phase 2: Create Branch + Worktree" "$BLUE"

  # Get issue summary for branch name
  local desc_output
  desc_output=$("${SCRIPT_DIR}/jira.sh" description "$ISSUE_KEY")
  local summary
  summary=$(echo "$desc_output" | head -1 | sed "s/^# ${ISSUE_KEY}: //")

  local branch_name
  branch_name=$(build_branch_name "$ISSUE_KEY" "$summary")
  save_state "branch" "$branch_name"

  log "Branch: ${branch_name}"

  cd "$PROJECT_REPO"

  # Ensure we have the latest base branch
  git fetch "$GITHUB_REMOTE" "$BASE_BRANCH" 2>/dev/null || true

  # Check if worktree already exists
  local worktree_path="../worktrees/${branch_name##*/}"
  if git worktree list | grep -q "$branch_name"; then
    log "${YELLOW}Worktree already exists for ${branch_name}${RESET}"
    local existing_path
    existing_path=$(git worktree list | grep "$branch_name" | awk '{print $1}')
    save_state "worktree" "$existing_path"
    cd "$existing_path"
  else
    # Create worktree
    mkdir -p "$(dirname "$worktree_path")"
    git worktree add -b "$branch_name" "$worktree_path" "${GITHUB_REMOTE}/${BASE_BRANCH}" 2>/dev/null \
      || git worktree add "$worktree_path" "$branch_name" 2>/dev/null \
      || {
        # Branch might exist remotely
        git worktree add --track -b "$branch_name" "$worktree_path" "${GITHUB_REMOTE}/${BASE_BRANCH}" 2>/dev/null \
          || { log "${RED}❌ Failed to create worktree${RESET}"; return 1; }
      }
    save_state "worktree" "$(cd "$worktree_path" && pwd)"
    cd "$worktree_path"
    log "${GREEN}✅ Worktree created at: $(pwd)${RESET}"
  fi

  # Transition to In Progress
  "${SCRIPT_DIR}/jira.sh" transition "$ISSUE_KEY" "in-progress" || true
  "${SCRIPT_DIR}/jira.sh" comment "$ISSUE_KEY" "🔄 Started working on this. Branch: ${branch_name}" || true

  telegram_send "🔄 *Workflow started*
Issue: \`${ISSUE_KEY}\`
Summary: ${summary}
Branch: \`${branch_name}\`"

  save_state "branch_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 3: Read & Clarify
# ═══════════════════════════════════════════════════════════════════
phase_clarify() {
  banner "Phase 3: Read Issue & Clarify" "$BLUE"

  ensure_worktree

  local issue_dir
  issue_dir=$(resolve_issue_dir)
  mkdir -p "$issue_dir"
  log "${DIM}issue_dir: ${issue_dir}${RESET}"

  "${SCRIPT_DIR}/jira.sh" description "$ISSUE_KEY" > "${issue_dir}/jira-description.md"
  log "Saved Jira description to ${issue_dir}/jira-description.md"

  # Check if there are aspects that need clarification
  local questions_file="${issue_dir}/clarification-questions.md"

  run_ai "$LOG_DIR/clarify_${ISSUE_KEY}_${TIMESTAMP}.log" \
    "@${issue_dir}/jira-description.md

Read the Jira issue description above carefully.

Your task:
1. Analyze if the description is clear enough to create a PRD
2. If there are aspects that are ambiguous, unclear, or missing important details,
   create a file at '${questions_file}' with specific questions that need answers.
   Format each question with context about why it matters.
3. If the description is clear enough, create '${questions_file}' with just:
   '# No clarification needed
   The issue description is clear enough to proceed with PRD creation.'

Be specific and practical. Don't ask obvious questions. Focus on:
- Unclear acceptance criteria
- Missing edge cases
- Ambiguous business rules
- Undefined user flows
- Missing technical constraints" \
    || log "${YELLOW}⚠ Clarification analysis had issues${RESET}"

  if [[ -f "$questions_file" ]] && ! grep -qi "no clarification needed" "$questions_file" 2>/dev/null; then
    log "${YELLOW}📝 Clarification questions generated${RESET}"

    # Notify on Telegram with content summary
    local questions_summary
    questions_summary=$(summarize_for_telegram "$questions_file" 400)
    telegram_send "❓ *Clarification needed* — \`${ISSUE_KEY}\`

${questions_summary}

Answer the questions, then resume:
\`./workflow.sh ${ISSUE_KEY} --resume\`"

    if ! $AUTO_MODE; then
      echo ""
      log "${YELLOW}Please answer the clarification questions in:${RESET}"
      log "${BOLD}  ${questions_file}${RESET}"
      echo ""
      confirm_step "Clarification" "Have you answered the questions? Press enter to continue." || return 1
    else
      log "${YELLOW}Auto mode: proceeding without clarification answers${RESET}"
    fi
  else
    log "${GREEN}✅ No clarification needed — proceeding to PRD${RESET}"
  fi

  save_state "clarify_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 4: Create PRD
# ═══════════════════════════════════════════════════════════════════
phase_prd() {
  banner "Phase 4: Create PRD" "$BLUE"

  ensure_worktree

  local issue_dir
  issue_dir=$(resolve_issue_dir)
  log "${DIM}issue_dir: ${issue_dir}${RESET}"
  local jira_desc="${issue_dir}/jira-description.md"
  local questions="${issue_dir}/clarification-questions.md"
  local prd_file="${issue_dir}/prd.md"

  telegram_send "📝 *Creating PRD* — \`${ISSUE_KEY}\`"

  local context_files="@${jira_desc}"
  if [[ -f "$questions" ]]; then
    context_files="${context_files} @${questions}"
  fi

  run_ai "$LOG_DIR/prd_${ISSUE_KEY}_${TIMESTAMP}.log" \
    "${context_files} @.claude/commands/create-prd.md @.claude/templates/prd.md

Follow the instructions in @.claude/commands/create-prd.md exactly.

Create a PRD for the Jira issue ${ISSUE_KEY}.
The issue description is in @${jira_desc}.
$(if [[ -f "$questions" ]]; then echo "Clarification Q&A is in @${questions}."; fi)

Output the PRD to: ${prd_file}
Feature directory: ${issue_dir}

Since this is automated, skip the interactive clarification step —
use the Jira description and any answered questions as the source of truth.
Focus on generating a complete, actionable PRD." \
    || { log "${RED}❌ PRD creation failed${RESET}"; return 1; }

  if [[ -f "$prd_file" ]]; then
    log "${GREEN}✅ PRD created: ${prd_file}${RESET}"

    local prd_summary
    prd_summary=$(summarize_for_telegram "$prd_file" 400)
    telegram_send "✅ *PRD ready for review* — \`${ISSUE_KEY}\`

${prd_summary}

Review and approve, then resume:
\`./workflow.sh ${ISSUE_KEY} --resume\`"

    if ! $AUTO_MODE; then
      confirm_step "PRD Review" "Review the PRD and press enter to continue." || return 1
    fi
  else
    log "${RED}❌ PRD file not found at ${prd_file}${RESET}"
    return 1
  fi

  save_state "prd_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 5: Create Tech Spec
# ═══════════════════════════════════════════════════════════════════
phase_techspec() {
  banner "Phase 5: Create Tech Spec" "$BLUE"

  ensure_worktree

  local issue_dir
  issue_dir=$(resolve_issue_dir)
  log "${DIM}issue_dir: ${issue_dir}${RESET}"
  local techspec_file="${issue_dir}/techspec.md"

  telegram_send "📐 *Creating Tech Spec* — \`${ISSUE_KEY}\`"

  run_ai "$LOG_DIR/techspec_${ISSUE_KEY}_${TIMESTAMP}.log" \
    "@${issue_dir}/prd.md @.claude/commands/create-techspec.md @.claude/templates/techspec.md

Follow the instructions in @.claude/commands/create-techspec.md exactly.

Create a Tech Spec for ${ISSUE_KEY}.
The PRD is at @${issue_dir}/prd.md.
Output to: ${techspec_file}

Since this is automated, skip the interactive clarification step.
Use the PRD as the source of truth and make reasonable technical decisions." \
    || { log "${RED}❌ Tech spec creation failed${RESET}"; return 1; }

  if [[ -f "$techspec_file" ]]; then
    log "${GREEN}✅ Tech Spec created: ${techspec_file}${RESET}"
  else
    log "${RED}❌ Tech spec not found${RESET}"
    return 1
  fi

  save_state "techspec_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 6: Create Tasks
# ═══════════════════════════════════════════════════════════════════
phase_tasks() {
  banner "Phase 6: Create Tasks" "$BLUE"

  ensure_worktree

  local issue_dir
  issue_dir=$(resolve_issue_dir)
  log "${DIM}issue_dir: ${issue_dir}${RESET}"
  local tasks_file="${issue_dir}/tasks.md"

  run_ai "$LOG_DIR/tasks_${ISSUE_KEY}_${TIMESTAMP}.log" \
    "@${issue_dir}/prd.md @${issue_dir}/techspec.md @.claude/commands/create-tasks.md @.claude/templates/tasks.md @.claude/templates/task.md

Follow the instructions in @.claude/commands/create-tasks.md exactly.

Create tasks for ${ISSUE_KEY}.
PRD: @${issue_dir}/prd.md
Tech Spec: @${issue_dir}/techspec.md
Output: ${tasks_file} and individual task files in ${issue_dir}/

Since this is automated, generate the full task list without waiting for approval.
Keep to max 10 tasks." \
    || { log "${RED}❌ Task creation failed${RESET}"; return 1; }

  if [[ -f "$tasks_file" ]]; then
    log "${GREEN}✅ Tasks created: ${tasks_file}${RESET}"

    local techspec_summary
    techspec_summary=$(summarize_for_telegram "${issue_dir}/techspec.md" 250)
    local tasks_summary
    tasks_summary=$(summarize_for_telegram "$tasks_file" 250)
    telegram_send "✅ *Tech Spec + Tasks ready* — \`${ISSUE_KEY}\`

*Tech Spec:*
${techspec_summary}

*Tasks:*
${tasks_summary}

Review and resume:
\`./workflow.sh ${ISSUE_KEY} --resume\`"

    if ! $AUTO_MODE; then
      confirm_step "Tasks Review" "Review tech spec + tasks and press enter to continue." || return 1
    fi
  else
    log "${RED}❌ Tasks file not found${RESET}"
    return 1
  fi

  save_state "tasks_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 7: Implement (delegates to ralph-once / run-phase)
# ═══════════════════════════════════════════════════════════════════
phase_implement() {
  banner "Phase 7: Implementation" "$BLUE"

  ensure_worktree

  local issue_dir
  issue_dir=$(resolve_issue_dir)
  log "${DIM}issue_dir: ${issue_dir}${RESET}"

  # Detect the phase numbers from tasks.md
  local phases
  phases=$(grep -oE "^### Phase [0-9]+" "${issue_dir}/tasks.md" | grep -oE "[0-9]+" | sort -u || echo "1")

  log "Detected phases: ${phases}"
  telegram_send "🔨 *Starting implementation* — \`${ISSUE_KEY}\`
Phases: ${phases}"

  local extra_flags=""
  if $TELEGRAM_ENABLED; then extra_flags="--telegram"; fi

  for phase in $phases; do
    log "▶ Running phase ${phase}..."

    FEATURE_DIR="${issue_dir}" "${SCRIPT_DIR}/run-phase.sh" "$phase" 50 \
      --cli "$EXEC_CLI" --model "$FEATURE_MODEL" --review-model "$REVIEW_MODEL" \
      ${extra_flags:+$extra_flags} \
      || {
        log "${RED}❌ Phase ${phase} failed${RESET}"
        telegram_send "❌ *Implementation phase ${phase} failed* — \`${ISSUE_KEY}\`"

        if ! $AUTO_MODE; then
          confirm_step "Phase Failed" "Phase ${phase} failed. Press enter to continue with next phase, or q to quit." || break
        else
          break
        fi
      }
  done

  save_state "implement_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 8: Push + PR + Transition to Code Review
# ═══════════════════════════════════════════════════════════════════
phase_pr() {
  banner "Phase 8: Push & Create PR" "$BLUE"

  ensure_worktree

  local branch_name
  branch_name=$(load_state "branch")

  if ! $AUTO_MODE; then
    confirm_step "Push to GitHub" "Ready to push branch '${branch_name}' and create a PR?" || return 1
  fi

  # Push
  log "Pushing ${branch_name}..."
  git push -u "$GITHUB_REMOTE" "$branch_name"

  # Get issue summary for PR title
  local desc_output
  desc_output=$("${SCRIPT_DIR}/jira.sh" description "$ISSUE_KEY")
  local summary
  summary=$(echo "$desc_output" | head -1 | sed "s/^# ${ISSUE_KEY}: //")

  # Create PR using GitHub CLI
  if command -v gh &>/dev/null; then
    local issue_dir
    issue_dir=$(resolve_issue_dir)
    local pr_body="## ${ISSUE_KEY}: ${summary}

### Jira
[${ISSUE_KEY}](${JIRA_BASE_URL:-https://strvcom.atlassian.net}/browse/${ISSUE_KEY})

### Changes
$(git log "${GITHUB_REMOTE}/${BASE_BRANCH}..HEAD" --oneline | head -20)

### Checklist
- [ ] Tests passing
- [ ] Type check passing
- [ ] Build successful
- [ ] PRD requirements covered
"
    gh pr create \
      --base "$BASE_BRANCH" \
      --head "$branch_name" \
      --title "${ISSUE_KEY}: ${summary}" \
      --body "$pr_body" \
      2>&1 | tee -a "$LOG_DIR/pr_${ISSUE_KEY}_${TIMESTAMP}.log" \
      || log "${YELLOW}⚠ PR creation may have failed — check GitHub${RESET}"

    local pr_url
    pr_url=$(gh pr view --json url -q '.url' 2>/dev/null || echo "")
    if [[ -n "$pr_url" ]]; then
      save_state "pr_url" "$pr_url"
      log "${GREEN}✅ PR created: ${pr_url}${RESET}"
    fi
  else
    log "${YELLOW}⚠ GitHub CLI (gh) not found — push completed, create PR manually${RESET}"
  fi

  # Transition Jira to Code Review
  "${SCRIPT_DIR}/jira.sh" transition "$ISSUE_KEY" "code-review" || true
  "${SCRIPT_DIR}/jira.sh" comment "$ISSUE_KEY" "🔍 PR created, ready for code review. Branch: ${branch_name}" || true

  local pr_url_msg
  pr_url_msg=$(load_state "pr_url")
  telegram_send "🔍 *PR created* — \`${ISSUE_KEY}\`
Branch: \`${branch_name}\`
${pr_url_msg:+PR: ${pr_url_msg}}

Jira moved to *Code Review*."

  save_state "pr_done" "true"
}

# ═══════════════════════════════════════════════════════════════════
#  PHASE 9: After Merge → QA
# ═══════════════════════════════════════════════════════════════════
phase_qa() {
  banner "Phase 9: Post-Merge → QA" "$BLUE"

  if ! $AUTO_MODE; then
    confirm_step "PR Merged?" "Has the PR been merged? Press enter to transition to QA." || return 1
  fi

  # Transition Jira to QA
  "${SCRIPT_DIR}/jira.sh" transition "$ISSUE_KEY" "qa" || true
  "${SCRIPT_DIR}/jira.sh" comment "$ISSUE_KEY" "✅ PR merged, moved to QA." || true

  telegram_send "✅ *Moved to QA* — \`${ISSUE_KEY}\`

QA testing in progress. Once approved, the ticket will move to Ready to Deployment."

  # Clean up worktree (optional)
  local worktree_path
  worktree_path=$(load_state "worktree")
  if [[ -n "$worktree_path" ]] && [[ -d "$worktree_path" ]]; then
    if ! $AUTO_MODE; then
      if confirm_step "Cleanup" "Remove worktree at ${worktree_path}?"; then
        cd "$PROJECT_REPO"
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        log "${GREEN}✅ Worktree removed${RESET}"
      fi
    fi
  fi

  save_state "qa_done" "true"

  log ""
  log "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
  log "${GREEN}${BOLD}  ✅ Workflow complete for ${ISSUE_KEY}!${RESET}"
  log "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
  log ""
  log "To start the next issue: ${BOLD}./workflow.sh${RESET}"

  telegram_send "🎉 *Workflow complete* — \`${ISSUE_KEY}\`

Ready for the next task. Run \`./workflow.sh\` to pick a new issue."
}

# ═══════════════════════════════════════════════════════════════════
#  Main Execution
# ═══════════════════════════════════════════════════════════════════
banner "Workflow Orchestrator" "$CYAN"
log "${BOLD}CLI:${RESET}       ${EXEC_CLI}"
log "${BOLD}Feature:${RESET}   ${FEATURE_MODEL}"
log "${BOLD}Review:${RESET}    ${REVIEW_MODEL}"
log "${BOLD}Telegram:${RESET}  ${TELEGRAM_ENABLED}"
log "${BOLD}Auto:${RESET}      ${AUTO_MODE}"
log "${BOLD}Resume:${RESET}    ${RESUME}"
log "${BOLD}Plan only:${RESET} ${PLAN_ONLY}"
log "${BOLD}Implement:${RESET} ${IMPLEMENT_ONLY}"
if [[ -n "$ISSUE_KEY" ]]; then
  log "${BOLD}Issue:${RESET}     ${ISSUE_KEY}"
fi

# ─── --implement mode: skip to implementation using existing plan ──
if $IMPLEMENT_ONLY; then
  if [[ -z "$ISSUE_KEY" ]]; then
    log "${RED}--implement requires an issue key. Usage: ./workflow.sh <ISSUE_KEY> --implement${RESET}"
    exit 1
  fi

  if ! state_exists "worktree"; then
    log "${RED}❌ No worktree state found for ${ISSUE_KEY}. Run planning first or use --plan-only.${RESET}"
    exit 1
  fi

  ensure_worktree

  impl_issue_dir=$(resolve_issue_dir)
  log "${DIM}issue_dir: ${impl_issue_dir}${RESET}"

  # Validate --task file if provided
  if [[ -n "$IMPLEMENT_TASK" ]]; then
    task_file=""
    if [[ -f "$IMPLEMENT_TASK" ]]; then
      task_file="$IMPLEMENT_TASK"
    elif [[ -f "${impl_issue_dir}/${IMPLEMENT_TASK}" ]]; then
      task_file="${impl_issue_dir}/${IMPLEMENT_TASK}"
    fi

    if [[ -z "$task_file" || ! -f "$task_file" ]]; then
      log "${RED}❌ Task file not found: ${IMPLEMENT_TASK}${RESET}"
      log ""
      log "Available task files in ${impl_issue_dir}:"
      find "$impl_issue_dir" -name '*.md' \
        -not -name 'prd.md' -not -name 'techspec.md' \
        -not -name 'tasks.md' -not -name 'jira-description.md' \
        -not -name 'clarification-questions.md' | sort | while read -r f; do
        log "  - $(basename "$f")"
      done
      exit 1
    fi

    # Extract task_id and phase from filename (e.g. 2.1_task_review.md → task_id=2.1, phase=2)
    task_basename=$(basename "$task_file")
    task_id="${task_basename%%_*}"
    task_phase="${task_id%%.*}"

    extra_flags=""
    if $TELEGRAM_ENABLED; then extra_flags="--telegram"; fi

    log "Running single task: ${task_file} (phase=${task_phase}, task_id=${task_id})"
    FEATURE_DIR="${impl_issue_dir}" "${SCRIPT_DIR}/ralph-once.sh" "$task_phase" "$task_id" \
      --cli "$EXEC_CLI" --model "$FEATURE_MODEL" --review-model "$REVIEW_MODEL" \
      --auto \
      ${extra_flags:+$extra_flags} \
      || { log "${RED}❌ Task failed${RESET}"; exit 1; }

    log "${GREEN}✅ Task completed${RESET}"
    exit 0
  fi

  # --phase: run only the specified phase number
  if [[ -n "$IMPLEMENT_PHASE" ]]; then
    extra_flags=""
    if $TELEGRAM_ENABLED; then extra_flags="--telegram"; fi

    log "Running phase ${IMPLEMENT_PHASE}..."
    FEATURE_DIR="${impl_issue_dir}" "${SCRIPT_DIR}/run-phase.sh" "$IMPLEMENT_PHASE" 50 \
      --cli "$EXEC_CLI" --model "$FEATURE_MODEL" --review-model "$REVIEW_MODEL" \
      ${extra_flags:+$extra_flags} \
      || { log "${RED}❌ Phase ${IMPLEMENT_PHASE} failed${RESET}"; exit 1; }

    log "${GREEN}✅ Phase ${IMPLEMENT_PHASE} completed${RESET}"
    exit 0
  fi

  # Default: run full implementation
  phase_implement
  exit 0
fi

# ─── Standard workflow ────────────────────────────────────────────

# Phase 1: Pick
if should_run_phase "pick"; then
  phase_pick
fi

# All subsequent phases need an issue key
if [[ -z "$ISSUE_KEY" ]]; then
  log "${RED}No issue key set. Exiting.${RESET}"
  exit 1
fi

# Phase 2: Branch
if should_run_phase "branch"; then
  phase_branch
fi

# Phase 3: Clarify
if should_run_phase "clarify"; then
  phase_clarify
fi

# Phase 4: PRD
if should_run_phase "prd"; then
  phase_prd
fi

# Phase 5: Tech Spec
if should_run_phase "techspec"; then
  phase_techspec
fi

# Phase 6: Tasks
if should_run_phase "tasks"; then
  phase_tasks
fi

# Stop here if --plan-only
if $PLAN_ONLY; then
  log ""
  log "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
  log "${GREEN}${BOLD}  ✅ Planning complete for ${ISSUE_KEY}!${RESET}"
  log "${GREEN}${BOLD}═══════════════════════════════════════════════════${RESET}"
  log ""
  log "To implement: ${BOLD}./workflow.sh ${ISSUE_KEY} --implement${RESET}"
  telegram_send "✅ *Planning complete* — \`${ISSUE_KEY}\`

To implement:
\`./workflow.sh ${ISSUE_KEY} --implement\`"
  exit 0
fi

# Phase 7: Implement
if should_run_phase "implement"; then
  phase_implement
fi

# Phase 8: PR
if should_run_phase "pr"; then
  phase_pr
fi

# Phase 9: QA
if should_run_phase "qa"; then
  phase_qa
fi
