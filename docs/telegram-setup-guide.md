# Telegram Bot Integration for ralph-once

Complete guide to setting up Telegram notifications, remote triggering, and opencode CLI integration for the `ralph-once.sh` task runner.

---

## Table of Contents

1. [Overview](#overview)
2. [What Changed in ralph-once.sh](#what-changed-in-ralph-oncesh)
3. [Telegram Bot Setup](#telegram-bot-setup)
4. [Environment Configuration](#environment-configuration)
5. [Progress Checks (New Feature)](#progress-checks-new-feature)
6. [Telegram Notifications (Passive)](#telegram-notifications-passive)
7. [Telegram Bot Trigger (Active)](#telegram-bot-trigger-active)
8. [telegramCoder — OpenCode via Telegram](#telegramcoder--opencode-via-telegram)
9. [OpenCode CLI Setup (standalone)](#opencode-cli-setup-standalone)
10. [Full Workflow Examples](#full-workflow-examples)
11. [Long-Running Bot — Memory & Stability](#long-running-bot--memory--stability)
12. [Reusing on Other Projects](#reusing-on-other-projects)
13. [Troubleshooting](#troubleshooting)
14. [Quick Start Checklist](#quick-start-checklist)

---

## Overview

Two new capabilities were added:

| Feature                  | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Progress Checks**      | Automated verification after each step (typecheck, tests, git commit, file existence, etc.) |
| **Telegram Integration** | Receive real-time notifications AND trigger tasks remotely via Telegram                     |

Architecture:

```
┌─────────────┐     /run 6 6.1      ┌─────────────────────┐
│  Telegram    │ ──────────────────► │ ralph-telegram-bot.sh│
│  (your phone)│ ◄────────────────── │  (long-poll listener)│
│              │   status updates    └──────────┬──────────┘
└─────────────┘                                 │
                                                ▼
                                    ┌─────────────────────┐
                                    │   ralph-once.sh      │
                                    │  --auto --telegram   │
                                    │                      │
                                    │  Execute ──► Check   │
                                    │  Review  ──► Check   │
                                    │  Fix     ──► Check   │
                                    │  QA      ──► Check   │
                                    │  Bugfix  ──► Check   │
                                    └─────────────────────┘
```

---

## What Changed in ralph-once.sh

### New flags

| Flag         | Description                                    |
| ------------ | ---------------------------------------------- |
| `--telegram` | Enable Telegram notifications during execution |

### Progress checks after every step

After each step (Execute, Review, Fix, QA, Bugfix), the script now runs automated verification:

| Check           | What it verifies                   |
| --------------- | ---------------------------------- |
| `task_marked`   | Task marked as `[x]` in tasks.md   |
| `git_commit`    | A git commit was made              |
| `typecheck`     | `npx tsc --noEmit` passes          |
| `tests`         | `pnpm test` passes                 |
| `file_exists`   | Expected output files were created |
| `review_status` | Review artifact shows APPROVED     |
| `bugs_open`     | Checks for open bugs in bugs.md    |
| `build`         | `pnpm build` succeeds              |

Each step runs relevant checks and produces a summary:

```
┌─── Progress Summary: execute ───
│  ✓ task_marked: pass
│  ✓ git_commit: pass: abc1234 feat(phase6): complete task 6.1
│  ✓ typecheck: pass
│  ✓ tests: pass
│  Result: 4 passed, 0 warnings, 0 failed → PASS
└───────────────────────────────────
```

### Final progress report

At the end of the run, a full report of all checks across all steps is displayed:

```
Final Progress Report:
  ✓ execute_git: pass: abc1234 feat(phase6): complete task 6.1
  ✓ execute_task_marked: pass
  ✓ execute_tests: pass
  ✓ execute_typecheck: pass
  ✓ review_1_file_exists: pass
  ✓ review_1_git: pass: def5678 review(phase6): review task 6.1
  ✓ review_1_review: pass: approved
Totals: 7 passed, 0 warnings, 0 failed
```

---

## Telegram Bot Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: e.g., `MilesControl Ralph Bot`
4. Choose a username: e.g., `milescontrol_ralph_bot`
5. **Save the bot token** — looks like: `7123456789:AAH1234abcd5678efgh9012ijkl3456mnop`

### Step 2: Get your Chat ID

**Option A — Personal chat:**

1. Search for **@userinfobot** on Telegram
2. Send `/start`
3. It replies with your chat ID (a number like `123456789`)

**Option B — Group chat:**

1. Add your bot to a group
2. Send any message in the group
3. Open: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"chat":{"id":-100XXXXXXXXXX}` — that's your group chat ID

### Step 3: Test the bot

```bash
# Replace with your values
TOKEN="7123456789:AAH1234abcd5678efgh9012ijkl3456mnop"
CHAT_ID="123456789"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="Hello from ralph!"
```

You should receive "Hello from ralph!" on Telegram.

---

## Environment Configuration

Add your tokens to `.env` in the project root:

```bash
# .env (add these lines)
TELEGRAM_BOT_TOKEN=7123456789:AAH1234abcd5678efgh9012ijkl3456mnop
TELEGRAM_CHAT_ID=123456789
```

> **Security:** Make sure `.env` is in your `.gitignore` (it should be already). Never commit tokens.

Verify `.gitignore`:

```bash
grep '.env' .gitignore
# Should show: .env or .env*
```

If not present:

```bash
echo '.env' >> .gitignore
```

---

## Progress Checks (New Feature)

### Usage

Progress checks run automatically. No extra flags needed:

```bash
# Progress checks are always enabled
./ralph-once.sh 6 6.1
./ralph-once.sh 6 6.1 --auto
```

### Checks per step

| Step        | Checks Run                                                 |
| ----------- | ---------------------------------------------------------- |
| **Execute** | `task_marked`, `git_commit`, `typecheck`, `tests`          |
| **Review**  | `file_exists` (review file), `review_status`, `git_commit` |
| **Fix**     | `git_commit`, `typecheck`, `tests`                         |
| **QA**      | `file_exists` (QA report), `git_commit`, `bugs_open`       |
| **Bugfix**  | `git_commit`, `tests`, `bugs_open`                         |
| **Re-QA**   | `bugs_open`, `tests`                                       |

### Adding custom checks

The `progress_check` function supports these check types:

```bash
progress_check "step_name" "check_type" [args...]

# Available check types:
progress_check "mystep" "git_commit"
progress_check "mystep" "file_exists" "path/to/file.md" "path/to/other.md"
progress_check "mystep" "review_status"
progress_check "mystep" "task_marked"
progress_check "mystep" "tests"
progress_check "mystep" "typecheck"
progress_check "mystep" "build"
progress_check "mystep" "bugs_open"
```

---

## Telegram Notifications (Passive)

Receive updates on your phone as each step progresses.

### Enable notifications

```bash
# Add --telegram to any ralph-once command
./ralph-once.sh 6 6.1 --auto --telegram
```

### What you receive

| Event          | Message example                                                                               |
| -------------- | --------------------------------------------------------------------------------------------- |
| Step started   | 🔄 **ralph-once** — Task `6.1` / Step: Execute / Status: started                              |
| Step completed | ✅ **ralph-once** — Task `6.1` / Step: Execute / Status: completed / Details: 4✓ 0⚠ 0✗ → PASS |
| Step failed    | ❌ **ralph-once** — Task `6.1` / Step: Execute / Status: failed                               |
| Step skipped   | ⏭ **ralph-once** — Task `6.1` / Step: Review / Status: skipped                               |
| Run finished   | 🏁 **ralph-once complete!** Task: `6.1` — implement user auth...                              |

---

## Telegram Bot Trigger (Active)

Run tasks and check status directly from Telegram.

### Start the listener

```bash
# Start the bot listener (runs in foreground)
./ralph-telegram-bot.sh

# Or run in background
nohup ./ralph-telegram-bot.sh > /tmp/ralph-bot.log 2>&1 &
```

### Available commands

Send these to your bot on Telegram:

| Command                     | Description                          |
| --------------------------- | ------------------------------------ |
| `/run 6 6.1`                | Run ralph-once for phase 6, task 6.1 |
| `/run 6 6.1 --skip-to qa`   | Start from QA step                   |
| `/run 6 6.1 --cli opencode` | Use opencode CLI                     |
| `/status`                   | Check if a task is running           |
| `/logs 6.1`                 | Get last 30 lines of output          |
| `/help`                     | Show command list                    |

### Example conversation

```
You:  /run 6 6.1
Bot:  🚀 Starting ralph-once: phase 6, task 6.1
      Options: --auto --telegram
Bot:  ✅ Started! PID: 12345
      You'll receive progress updates here.

Bot:  🔄 ralph-once — Task 6.1 / Step: Execute / Status: started
Bot:  ✅ ralph-once — Task 6.1 / Step: Execute / Status: completed
      Details: 4✓ 0⚠ 0✗ → PASS

Bot:  🔄 ralph-once — Task 6.1 / Step: Review / Status: started
Bot:  ✅ ralph-once — Task 6.1 / Step: Review / Status: completed
      Details: 3✓ 0⚠ 0✗ → PASS

Bot:  🔄 ralph-once — Task 6.1 / Step: QA / Status: started
Bot:  ✅ ralph-once — Task 6.1 / Step: QA / Status: completed

Bot:  🏁 ralph-once complete!
      Task: 6.1 — implement user authentication
      Exec: claude (claude-sonnet-4-6)

You:  /logs 6.1
Bot:  [last 30 lines of log output]
```

### Keep the bot running persistently

**Option A — tmux / screen:**

```bash
# tmux
tmux new-session -d -s ralph-bot './ralph-telegram-bot.sh'

# screen
screen -dmS ralph-bot ./ralph-telegram-bot.sh
```

**Option B — systemd service (Linux):**

```ini
# /etc/systemd/system/ralph-bot.service
[Unit]
Description=Ralph Telegram Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/milescontrol
ExecStart=/path/to/milescontrol/ralph-telegram-bot.sh
Restart=always
RestartSec=5
EnvironmentFile=/path/to/milescontrol/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ralph-bot
sudo systemctl start ralph-bot
```

**Option C — launchd (macOS):**

```xml
<!-- ~/Library/LaunchAgents/com.milescontrol.ralph-bot.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.milescontrol.ralph-bot</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/path/to/milescontrol/ralph-telegram-bot.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/milescontrol</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/ralph-bot.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/ralph-bot-err.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.milescontrol.ralph-bot.plist
```

---

## telegramCoder — OpenCode via Telegram

[telegramCoder](https://github.com/Tommertom/opencode-telegram) is an AI-powered Telegram bot that gives you **full terminal sessions + OpenCode AI directly from Telegram**. It's a more feature-rich alternative to our custom `ralph-telegram-bot.sh` — especially if you want interactive coding sessions, file uploads, and multi-agent support.

### Why telegramCoder?

| Feature                    | `ralph-telegram-bot.sh` | telegramCoder        |
| -------------------------- | ----------------------- | -------------------- |
| Trigger ralph-once         | ✅                      | ✅ (via terminal)    |
| Progress notifications     | ✅                      | ✅ (terminal output) |
| Interactive terminal       | ❌                      | ✅ full PTY          |
| OpenCode AI sessions       | ❌                      | ✅ built-in          |
| File upload/download       | ❌                      | ✅                   |
| Multi-user support         | ❌                      | ✅                   |
| Agent cycling (plan/build) | ❌                      | ✅ TAB to switch     |
| Docker support             | ❌                      | ✅                   |

### Install telegramCoder

**Method 1 — npx (quickest, no install):**

```bash
npx @tommertom/telegramcoder@latest
```

On first run it creates a `.env` template and exits. Edit it, then run again.

**Method 2 — Global install:**

```bash
npm install -g @tommertom/telegramcoder
telegramcoder
```

**Method 3 — Docker:**

```bash
# Generate Dockerfile + docker-compose.yml
npx @tommertom/telegramcoder@latest --docker

# Configure
cat > .env << 'EOF'
TELEGRAM_BOT_TOKENS=your_bot_token_here
ALLOWED_USER_IDS=your_telegram_user_id
ADMIN_USER_ID=your_telegram_user_id
MESSAGE_DELETE_TIMEOUT=10000
EOF

# Start
docker-compose up -d
docker-compose logs -f
```

### Configure telegramCoder

Edit the `.env` file created on first run:

```bash
# Required: your bot token from @BotFather
TELEGRAM_BOT_TOKENS=7123456789:AAH1234abcd5678efgh9012ijkl3456mnop

# Required: your Telegram user ID
ALLOWED_USER_IDS=123456789

# Admin: receives alerts if unauthorized users try to access
ADMIN_USER_ID=123456789

# How long confirmation messages stay visible (ms)
MESSAGE_DELETE_TIMEOUT=10000
```

> **Finding your User ID:** Start the bot and send any message — it replies with your user ID.

### Using telegramCoder with ralph-once

Once telegramCoder is running, you get a full terminal on Telegram. Use it to run ralph-once directly:

```
You:  ./ralph-once.sh 6 6.1 --auto --telegram
Bot:  [full terminal output streams in real-time]
```

### OpenCode AI sessions (built-in)

telegramCoder has native OpenCode integration — no separate install needed:

```
You:  /opencode
Bot:  🔄 OpenCode server not running. Starting server...
      ✅ OpenCode server started!
      ✅ OpenCode session started!

You:  /prompt Review the implementation of task 6.1 in this project
Bot:  📝 OpenCode Response:
      [AI reviews your code and responds]
```

**Available commands:**

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `/opencode [title]` | Start a new OpenCode AI session |
| `/prompt <message>` | Send a prompt to the AI         |
| `/esc`              | Abort current AI operation      |
| `/undo` / `/redo`   | Revert or restore changes       |
| `/rename <title>`   | Rename current session          |
| `/endsession`       | End current session             |
| `/sessions`         | List recent sessions            |
| `/projects`         | List available projects         |

**Control keyboard:** When in an OpenCode session, quick-access buttons appear:

- **⏹️ ESC** — Abort current operation
- **⇥ TAB** — Cycle between agents (build ↔ plan)

### File uploads

Send any file to the bot and it will:

1. Save to `/tmp/telegramCoder/` automatically
2. Reply with the full path in tappable format
3. Support all file types (docs, photos, videos, audio)

### telegramCoder vs ralph-telegram-bot.sh — When to use which

| Scenario                                            | Use                     |
| --------------------------------------------------- | ----------------------- |
| Only need to trigger ralph-once + get notifications | `ralph-telegram-bot.sh` |
| Want interactive terminal + AI sessions + file ops  | telegramCoder           |
| Need Docker isolation                               | telegramCoder           |
| Multiple users need access                          | telegramCoder           |
| Minimal dependencies, just bash + curl              | `ralph-telegram-bot.sh` |

---

## OpenCode CLI Setup (standalone)

[opencode](https://github.com/opencode-ai/opencode) is an open-source terminal AI coding assistant that works as a drop-in alternative for the `--cli` option.

### Install opencode

```bash
# macOS (Homebrew)
brew install opencode-ai/tap/opencode

# Or via npm
npm install -g @opencode/cli

# Or via go
go install github.com/opencode-ai/opencode@latest

# Verify installation
opencode --version
```

### Configure opencode

Create `~/.opencode/config.json` (or it auto-configures on first run):

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6"
}
```

Set your API key:

```bash
# Anthropic (for Claude models)
export ANTHROPIC_API_KEY="sk-ant-..."

# Or add to your shell profile
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
```

### Use opencode with ralph-once

```bash
# Use opencode for all steps
./ralph-once.sh 6 6.1 --cli opencode

# Use opencode for execution, Claude for review
./ralph-once.sh 6 6.1 --cli opencode --review-cli claude

# With specific model
./ralph-once.sh 6 6.1 --cli opencode --model claude-sonnet-4-6

# Fully automated with Telegram notifications
./ralph-once.sh 6 6.1 --cli opencode --auto --telegram

# All options combined
./ralph-once.sh 6 6.1 \
  --cli opencode --model claude-sonnet-4-6 \
  --review-cli claude --review-model claude-sonnet-4-6 \
  --auto --telegram
```

### Trigger via Telegram with opencode

```
/run 6 6.1 --cli opencode --model claude-sonnet-4-6
```

---

## Full Workflow Examples

### Example 1: Manual run with Telegram updates

```bash
# Terminal
./ralph-once.sh 6 6.1 --telegram

# You'll get Telegram notifications at each step while
# manually confirming each checkpoint in the terminal
```

### Example 2: Fully automated with remote monitoring

```bash
# Start the bot (one time, keep running)
tmux new-session -d -s ralph-bot './ralph-telegram-bot.sh'

# Then from Telegram:
# /run 6 6.1
# /run 6 6.2
# /run 6 6.3
```

### Example 3: Mixed CLI with opencode

```bash
# opencode executes, claude reviews, all automated, telegram on
./ralph-once.sh 7 7.1 \
  --cli opencode --model claude-sonnet-4-6 \
  --review-cli claude --review-model claude-sonnet-4-6 \
  --auto --telegram
```

### Example 4: Resume from a failed QA step via Telegram

```
You:  /run 6 6.1 --skip-to qa --cli opencode
Bot:  🚀 Starting ralph-once: phase 6, task 6.1 ...
```

---

## Long-Running Bot — Memory & Stability

Running `ralph-telegram-bot.sh` (or telegramCoder) for extended periods is safe but requires awareness of a few things:

### Memory profile of ralph-telegram-bot.sh

`ralph-telegram-bot.sh` is a **bash script with a polling loop** — it uses minimal memory (~5-10 MB) because:

- Each `curl` call is a subprocess that starts and exits
- The Python JSON parser is spawned per-update and exits immediately
- Bash variables are simple strings, no accumulating data structures
- No in-memory state grows over time (the `OFFSET` counter is a single integer)

**Verdict:** No memory leak risk. Safe to run for weeks.

### Potential issues over long runtime

| Issue                   | Cause                                    | Mitigation                                            |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------- |
| **Stale PID file**      | ralph-once finished but PID file remains | Bot auto-cleans on `/status` check                    |
| **Network hiccups**     | Telegram API temporarily unreachable     | Script has `\|\| true` guards and continues polling   |
| **Disk space (logs)**   | Log files accumulate over many runs      | Periodically clean `logs/` or add log rotation        |
| **curl process zombie** | Networking edge case                     | The `> /dev/null 2>&1` pattern prevents hanging pipes |

### Best practices for long-running bots

```bash
# 1. Use a process supervisor (recommended)
# macOS:
launchctl load ~/Library/LaunchAgents/com.milescontrol.ralph-bot.plist

# Linux:
sudo systemctl enable ralph-bot && sudo systemctl start ralph-bot

# 2. Add log rotation (append to ralph-telegram-bot.sh or cron)
# Clean logs older than 7 days
find logs/ -name "ralph_*" -mtime +7 -delete

# 3. Monitor health from Telegram
# Just send /status periodically
```

### telegramCoder memory profile

telegramCoder is a **Node.js application** and uses more memory (~50-100 MB base, grows per terminal session):

- Each PTY session consumes ~10-20 MB
- OpenCode server adds ~100-200 MB when running
- Sessions are user-specific and persist until ended or rebooted

**Mitigations:**

- Use `/endsession` to free sessions you're not using
- Docker's `--memory` flag can cap usage: `docker run --memory=512m ...`
- pm2 can auto-restart on threshold: `pm2 start telegramcoder --max-memory-restart 300M`

---

## Reusing on Other Projects

Both scripts are designed to be project-agnostic with minimal changes.

### Option 1: Copy the scripts (simplest)

```bash
# From your other project root
curl -sO https://raw.githubusercontent.com/YOUR_USER/milescontrol/main/ralph-once.sh
curl -sO https://raw.githubusercontent.com/YOUR_USER/milescontrol/main/ralph-telegram-bot.sh
chmod +x ralph-once.sh ralph-telegram-bot.sh
```

Then customize the variables at the top of `ralph-once.sh`:

```bash
# ralph-once.sh — change these per project
FEATURE_DIR="tasks/prd-milescontrol"  # → tasks/prd-yourproject
LOG_DIR="logs/phase-${PHASE}"          # keep or change
CTX_EXECUTE="@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md"  # your docs
CTX_REVIEW="@${FEATURE_DIR}/tasks.md"
CTX_FIX="@${FEATURE_DIR}/tasks.md"
```

### Option 2: Symlink from a shared location

```bash
# Keep scripts in one place
mkdir -p ~/tools/ralph
cp ralph-once.sh ralph-telegram-bot.sh ~/tools/ralph/

# Symlink into any project
cd /path/to/other-project
ln -s ~/tools/ralph/ralph-once.sh .
ln -s ~/tools/ralph/ralph-telegram-bot.sh .
```

Override config per project via environment variables or a `ralph.config.sh`:

```bash
# ralph.config.sh (in each project root)
export FEATURE_DIR="docs/tasks"
export CTX_EXECUTE="@docs/prd.md @docs/techspec.md"
export CTX_REVIEW="@docs/tasks.md"
export CTX_FIX="@docs/tasks.md"
```

Then source it before running:

```bash
source ralph.config.sh && ./ralph-once.sh 1 1.1 --auto --telegram
```

### Option 3: Publish as a package / template

Create a reusable template repo:

```
ralph-task-runner/
├── ralph-once.sh
├── ralph-telegram-bot.sh
├── ralph.config.sh.template    # project-specific overrides
├── .env.template               # Telegram tokens
├── docs/
│   └── telegram-setup-guide.md
└── README.md
```

New project setup:

```bash
git clone https://github.com/you/ralph-task-runner.git .ralph
cp .ralph/ralph.config.sh.template ralph.config.sh
# Edit ralph.config.sh with your project paths
cp .ralph/.env.template .env
# Edit .env with your Telegram tokens

# Run
source ralph.config.sh && .ralph/ralph-once.sh 1 1.1 --auto --telegram
```

### What to customize per project

| Variable      | Purpose                                  | Default                                              |
| ------------- | ---------------------------------------- | ---------------------------------------------------- |
| `FEATURE_DIR` | Where tasks.md, prd.md, techspec.md live | `tasks/prd-milescontrol`                             |
| `LOG_DIR`     | Where execution logs go                  | `logs/phase-${PHASE}`                                |
| `CTX_EXECUTE` | Context files for the execute step       | `@${FEATURE_DIR}/prd.md @${FEATURE_DIR}/techspec.md` |
| `CTX_REVIEW`  | Context files for the review step        | `@${FEATURE_DIR}/tasks.md`                           |
| `CTX_FIX`     | Context files for the fix step           | `@${FEATURE_DIR}/tasks.md`                           |
| `EXEC_CLI`    | Default CLI tool                         | `claude`                                             |
| `REVIEW_CLI`  | Default review CLI                       | same as `EXEC_CLI`                                   |

### telegramCoder for other projects

telegramCoder is already project-agnostic — it's a terminal over Telegram. Just `cd` to any project folder in the terminal session:

```
You:  cd /path/to/other-project && ./ralph-once.sh 1 1.1 --auto --telegram
```

Or set up multiple bots for different projects using multiple tokens:

```bash
# In telegramCoder .env
TELEGRAM_BOT_TOKENS=token_project_a,token_project_b
```

---

## Troubleshooting

### Bot not responding

```bash
# Test API connectivity
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Should return {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### Not receiving notifications

1. Check `.env` has both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
2. Verify you used `--telegram` flag
3. Check the bot hasn't been blocked — send it a message on Telegram first
4. For groups: make sure the bot is a member and has message permissions

### Chat ID wrong

```bash
# Find your real chat ID by sending a message to the bot then:
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" | python3 -m json.tool
# Look for "chat": {"id": YOUR_CHAT_ID}
```

### opencode not found

```bash
# Check if installed
which opencode

# If installed via go, ensure GOPATH/bin is in PATH
export PATH="$PATH:$(go env GOPATH)/bin"

# Reinstall
brew reinstall opencode-ai/tap/opencode
```

### Progress checks failing but task succeeded

Progress checks are informational — they help catch issues early but don't block execution. A "warning" status means the check couldn't confirm success, not necessarily failure. Common causes:

- **task_marked warning**: The AI didn't update tasks.md checkbox
- **git_commit warning**: The AI committed with a different message format
- **typecheck/tests failing**: Legitimate issues the AI missed

### Telegram messages truncated

Telegram has a 4096-character limit per message. Long log outputs via `/logs` are already trimmed to the last 30 lines, and ANSI color codes are stripped.

---

## Quick Start Checklist

### Path A: Custom bot (`ralph-telegram-bot.sh`)

```
□  Create Telegram bot via @BotFather
□  Get your chat ID via @userinfobot
□  Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env
□  Test: curl the sendMessage API
□  Run: ./ralph-once.sh 6 6.1 --auto --telegram
□  (Optional) Start bot listener: ./ralph-telegram-bot.sh
□  (Optional) Persist with tmux/launchd/systemd
```

### Path B: telegramCoder (full terminal + OpenCode)

```
□  Create Telegram bot via @BotFather
□  npx @tommertom/telegramcoder@latest (creates .env)
□  Edit .env: TELEGRAM_BOT_TOKENS, ALLOWED_USER_IDS, ADMIN_USER_ID
□  Run: npx @tommertom/telegramcoder@latest
□  In Telegram: cd to project, run ralph-once.sh
□  (Optional) /opencode for AI sessions
□  (Optional) Docker: npx @tommertom/telegramcoder@latest --docker
```
