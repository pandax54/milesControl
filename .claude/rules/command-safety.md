# Command Safety and Permission Gates

Use this rule when operating with reduced safeguards (for example, `claude --dangerously-skip-permissions`).

## Core policy

- Assume all shell commands are **deny by default** if they can destroy data or mutate shared infrastructure.
- Never run destructive or irreversible commands without explicit user approval in the current chat.
- If approval is missing, stop and ask for confirmation with the exact command to run.

## Destructive file operations

The following commands require explicit approval before execution:

- `rm -rf`
- `rm -r`
- `find ... -delete`
- Recursive deletes or overwrites outside temporary build artifacts

Safety requirements:

1. Prefer non-destructive alternatives first (`mv` to backup folder, targeted file removal).
2. Scope operations to repository-relative paths only.
3. Never target home, root, system, or parent wildcards (examples: `~`, `/`, `../*`, `/*`).
4. Show the exact path and command before execution.

## Migration execution gate

Never run schema/data migrations without explicit user approval.

Examples requiring approval:

- `typeorm migration:run`
- `typeorm migration:revert`
- `prisma migrate deploy`
- `prisma db push`
- Any command that mutates DB schema or data in non-test environments

Safety requirements:

1. Present the migration command and expected impact first.
2. Wait for an explicit "approved" response in the current conversation.
3. If environment is unclear, assume production risk and do not run.

## Required confirmation format

Before any blocked command, ask:

- Command: `<exact command>`
- Scope: `<exact paths / database target>`
- Impact: `<what will be deleted or changed>`
- Prompt: "Reply with: APPROVED"

Only execute after the user replies with clear approval.

## Defaults when uncertain

- Do not execute.
- Ask for clarification.
- Prefer read-only inspection commands first.