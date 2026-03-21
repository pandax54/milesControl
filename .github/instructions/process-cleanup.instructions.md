---
applyTo: "**"
---
# Process Cleanup Gate

Before finalizing any task, terminate every background process started during the current interaction.

## Required behavior

- Keep track of processes started with `run_in_terminal` using `isBackground=true`.
- Before the final response, stop those processes with `kill_terminal`.
- If a process was started without a terminal handle, identify it by port (`lsof -nP -iTCP:<port> -sTCP:LISTEN`) and terminate it.
- Verify there are no lingering listeners on touched ports before finishing.
- In the final response, state that process cleanup was completed (or clearly list what could not be terminated).

## Safety

- Only terminate processes owned by the current user.
- Never terminate unknown system services or processes outside task scope.
