# Copilot Project Instructions

This repository is a workflow template. Prefer minimal, focused changes and preserve existing structure.

## Core behavior

- Use GPT-5.3-Codex behavior: concise, precise, implementation-first.
- Follow project rules from `.claude/rules` translated in `.github/instructions`.
- Enforce process cleanup gates from `.github/instructions/process-cleanup.instructions.md` before ending a task.
- Enforce command safety gates from `.github/instructions/command-safety.instructions.md` before any destructive or migration command.
- Do not invent scope beyond the requested task.
- Keep all code and documentation in English.
- Prefer root-cause fixes over workarounds.
- Use npm as package manager.
- Use TypeScript strict patterns and avoid `any`.
- Never add copyright headers unless explicitly requested.

## Repository workflow context

Preferred process for feature work:

1. Create PRD
2. Create Tech Spec
3. Create Tasks
4. Execute Task
5. Execute Review / QA / Bugfix

## Mapping note

Claude-specific concepts (skills/agents) are represented in Copilot by:

- instruction files in `.github/instructions`
- reusable prompt files in `.github/prompts`

## Git convention preference

When asked about git conventions, prioritize STRV repository naming conventions guidance.