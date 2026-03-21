---
name: git-cli-workflow
description: Practical Git CLI workflow conventions for branching, staging, diffing, committing, pushing, and ignore hygiene.
---

# Git CLI Workflow

## Purpose

Use this skill when work should stay in native Git CLI instead of custom tools.

## Daily Flow

1. Inspect current state.
2. Sync main, then create or switch branch.
3. Review changes with diff/status.
4. Stage intentionally.
5. Commit with focused message.
6. Push branch and set upstream.

## Branch Per Ticket

Use one branch per JIRA ticket by default.

Branch format:

```text
feat/ORG-123
```

Follow the same branch naming convention used in PR guidance.

Before starting work on a new ticket:

```bash
git checkout main
git pull
git checkout -b feat/ORG-123
```

If the repository has app-scoped migration scripts (for example `apps/api`), run the migration command from the owning app workspace:

```bash
cd apps/<app-owning-typeorm>
yarn migration:run
```

If the branch already exists because you are expanding existing work, switch to it instead of creating a new branch.

## Command Playbook

### 1) Inspect current state

```bash
git status
git branch --show-current
git log --oneline -n 5
```

### 2) Create or switch branch

```bash
git checkout main
git pull
git checkout -b feat/ORG-123
```

For app-scoped migrations:

```bash
cd apps/<app-owning-typeorm>
yarn migration:run
```

When continuing existing work:

```bash
git checkout feat/ORG-123
git pull
```

### 3) Review current work

```bash
git diff
git diff --staged
git status --short
```

Use `git diff` before staging and `git diff --staged` before committing.

### 4) Stage changes deliberately

Prefer path-based staging:

```bash
git add src/modules/github/github.plugin.ts
git add src/modules/github/services/github-pr.service.ts
```

Stage everything only when intentional:

```bash
git add --all
```

Notes:

- `git add --all` respects ignore rules.
- `git add .` also respects ignore rules, but is path-scoped from current directory.

### 5) Commit

```bash
git commit -m "feat: add pull request creation tool"
```

Before commit, verify exactly what is staged:

```bash
git diff --staged
```

Use `<type>: <description>` format by default. Do not use scopes unless the repository explicitly requires them.

### 6) Push

First push for a branch:

```bash
git push -u origin $(git branch --show-current)
```

Next pushes:

```bash
git push
```

## Gitignore Hygiene

### Check if a file is ignored

```bash
git check-ignore -v path/to/file
```

### Stop tracking a file that should be ignored

```bash
git rm --cached path/to/file
```

Then add the pattern to `.gitignore` and commit that change.

### Local-only ignore (do not commit)

Use `.git/info/exclude` for machine-specific entries.

## Workspace Noise Filtering

When summarizing `git status` or preparing commits, treat local-generated junk as noise unless explicitly requested.

Common examples:

- `**/node_modules/`
- build artifacts (`dist/`, `build/`, `.turbo/`, coverage outputs)
- IDE/editor files (`.idea/`, `.vscode/`, `.DS_Store`)

Rules:

- Do not stage or commit noise paths by default.
- In status summaries, call out noise once in a short note and keep focus on relevant source changes.
- If noise is repeatedly untracked and truly local, prefer `.git/info/exclude`.
- If noise should be ignored for the whole team, add/update `.gitignore` in a separate intentional change.

## Commit Types

Use these common conventional commit types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation-only change
- `style`: formatting/style changes without logic impact
- `refactor`: code change without new feature or bug fix
- `perf`: performance improvement
- `test`: add or update tests
- `build`: build system or dependency/build pipeline changes
- `ci`: CI configuration or pipeline changes
- `chore`: maintenance changes not in src/test logic
- `revert`: revert a previous commit

## Commitlint Basics

Most repositories using conventional commits expect:

- Header format: `<type>: <description>`
- Short imperative description (`add`, `fix`, `refactor`)
- Blank line before the body when a body is present

Example:

```text
refactor: simplify github pr creation flow

remove commit and push tools and keep only create-pull-request.
```

If commitlint is enabled, verify your message follows the local config before retrying commit.

Quick header examples:

| Bad                          | Good                                  |
| ---------------------------- | ------------------------------------- |
| `refactor(github): clean up` | `refactor: clean up github workflow`  |
| `fixed bug in push`          | `fix: handle push upstream correctly` |
| `feat add pr tool`           | `feat: add pull request tool`         |

## Authoring Rule

- Do not set or override git author/committer identity from the LLM workflow.
- Do not run `git commit --author ...`.
- Do not change git identity config during task execution.

## Safe Defaults

- Prefer explicit path staging over blanket staging.
- Run both `git diff` and `git diff --staged` before commit.
- Keep one logical change per commit.
- Never commit secrets; verify `.env` and credential files are ignored.

## Anti-Patterns

- Committing without reviewing staged diff.
- Using `git add --all` in a dirty tree without checking `git status` first.
- Relying on `.gitignore` to untrack already tracked files.
- Force-pushing shared branches unless explicitly required.

## Rules

- Branch before significant edits.
- Stage intentionally.
- Review unstaged and staged diffs.
- Commit small, focused changes.
- Prefer `type: description` commit headers with no scope.
- Push with upstream on first publish.

## Monorepo-Only Addendum (Turbo/workspaces + `apps/`/`packages/`)

Apply this section only when all are true:

- the target repository is a Turbo/workspace monorepo
- the repository has an `apps/` and/or `packages/` folder at root
- migration scripts are app-scoped

Run migrations from the app workspace, not from repo root unless root script exists:

```bash
cd apps/<app-owning-typeorm>
yarn migration:run
```

Example for Chirp API monorepo:

```bash
cd apps/api
yarn migration:run
```
