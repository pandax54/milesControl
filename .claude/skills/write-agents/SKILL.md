---
name: write-agents
description: Conventions for designing and maintaining subagent definitions in the Agentic repository.
---

# Agents Writing

## Applicability

Use this skill only when all are true:

- the target repository is `/Users/michaljarnot/IdeaProjects/agentic`
- work updates or creates files under `src/agents/**`
- the task is about agent behavior, scope, tools, or handoff contracts

If these signals are missing, do not apply this skill.

## Purpose

Define a consistent, safe, and maintainable pattern for subagent files in this repository.

## Agent Frontmatter

Every agent file should include:

- `description`: one concise sentence in third person, scoped to the agent's domain
- `mode`: `subagent`
- `model`: explicit model id
- `tools`: explicit allowlist by tool capability
- `steps`: bounded step budget matching task complexity

## Tooling Conventions

Use least-privilege defaults:

- Exploration/review agents: `read`, `grep`, selected `codebase_*`, optional domain tools (`github_*`, `jira_*`, `kb_*`, `db_schema_snapshot`)
- No write access for read-only agents: `edit: false`, `write: false`
- No nested delegation by default: `task: false`
- `bash` only when strictly needed (for example, CI log retrieval or git metadata)

For manager agents:

- Keep destructive actions disabled by default
- If creation actions are enabled, require explicit caller instruction in Rules

## Structure Conventions

Use this section order unless the agent is intentionally minimal:

1. Role statement
2. Setup (skills to load and when)
3. When to use / scope boundaries
4. Process or workflow
5. Output format
6. Rules

## Behavior Rules

- Be explicit about leaf behavior; if leaf, state "do not delegate"
- Prefer evidence-first guidance and require file references where applicable
- State what the agent must not do (for example: no direct code edits, no ticket creation without instruction)
- Keep handoff contracts crisp: what the agent returns to caller and in which format
- Use deterministic wording for gating actions ("only when explicitly asked")

## Naming Conventions

- File names use `<role>-<domain>.md` when possible (for example: `manager-project.md`, `worker-search-web.md`)
- Descriptions should be specific enough to trigger correct selection among similar agents
- Avoid generic descriptions like "helper" or "assistant"

## Anti-Patterns

- Over-broad tool access without a clear reason
- Agents with both broad write powers and vague scope
- Missing handoff format for manager/reviewer workflows
- Implicit destructive behavior not guarded by explicit instruction
- Delegation loops (`task: true` in leaf-style workers)

## Rules

- Keep each agent narrowly scoped to one operational responsibility
- Encode permission gates directly in the prompt when tool rights are sensitive
- Prefer minimal tool surface area and explicit prohibitions
- Use concrete workflow steps instead of generic guidance
- Ensure outputs are structured for caller-agent consumption, not end-user prose
