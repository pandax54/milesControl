---
applyTo: "**"
---
# Command Safety and Permission Gates

Apply this rule especially when safeguards are reduced (for example, `claude --dangerously-skip-permissions`).

## Core behavior

- Treat destructive or infra-mutating commands as blocked by default.
- Do not run risky commands without explicit user approval in the current chat.
- If approval is missing, ask for confirmation with exact command, scope, and impact.

## Blocked without explicit approval

- Recursive delete commands (`rm -rf`, `rm -r`, `find ... -delete`)
- Broad path deletes or wildcard parent/root paths
- Database migration execution commands (run/revert/deploy/push)

## Required checks before running approved risky commands

1. Show exact command.
2. Show exact target path or database/schema.
3. Explain expected impact in one short sentence.
4. Ask user to reply exactly: `APPROVED`.
5. Execute only after approval appears in the same conversation.

## Additional hard limits

- Never run destructive commands against `/`, `~`, parent wildcards, or unknown paths.
- If environment is unclear, assume high risk and do not execute.
- Prefer read-only or reversible alternatives first.