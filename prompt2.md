# workflow.sh — Bug Fixes & Feature Improvements

## Context

I have an end-to-end Jira → Branch → PRD → Code → PR pipeline in `workflow.sh`.
The planning phase (PRD, tech spec, tasks, individual task `.md` files) works well.
**The implementation never ran** — the script silently stayed on the wrong directory after creating the worktree.

Please read `#file:workflow.sh`, `#file:ralph-once.sh`, `#file:run-phase.sh`, `#file:run-all-phases.sh`, and `#file:ralph-telegram-bot.sh` before making any changes.

---

## Bug 1 — Worktree `cd` never takes effect

### What's broken

`phase_branch()` calls `git worktree add` and then `cd "$worktree_path"`, but every subsequent phase function re-runs `cd "$worktree_path"` from a `load_state` value. The root issue is that **`cd` inside a function does not persist to the parent shell** — so after `phase_branch` returns, the script is still in the original repo root. All files (PRD, tech spec, tasks) end up inside the main repo, and `run-phase.sh` executes against the wrong working directory.

### Required fix

- Do **not** rely on `cd` inside phase functions to set the working directory for subsequent phases.
- Instead, always `cd "$(load_state worktree)"` at the **top of every phase function** that needs the worktree, using an absolute path saved to state.
- Validate the worktree path exists and is a git repo before proceeding (`git -C "$worktree_path" status`). Fail fast with a clear error if not.
- In `phase_implement`, pass the worktree path explicitly to `run-phase.sh` (or set `PWD` via a subshell) so it never inherits the caller's directory.

### Verification

After the fix, each phase must print the resolved `pwd` so it's easy to confirm in logs.

---

## Bug 2 — PRD folder must be self-contained inside `tasks/`

### What's broken

Currently `issue_dir` is set to `tasks/prd-${ISSUE_KEY}` relative to wherever the script happens to be running — which is inconsistent.

### Required fix

- Resolve `issue_dir` as an **absolute path** anchored to the worktree:  
  `issue_dir="$(load_state worktree)/tasks/prd-${ISSUE_KEY}"`
- The folder name must use the **Jira project key prefix only** to stay human-readable:  
  `prd-LD-48` not `prd-LD-48-add-currency-conversion-display-to-transfer-page`
- `mkdir -p "$issue_dir"` must happen at the start of `phase_clarify` (the first phase that writes files), not spread across phases.
- All subsequent phases must derive `issue_dir` the same way (not recompute it differently).

---

## Fix 3 — Telegram messages: send content summaries, not file paths

### What's broken

Messages like the one below are useless on mobile:

```
Files:
- /Users/fernandapenna/.../techspec.md
- /Users/fernandapenna/.../tasks.md
```

### Required fix

Replace file-path lists in Telegram notifications with **inline content summaries**:

- For `techspec.md`: extract the first `##` section headings (the approach, stack decisions) — max 400 chars.
- For `tasks.md`: extract the task titles (lines starting with `- [ ]` or `### Task`) — max 400 chars.
- Helper function signature: `summarize_for_telegram <file> <max_chars>` — trims to last complete word within the limit and appends `…` if truncated.
- Total Telegram message must stay under 800 chars (Telegram renders poorly above ~1000).
- Still include `ISSUE_KEY` and the resume command, but drop absolute paths entirely.

---

## Feature 4 — Split planning and implementation into separate, independently runnable modes

### Goal

Give full control over when and what gets implemented. The current single linear flow is too rigid.

### Required changes

#### 4a. Add a `--plan-only` flag

When passed, the workflow runs phases 1–6 (pick → tasks) and then **stops**. No implementation, no PR. Useful for review-first workflows.

```bash
./workflow.sh LD-48 --plan-only
```

#### 4b. Add an `--implement` flag with optional task selector

When passed, skip straight to implementation. Reads the existing state (worktree, branch, issue_dir) so it can be run independently after `--plan-only`.

```bash
# Implement everything (all phases, all tasks)
./workflow.sh LD-48 --implement

# Implement only Phase 2
./workflow.sh LD-48 --implement --phase 2

# Implement only one specific task file
./workflow.sh LD-48 --implement --task tasks/prd-LD-48/02_implement-api-call.md
```

Internally, `--implement` must call the correct existing helper (`run-phase.sh` for a phase, `ralph-once.sh` for a single task) — do not rewrite their logic, just wire them up.

#### 4c. Separate model flags: `--feature-model` and `--review-model`

Replace the single `--model` flag with two distinct flags, matching how `ralph-once.sh` and `run-phase.sh` already separate feature vs. review models.

```bash
./workflow.sh LD-48 --implement \
  --cli claude \
  --feature-model claude-opus-4-6 \
  --review-model claude-sonnet-4-6
```

- Pass `--feature-model` and `--review-model` through to `run-phase.sh` / `ralph-once.sh`.
- Default `--feature-model` to `claude-opus-4-6`, default `--review-model` to `claude-sonnet-4-6`.
- Keep `--model` as a shorthand that sets both to the same value (backwards compat).

#### 4d. `--task` flag must validate the file exists

If the specified task file doesn't exist, print the available task files from `issue_dir` and exit 1.

---

## General requirements

- **Do not touch** `ralph-once.sh`, `run-phase.sh`, `run-all-phases.sh`, or `ralph-telegram-bot.sh` — only `workflow.sh`.
- Preserve all existing flags and behavior not mentioned above.
- Every phase must log its resolved `issue_dir` and `worktree_path` at the start.
- State files must use consistent keys — audit all `save_state`/`load_state` calls and fix any mismatches.
- After all changes, show a updated **Usage** comment block at the top of the file reflecting the new flags.
