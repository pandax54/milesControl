# Scripts Usage Guide

Complete reference for all task automation scripts: single tasks, full phases, multi-phase pipelines, and Telegram remote control.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Supported CLIs](#supported-clis)
3. [ralph-once.sh — Single Task](#ralph-oncesh--single-task)
4. [run-phase.sh — Full Phase](#run-phasesh--full-phase)
5. [run-all-phases.sh — Multi-Phase Pipeline](#run-all-phasessh--multi-phase-pipeline)
6. [ralph-telegram-bot.sh — Remote Control](#ralph-telegram-botsh--remote-control)
7. [Telegram Setup](#telegram-setup)
8. [Workflow: Execute → Review → Fix → QA → Bugfix](#workflow)
9. [Graceful Stop](#graceful-stop)
10. [Logs & Debugging](#logs--debugging)
11. [Quick Reference](#quick-reference)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Execution Scripts                          │
│                                                              │
│  ralph-once.sh     Single task, human-in-the-loop            │
│  run-phase.sh      All tasks in a phase, fully automated     │
│  run-all-phases.sh Runs multiple phases sequentially         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    Remote Control                            │
│                                                              │
│  ralph-telegram-bot.sh   Long-poll Telegram listener         │
│    /run     → ralph-once.sh --auto --telegram                │
│    /phase   → run-phase.sh --telegram                        │
│    /stop    → touch .stop-phase-N                            │
│    /status  → check running PID                              │
│    /logs    → tail last 30 lines                             │
└──────────────────────────────────────────────────────────────┘
```

Each script supports **multi-CLI**: use Claude, Copilot, OpenCode, or Codex for execution and/or review.

---

## Supported CLIs

| CLI        | Flag             | Default Model       | Invocation Style                                       |
| ---------- | ---------------- | ------------------- | ------------------------------------------------------ |
| `claude`   | `--cli claude`   | `claude-sonnet-4-6` | `claude -p --dangerously-skip-permissions --model ...` |
| `copilot`  | `--cli copilot`  | `claude-sonnet-4`   | `copilot -p --allow-all-tools --model ...`             |
| `opencode` | `--cli opencode` | `claude-sonnet-4-6` | `opencode --model ...`                                 |
| `codex`    | `--cli codex`    | `o4-mini`           | `codex --model ... --full-auto`                        |

You can mix CLIs: use one for execution and a different one for review.

---

## ralph-once.sh — Single Task

Runs **one task** through the full pipeline: execute → review → fix → QA → bugfix.  
By default runs in **interactive mode** with human checkpoints between each step.

### Syntax

```bash
./ralph-once.sh <phase> <task_id> [options]
```

### Options

| Option                   | Description                                         | Default           |
| ------------------------ | --------------------------------------------------- | ----------------- |
| `--cli <tool>`           | CLI for task execution                              | `claude`          |
| `--model <model>`        | Model for execution                                 | varies by CLI     |
| `--review-cli <tool>`    | CLI for review step                                 | same as `--cli`   |
| `--review-model <model>` | Model for review                                    | same as `--model` |
| `--skip-to <step>`       | Skip to: `execute`, `review`, `fix`, `qa`, `bugfix` | —                 |
| `--auto`                 | Skip human confirmations (non-interactive)          | `false`           |
| `--telegram`             | Enable Telegram notifications                       | `false`           |
| `--max-fix-attempts <n>` | Max review+fix cycles                               | `3`               |

### Examples

#### Basic — interactive with Claude (default)

```bash
./ralph-once.sh 6 6.1
```

Each step will show a `HUMAN CHECKPOINT` prompt:

- `y` or `Enter` → continue
- `n` → skip this step
- `q` → quit

#### Non-interactive (auto mode)

```bash
./ralph-once.sh 6 6.1 --auto
```

#### Custom model

```bash
./ralph-once.sh 6 6.1 --model claude-opus-4-5
```

#### Different CLIs for execution vs review

```bash
# Codex executes, Claude reviews
./ralph-once.sh 6 6.1 --cli codex --model o4-mini --review-cli claude --review-model claude-sonnet-4-6

# Copilot for everything
./ralph-once.sh 6 6.1 --cli copilot

# OpenCode executes, Claude reviews with a cheap model
./ralph-once.sh 6 6.1 --cli opencode --review-cli claude --review-model claude-haiku-4-5
```

#### Resume from a specific step

```bash
# Skip execute, start from review
./ralph-once.sh 6 6.1 --skip-to review

# Skip to QA (already reviewed)
./ralph-once.sh 6 6.1 --skip-to qa
```

#### With Telegram notifications

```bash
./ralph-once.sh 6 6.1 --auto --telegram
```

#### All options combined

```bash
./ralph-once.sh 7 7.3 \
  --cli codex --model o4-mini \
  --review-cli claude --review-model claude-haiku-4-5 \
  --skip-to review \
  --auto \
  --telegram \
  --max-fix-attempts 5
```

---

## run-phase.sh — Full Phase

Runs **all incomplete tasks** in a phase sequentially. Fully automated (no human checkpoints). Each task goes through: execute → review → fix loop → QA → bugfix.

### Syntax

```bash
./run-phase.sh <phase_number> [max_tasks] [options]
```

### Options

| Option                   | Description                   | Default           |
| ------------------------ | ----------------------------- | ----------------- |
| `--cli <tool>`           | CLI for task execution        | `claude`          |
| `--model <model>`        | Model for execution           | varies by CLI     |
| `--review-cli <tool>`    | CLI for review step           | same as `--cli`   |
| `--review-model <model>` | Model for review              | same as `--model` |
| `--telegram`             | Enable Telegram notifications | `false`           |

### Examples

#### Basic — all tasks in phase 6 with Claude

```bash
./run-phase.sh 6
```

#### Limit to 20 tasks

```bash
./run-phase.sh 6 20
```

#### Custom model

```bash
./run-phase.sh 6 50 --model claude-opus-4-5
```

#### Cheaper reviews

```bash
./run-phase.sh 6 50 --model claude-sonnet-4-6 --review-model claude-haiku-4-5
```

#### Different CLIs for execution vs review

```bash
# Codex executes, Claude reviews
./run-phase.sh 6 50 --cli codex --model o4-mini --review-cli claude

# Copilot for everything
./run-phase.sh 6 --cli copilot
```

#### With Telegram notifications

```bash
./run-phase.sh 6 --telegram

./run-phase.sh 7 30 --cli claude --review-model claude-haiku-4-5 --telegram
```

#### Graceful stop

From another terminal (or via Telegram `/stop`):

```bash
touch .stop-phase-6
```

Or just press `Ctrl-C` — the SIGINT trap handles cleanup.

---

## run-all-phases.sh — Multi-Phase Pipeline

Runs `run-phase.sh` for multiple phases sequentially. Stops immediately if any phase fails.

### Syntax

```bash
./run-all-phases.sh [start_phase] [end_phase] [max_tasks_per_phase] [options]
```

### Options

All extra flags after the 3 positional args are forwarded to `run-phase.sh`.

| Positional Arg | Description     | Default |
| -------------- | --------------- | ------- |
| `start_phase`  | First phase     | `2`     |
| `end_phase`    | Last phase      | `7`     |
| `max_tasks`    | Tasks per phase | `50`    |

### Examples

#### Default — phases 2 through 7

```bash
./run-all-phases.sh
```

#### Specific range

```bash
# Phases 3 to 5
./run-all-phases.sh 3 5

# Only phase 4
./run-all-phases.sh 4 4
```

#### With max tasks and custom model

```bash
./run-all-phases.sh 4 7 20 --model claude-opus-4-5
```

#### Cheap reviews across all phases

```bash
./run-all-phases.sh 4 7 50 --model claude-sonnet-4-6 --review-model claude-haiku-4-5
```

#### With Telegram notifications

```bash
./run-all-phases.sh 2 7 50 --telegram

./run-all-phases.sh 5 7 30 --cli codex --model o4-mini --review-cli claude --telegram
```

#### Multi-CLI pipeline

```bash
./run-all-phases.sh 4 7 50 \
  --cli codex --model o4-mini \
  --review-cli claude --review-model claude-haiku-4-5 \
  --telegram
```

---

## ralph-telegram-bot.sh — Remote Control

Long-running Telegram bot that listens for commands and triggers scripts remotely. Only one task/phase can run at a time.

### Setup & Start

```bash
# 1. Set environment variables in .env
echo 'TELEGRAM_BOT_TOKEN=123456:ABC-DEF...' >> .env
echo 'TELEGRAM_CHAT_ID=987654321' >> .env

# 2. Start the bot
./ralph-telegram-bot.sh
```

See [Telegram Setup](#telegram-setup) for how to get the token and chat ID.

### Telegram Commands

#### `/run` — Single task

```
/run <phase> <task_id> [options]
```

Triggers `ralph-once.sh` in auto mode with Telegram notifications.

| Example                                  | What it does                       |
| ---------------------------------------- | ---------------------------------- |
| `/run 6 6.1`                             | Run task 6.1 with Claude (default) |
| `/run 6 6.2 --skip-to qa`                | Skip to QA step                    |
| `/run 7 7.1 --cli opencode`              | Use OpenCode CLI                   |
| `/run 6 6.3 --cli codex --model o4-mini` | Use Codex with o4-mini             |

#### `/phase` — Entire phase

```
/phase <phase_number> [max_tasks] [options]
```

Triggers `run-phase.sh` with Telegram notifications.

| Example                                                    | What it does                      |
| ---------------------------------------------------------- | --------------------------------- |
| `/phase 6`                                                 | Run all phase 6 tasks with Claude |
| `/phase 6 20`                                              | Limit to 20 tasks                 |
| `/phase 7 50 --cli codex --model o4-mini`                  | Use Codex for execution           |
| `/phase 7 50 --cli claude --review-model claude-haiku-4-5` | Cheap reviews                     |

#### `/stop` — Graceful stop

```
/stop <phase_number>
```

Creates the `.stop-phase-N` file. The running phase finishes its current task then exits cleanly.

| Example   | What it does            |
| --------- | ----------------------- |
| `/stop 6` | Stop phase 6 gracefully |

#### `/status` — Check what's running

```
/status
```

Returns type (task/phase), PID, and runtime — or "nothing running".

#### `/logs` — View latest output

```
/logs <task_id>          # Task logs
/logs phase-<number>     # Phase logs
```

Returns the last 30 lines of the most recent log file.

| Example         | What it does                 |
| --------------- | ---------------------------- |
| `/logs 6.1`     | Show latest log for task 6.1 |
| `/logs phase-7` | Show latest log for phase 7  |

#### `/help` — Show all commands

```
/help
```

---

## Telegram Setup

### 1. Create a Bot

1. Message **@BotFather** on Telegram
2. Send `/newbot`
3. Choose a name and username
4. Copy the token (e.g., `123456789:ABCdefGHI...`)

### 2. Get Your Chat ID

1. Message your new bot (send anything)
2. Open: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":XXXXXXX}` — that's your chat ID

### 3. Configure

```bash
# Add to .env in the project root
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
TELEGRAM_CHAT_ID=987654321
```

### 4. Test

```bash
# Start the bot
./ralph-telegram-bot.sh

# From Telegram, send:
/help
```

See [docs/telegram-setup-guide.md](telegram-setup-guide.md) for the full detailed setup guide.

---

## Workflow

Every task goes through this pipeline:

```
Execute → Review → Fix (if needed, up to 3x) → QA → Bugfix (if needed) → Re-QA
```

### Steps Detail

| Step        | What it does                                    | CLI used       |
| ----------- | ----------------------------------------------- | -------------- |
| **Execute** | Implements the task, runs verification, commits | `--cli`        |
| **Review**  | Reviews code quality, generates review artifact | `--review-cli` |
| **Fix**     | Applies review recommendations if not approved  | `--cli`        |
| **QA**      | Runs full QA pass, generates QA report          | `--review-cli` |
| **Bugfix**  | Fixes any open bugs found during QA             | `--cli`        |
| **Re-QA**   | Re-verifies after bugfixes                      | `--review-cli` |

### Verification Checklist (runs during Execute & Fix)

1. `npx tsc --noEmit` — type check
2. `pnpm test` — unit tests
3. `pnpm run test:coverage` — coverage thresholds
4. `pnpm build` — production build

### Progress Checks

After each step, automated checks verify:

- Git commit was made
- Expected files exist (review artifact, QA report)
- Review status (approved / not approved)
- Task marked complete in `tasks.md`
- Tests pass
- Type check passes
- No open bugs

Results are shown as a summary table and sent via Telegram (if enabled).

---

## Graceful Stop

### For `run-phase.sh`

```bash
# Option 1: touch a stop file
touch .stop-phase-6

# Option 2: Ctrl-C (SIGINT trap)

# Option 3: via Telegram
/stop 6
```

The phase finishes its current task then exits cleanly. The stop file is automatically cleaned up.

### For `ralph-once.sh`

Just press `Ctrl-C` or answer `q` at any human checkpoint.

### For `run-all-phases.sh`

Press `Ctrl-C` or create a stop file for the current phase. The pipeline stops after the current phase fails.

---

## Logs & Debugging

All logs are written to `logs/phase-<N>/`:

| File pattern                                | Content               |
| ------------------------------------------- | --------------------- |
| `run_<timestamp>.log`                       | Phase runner main log |
| `task_<N>_execute_<timestamp>.log`          | Task execution output |
| `task_<N>_review_<attempt>_<timestamp>.log` | Review output         |
| `task_<N>_fix_<attempt>_<timestamp>.log`    | Fix output            |
| `ralph_<task_id>_*.log`                     | ralph-once logs       |
| `qa_<timestamp>.log`                        | QA pass output        |
| `bugfix_<timestamp>.log`                    | Bugfix output         |
| `phase_<N>_tasks.txt`                       | Extracted phase tasks |
| `progress-archive-phase<N>.txt`             | Archived progress.txt |

Background outputs from Telegram bot go to `/tmp/`:

- `/tmp/ralph-once-<task_id>.out`
- `/tmp/ralph-phase-<phase>.out`

---

## Quick Reference

### Run one task interactively

```bash
./ralph-once.sh 6 6.1
```

### Run one task fully automated

```bash
./ralph-once.sh 6 6.1 --auto
```

### Run one task with Telegram notifications

```bash
./ralph-once.sh 6 6.1 --auto --telegram
```

### Run entire phase

```bash
./run-phase.sh 6
```

### Run entire phase with Telegram

```bash
./run-phase.sh 6 --telegram
```

### Run all remaining phases

```bash
./run-all-phases.sh
```

### Run everything with Telegram + cheap reviews

```bash
./run-all-phases.sh 4 7 50 --review-model claude-haiku-4-5 --telegram
```

### Remote control via Telegram

```bash
# Start bot (keep running in tmux/screen)
./ralph-telegram-bot.sh

# Then from Telegram:
/phase 6
/status
/logs phase-6
/stop 6
```

### Mix CLIs

```bash
# Codex fast-executes, Claude reviews
./run-phase.sh 7 50 --cli codex --model o4-mini --review-cli claude --review-model claude-sonnet-4-6 --telegram
```
