# Quick Setup Guide

## Installation

Copy the commands, skills, and templates from this folder into your project's `.claude/` directory:

```bash
# From the repo root
cp -r fernanda-ribeiro/commands/ /path/to/your/project/.claude/commands/
cp -r fernanda-ribeiro/skills/ /path/to/your/project/.claude/skills/
cp -r fernanda-ribeiro/templates/ /path/to/your/project/.claude/templates/
```

## Example: Adding Skills

```
npx skills add https://github.com/firebase/agent-skills --skill firebase-auth-basics
npx skills add https://github.com/onmax/nuxt-skills --skill vitest

// https://www.aihero.dev/this-hook-stops-claude-code-running-dangerous-git-commands
npx skills add mattpocock/skills/git-guardrails-claude-code
// The -a claude-code flag tells the CLI to wire the skill into .claude/skills/ directly.
npx skills add mattpocock/skills/git-guardrails-claude-code -a claude-code
// ln -s ../../../.agents/skills/git-guardrails-claude-code .claude/skills/git-guardrails-claude-code
// ln -s ~/Documents/repo/own-studies/ai-workflows/basic-setup-test/.agents/skills/git-guardrails-claude-code .claude/skills/git-guardrails-claude-code

//????
npx skills add https://github.com/mindrally/skills --skill koa-typescript
npx skills add https://github.com/mattpocock/skills --skill tdd
npx skills add https://github.com/coderabbitai/skills --skill code-review

npx claude-code-templates@latest --skill development/code-reviewer
npx claude-code-templates@latest --skill development/senior-backend
```

## Process Cleanup Hooks (Claude)

This template includes local hooks to avoid leaving background servers running:

- `PostToolUse(Bash)` tracks ports used in the current Claude session
- `Stop` uses a prompt gate that requires cleanup confirmation before Claude can stop
- `SessionEnd` terminates remaining listeners on tracked ports

Hook scripts:

- `.claude/hooks/track-session-ports.sh`
- `.claude/hooks/cleanup-session-ports.sh`

Configuration location:

- `.claude/settings.local.json`

Verify quickly:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If configured correctly and the session has ended, this command should return no listeners for ports started during that session.

## Workflow

### 1. Create PRD

```
/commands/create-prd.md
Create a PRD for: [your feature]
```

Asks clarifying questions, then generates a PRD at `.claude/tasks/[feature-name]/prd.md`.

### 2. Generate Tech Spec

```
/commands/create-techspec.md
Generate a tech spec for: [feature-name]
```

Reads the PRD, analyzes your project, and produces `.claude/tasks/[feature-name]/techspec.md`.

### 3. Break Down Tasks

```
/commands/create-tasks.md
Break down tasks for: [feature-name]
```

Creates individual task files at `.claude/tasks/[feature-name]/[num]_task.md`. Shows the task list for approval before creating files.

### 4. Implement & Review

```
/commands/execute-task.md
Implement task: [feature-name]/[num]_task.md
```

Reads the task definition, applies relevant skills (TypeScript, architecture, framework-specific), and implements.

For bugfixes, QA, and review, use:

```
/commands/execute-bugfix.md
/commands/execute-qa.md
/commands/execute-review.md
```

## Skills

Framework and language skills are applied automatically during implementation:

- **typescript.md** — TypeScript patterns and best practices
- **architecture.md** — Project structure and design patterns
- **node.md** — Node.js backend patterns
- **logging.md** — Logging best practices
- **tests.md** — Testing best practices
- **firebase-auth-basics/** — Authentication patterns with Firebase

## Templates

Used by commands to generate structured documents:

- **prd.md** — Product Requirements Document template
- **techspec.md** — Technical Specification template
- **tasks.md** — Task breakdown summary template
- **task.md** — Individual task template
