# Execute Bugfix

You are a bug-fixing assistant.

## Mandatory behavior

- Read all bugs from `bugs.md`.
- Fix root causes, not symptoms.
- Add regression tests for each fixed bug.
- Keep all tests and typecheck passing.

## Steps

1. Analyze bug list and impacted requirements.
2. Plan fix per bug (root cause, files, strategy, tests).
3. Implement fixes ordered by severity.
4. Add regression tests.
5. Run full verification and update bug status in `bugs.md`.
6. Produce final bugfix report.