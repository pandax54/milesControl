# Workflow Automation Guide

End-to-end pipeline: **Jira → Branch → PRD → Tech Spec → Tasks → Implementation → PR → QA**

---

## Architecture

```
┌──────────────┐     /next, /workflow LD-14    ┌──────────────────────────┐
│  Telegram     │ ─────────────────────────────►│  ralph-telegram-bot.sh   │
│  (your phone) │ ◄─────────────────────────────│  + Jira/workflow commands │
└──────────────┘   status / questions / links   └────────────┬─────────────┘
                                                              │
                            ┌─────────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│  workflow.sh — Orchestrator                                            │
│                                                                        │
│  1. jira.sh my-issues            → Pick issue                         │
│  2. jira.sh transition → in-progress + git worktree add               │
│  3. AI clarify                    → Questions (Telegram notify)        │
│  4. AI create-prd                 → PRD (Telegram notify for review)   │
│  5. AI create-techspec            → Tech Spec                         │
│  6. AI create-tasks               → Tasks (Telegram notify for review) │
│  7. run-phase.sh / ralph-once.sh  → Implementation                    │
│  8. git push + gh pr create       → PR + Jira → Code Review          │
│  9. After merge                   → Jira → QA                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# Fill in: JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT
# Fill in: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (if using Telegram)
```

### 2. Get a Jira API token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy the token into `.env` as `JIRA_API_TOKEN`

### 3. Make scripts executable

```bash
chmod +x jira.sh workflow.sh ralph-once.sh ralph-telegram-bot.sh run-phase.sh
```

### 4. Prerequisites

- **GitHub CLI** (`gh`): `brew install gh && gh auth login`
- **Python 3**: required for Jira API JSON parsing
- **curl**: ships with macOS

---

## Usage

### Full workflow (interactive)

```bash
# Pick from your assigned issues interactively
./workflow.sh

# Start with a specific issue
./workflow.sh LD-14

# Resume from where you left off (e.g., after answering clarification questions)
./workflow.sh LD-14 --resume

# Skip to a specific phase
./workflow.sh LD-14 --skip-to implement

# Use a different AI CLI
./workflow.sh LD-14 --cli copilot

# Full auto (no human confirmations)
./workflow.sh LD-14 --auto --telegram
```

### Telegram commands

Start the bot, then use these commands from your phone:

```bash
./ralph-telegram-bot.sh
```

| Command                               | Description                          |
| ------------------------------------- | ------------------------------------ |
| `/next`                               | List assigned Jira issues, pick next |
| `/workflow LD-14`                     | Run the full pipeline for an issue   |
| `/workflow LD-14 --resume`            | Resume from checkpoint               |
| `/workflow LD-14 --skip-to implement` | Skip to a phase                      |
| `/jira my`                            | List my assigned issues              |
| `/jira show LD-14`                    | Show issue details + description     |
| `/jira move LD-14 code-review`        | Transition issue status              |
| `/run 6 6.1`                          | Run a single task                    |
| `/phase 6`                            | Run all tasks in a phase             |
| `/status`                             | Check running work                   |
| `/logs LD-14`                         | Get latest log output                |
| `/stop 6`                             | Gracefully stop a phase              |

### Jira CLI standalone

```bash
# List your assigned issues
./jira.sh my-issues

# Show full issue details
./jira.sh issue LD-14

# Get plain-text description (good for piping)
./jira.sh description LD-14

# Move issue to In Progress
./jira.sh transition LD-14 in-progress

# Move to Code Review
./jira.sh transition LD-14 code-review

# Move to QA
./jira.sh transition LD-14 qa

# Add a comment
./jira.sh comment LD-14 "Started working on this"

# Run a JQL search
./jira.sh search "project = LD AND status = 'In Progress'"

# See available transitions for an issue
./jira.sh transitions LD-14
```

---

## Workflow Phases

| #   | Phase         | What happens                                                             | Human action needed                              |
| --- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | **pick**      | List assigned issues, select one                                         | Choose issue interactively (or pass as argument) |
| 2   | **branch**    | Create git worktree + branch, transition Jira to In Progress             | None                                             |
| 3   | **clarify**   | AI reads Jira description, generates questions if unclear                | Answer questions (Telegram notification sent)    |
| 4   | **prd**       | AI creates PRD from description + answers                                | Review PRD (Telegram notification sent)          |
| 5   | **techspec**  | AI creates Tech Spec from PRD                                            | Review with tasks                                |
| 6   | **tasks**     | AI breaks down into implementation tasks                                 | Review tasks (Telegram notification sent)        |
| 7   | **implement** | `run-phase.sh` executes all tasks (execute → review → fix → QA → bugfix) | Monitor progress                                 |
| 8   | **pr**        | Push branch, create GitHub PR, transition Jira to Code Review            | Approve/merge PR                                 |
| 9   | **qa**        | Transition Jira to QA, optional worktree cleanup                         | QA testing (human)                               |

### Resuming

The workflow saves state to `.workflow-state/`. Use `--resume` to skip completed phases:

```bash
# Answer clarification questions, then resume
./workflow.sh LD-14 --resume

# PRD was reviewed and approved, continue
./workflow.sh LD-14 --resume
```

### Skipping phases

```bash
# Skip directly to implementation (assumes PRD/techspec/tasks already exist)
./workflow.sh LD-14 --skip-to implement

# Skip to PR creation
./workflow.sh LD-14 --skip-to pr
```

---

## Typical Day Workflow

1. **Morning**: `/next` on Telegram → see assigned issues → `/workflow LD-14`
2. **Get notification**: clarification questions ready → answer them → `/workflow LD-14 --resume`
3. **Get notification**: PRD ready → review in IDE → `/workflow LD-14 --resume`
4. **Get notification**: Tech Spec + Tasks ready → review → `/workflow LD-14 --resume`
5. **Implementation runs**: watch progress on Telegram → fix any failures
6. **Get notification**: implementation done → review reports → `/workflow LD-14 --resume`
7. **PR created**: review on GitHub → merge
8. **Post-merge**: `/jira move LD-14 qa` → QA tests → `/next` for the next task

---

## File Structure

```
.
├── .env.example          # Environment template
├── .env                  # Your configuration (git-ignored)
├── .workflow-state/      # Progress tracking per issue
├── jira.sh               # Jira REST API helper
├── workflow.sh           # Main orchestrator
├── ralph-once.sh         # Single task runner
├── ralph-telegram-bot.sh # Telegram bot (with Jira + workflow commands)
├── run-phase.sh          # Phase runner
├── run-all-phases.sh     # Multi-phase runner
├── logs/workflow/        # Workflow logs
└── tasks/prd-LD-14/      # Generated artifacts per issue
    ├── jira-description.md
    ├── clarification-questions.md
    ├── prd.md
    ├── techspec.md
    ├── tasks.md
    └── *_task.md
```

---

## Troubleshooting

| Problem                  | Solution                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `JIRA_API_TOKEN not set` | Fill in `.env` — see Quick Start above                                                  |
| `No matching transition` | Run `./jira.sh transitions LD-14` to see available transitions — names vary per project |
| `gh: command not found`  | Install GitHub CLI: `brew install gh && gh auth login`                                  |
| Workflow stuck           | `./workflow.sh LD-14 --resume --skip-to <phase>` to jump ahead                          |
| Worktree conflicts       | `git worktree list` to see all worktrees, `git worktree remove <path>` to clean up      |
