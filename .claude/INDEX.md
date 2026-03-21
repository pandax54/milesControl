# AI Workflows Index — MilesControl Extension

## Inherited from ai-setup (copy these to your project)

### Commands (existing)
- `commands/create-prd.md` — Define product requirements
- `commands/create-techspec.md` — Design technical architecture
- `commands/create-tasks.md` — Break down work into tasks
- `commands/execute-task.md` — Execute an implementation task
- `commands/execute-bugfix.md` — Execute bug fixing flow
- `commands/execute-review.md` — Execute review flow
- `commands/execute-qa.md` — Execute QA flow

### Templates (existing)
- `templates/prd.md`
- `templates/techspec.md`
- `templates/tasks.md`
- `templates/task.md`

### Agents (existing)
- `agents/task-reviewer.md`

### Rules (existing)
- `rules/code-standards.md`
- `rules/http.md`
- `rules/logging.md`
- `rules/node.md`
- `rules/tests.md`

### Skills (existing)
- `skills/architecture.md`
- `skills/code-standards-reference.md`
- `skills/nextjs.md`
- `skills/reactjs.md`
- `skills/typescript.md`
- `skills/nodejs-typescript-reference.md`
- `skills/rest-api-reference.md`
- `skills/logging-reference.md`
- `skills/testing-reference.md`
- `skills/firebase-auth-basics/SKILL.md`

## New for MilesControl

### Commands (new)
- `commands/create-scraper.md` — Build web scrapers for promotion tracking
- `commands/create-calculator.md` — Build financial calculators for miles cost analysis

### Agents (new)
- `agents/miles-analyst.md` — Analyze promotions, calculate costs, recommend transfers

### Skills (new)
- `skills/miles-domain.md` — Brazil miles ecosystem: programs, formulas, calendar, APIs
- `skills/web-scraping.md` — Cheerio/Puppeteer patterns, rate limiting, extraction
- `skills/notifications.md` — Telegram bot, Resend email, Web Push patterns

## Workflow for MilesControl

```bash
# 1. Create PRD (already done — see /tasks/prd-milescontrol/prd.md)
# 2. Create Tech Spec (already done — see /tasks/prd-milescontrol/techspec.md)
# 3. Tasks (already done — see /tasks/prd-milescontrol/tasks.md)

# 4. Execute tasks one by one:
/commands/execute-task.md
Implement task: milescontrol/1.0 (Project scaffolding)
# Skills auto-loaded: nextjs, typescript, architecture

# 5. For scraper tasks:
/commands/create-scraper.md
Build a scraper for: Passageiro de Primeira promotion posts
# Skills auto-loaded: web-scraping, miles-domain

# 6. For calculator tasks:
/commands/create-calculator.md
Build the cost-per-milheiro calculator
# Skills auto-loaded: miles-domain

# 7. For promotion analysis:
@miles-analyst
Evaluate: Livelo R$28/k → Smiles 90% bonus — worth it?

# 8. After each task:
@task-reviewer
Review task 3.6 (calculator service)
```
