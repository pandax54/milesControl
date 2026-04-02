#!/bin/bash
# install.sh — Copy boilerplate files to a target project folder

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-.}"

if [ ! -d "$TARGET" ]; then
  echo "Error: Target directory '$TARGET' does not exist."
  exit 1
fi

# Copy dotfolders
cp -r "$SCRIPT_DIR/.claude" "$TARGET/"
cp -r "$SCRIPT_DIR/.github" "$TARGET/"
cp -r "$SCRIPT_DIR/.agents" "$TARGET/"

# Copy config files
cp "$SCRIPT_DIR/AGENTS.md" "$TARGET/"
cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET/"

# Copy workflow scripts
for script in ralph-once.sh ralph-telegram-bot.sh run-phase.sh run-all-phases.sh jira.sh workflow.sh; do
  if [ -f "$SCRIPT_DIR/$script" ]; then
    cp "$SCRIPT_DIR/$script" "$TARGET/"
    chmod +x "$TARGET/$script"
  fi
done

# Copy env template
if [ -f "$SCRIPT_DIR/.env.example" ]; then
  cp "$SCRIPT_DIR/.env.example" "$TARGET/"
fi

echo "Boilerplate installed to $TARGET"