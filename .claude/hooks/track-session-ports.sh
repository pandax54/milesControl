#!/usr/bin/env bash
set -euo pipefail

INPUT_JSON=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"

if [[ -z "$PROJECT_DIR" ]]; then
  PROJECT_DIR=$(python3 - <<'PY' "$INPUT_JSON"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("cwd", ""))
PY
)
fi

if [[ -z "$PROJECT_DIR" ]]; then
  exit 0
fi

SESSION_ID=$(python3 - <<'PY' "$INPUT_JSON"
import json
import sys

payload = json.loads(sys.argv[1])
print(payload.get("session_id", ""))
PY
)

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

PORTS=$(python3 - <<'PY' "$INPUT_JSON"
import json
import re
import sys

payload = json.loads(sys.argv[1])
if payload.get("tool_name") != "Bash":
    sys.exit(0)

command = payload.get("tool_input", {}).get("command", "")
if not isinstance(command, str) or not command.strip():
    sys.exit(0)

patterns = [
    r"(?:--port|--host-port|-p|PORT=)\s*=?\s*(\d{2,5})",
    r"(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})",
    r"-iTCP:(\d{2,5})",
]

ports = set()
for pattern in patterns:
    for match in re.findall(pattern, command):
        value = int(match)
        if 1 <= value <= 65535:
            ports.add(str(value))

dev_server_patterns = [
    r"\b(?:npm\s+run\s+dev|pnpm\s+dev|pnpm\s+run\s+dev|yarn\s+dev|next\s+dev|vite|nuxt\s+dev)\b",
]
for pattern in dev_server_patterns:
    if re.search(pattern, command):
        ports.add("3000")
        break

if ports:
    print("\n".join(sorted(ports)))
PY
)

if [[ -z "$PORTS" ]]; then
  exit 0
fi

STATE_DIR="$PROJECT_DIR/.claude/.runtime"
STATE_FILE="$STATE_DIR/session-ports-$SESSION_ID.txt"

mkdir -p "$STATE_DIR"
printf '%s\n' "$PORTS" >> "$STATE_FILE"
sort -u "$STATE_FILE" -o "$STATE_FILE"
