#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  jira.sh — Jira REST API helper for workflow automation
# ═══════════════════════════════════════════════════════════════════
#
# Wraps common Jira operations: list assigned issues, read descriptions,
# transition issues between columns, and add comments.
#
# Usage:
#   ./jira.sh <command> [args...]
#
# Commands:
#   my-issues                    — List issues assigned to me in the backlog/todo
#   issue <ISSUE_KEY>            — Show issue details (summary, description, status)
#   description <ISSUE_KEY>      — Print only the description (for piping)
#   transition <ISSUE_KEY> <STATUS> — Move issue to a column (in-progress, code-review, qa, done)
#   transitions <ISSUE_KEY>      — List available transitions for an issue
#   comment <ISSUE_KEY> <TEXT>   — Add a comment to an issue
#   search <JQL>                 — Run a raw JQL search
#
# Environment variables (or set in .env):
#   JIRA_BASE_URL   — e.g. https://strvcom.atlassian.net
#   JIRA_USER_EMAIL — your Atlassian email
#   JIRA_API_TOKEN  — API token from https://id.atlassian.com/manage-profile/security/api-tokens
#   JIRA_PROJECT    — project key, e.g. LD

# ─── Load env ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  eval "$(grep -E '^(JIRA_BASE_URL|JIRA_USER_EMAIL|JIRA_API_TOKEN|JIRA_PROJECT|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "${SCRIPT_DIR}/.env")"
  set +a
fi

JIRA_BASE_URL="${JIRA_BASE_URL:?Set JIRA_BASE_URL in .env or environment}"
JIRA_USER_EMAIL="${JIRA_USER_EMAIL:?Set JIRA_USER_EMAIL in .env or environment}"
JIRA_API_TOKEN="${JIRA_API_TOKEN:?Set JIRA_API_TOKEN in .env or environment}"
JIRA_PROJECT="${JIRA_PROJECT:-LD}"

API_URL="${JIRA_BASE_URL}/rest/api/3"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────
jira_curl() {
  local method="$1"
  local endpoint="$2"
  shift 2
  curl -s -X "$method" \
    -H "Content-Type: application/json" \
    -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
    "${API_URL}${endpoint}" \
    "$@"
}

# Search using the new /search/jql endpoint (Jira Cloud 2024+ migration)
jira_search() {
  local jql="$1"
  local fields="${2:-summary,status,priority,issuetype}"
  local max_results="${3:-20}"
  curl -s -G \
    -H "Content-Type: application/json" \
    -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
    "${API_URL}/search/jql" \
    --data-urlencode "jql=${jql}" \
    --data-urlencode "fields=${fields}" \
    --data-urlencode "maxResults=${max_results}"
}

# Extract plain text from Jira's ADF (Atlassian Document Format) JSON
adf_to_text() {
  python3 -c "
import sys, json

def extract_text(node):
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        if node.get('type') == 'text':
            return node.get('text', '')
        if node.get('type') == 'hardBreak':
            return '\n'
        if node.get('type') == 'mention':
            return '@' + node.get('attrs', {}).get('text', 'unknown')
        children = node.get('content', [])
        text = ''.join(extract_text(c) for c in children)
        block_types = ('paragraph', 'heading', 'bulletList', 'orderedList',
                       'listItem', 'blockquote', 'codeBlock', 'table',
                       'tableRow', 'tableCell', 'tableHeader', 'rule')
        if node.get('type') in block_types:
            prefix = ''
            if node.get('type') == 'heading':
                level = node.get('attrs', {}).get('level', 1)
                prefix = '#' * level + ' '
            if node.get('type') == 'listItem':
                prefix = '- '
            if node.get('type') == 'blockquote':
                text = '> ' + text.replace('\n', '\n> ')
            if node.get('type') == 'codeBlock':
                lang = node.get('attrs', {}).get('language', '')
                text = '\`\`\`' + lang + '\n' + text + '\n\`\`\`'
            if node.get('type') == 'rule':
                return '\n---\n'
            return prefix + text + '\n'
        return text
    if isinstance(node, list):
        return ''.join(extract_text(n) for n in node)
    return ''

try:
    data = json.load(sys.stdin)
    if data:
        print(extract_text(data).strip())
    else:
        print('(no description)')
except Exception:
    print('(unable to parse description)')
" 2>/dev/null
}

# ─── Commands ────────────────────────────────────────────────────

cmd_my_issues() {
  local jql="project = ${JIRA_PROJECT} AND assignee = currentUser() AND status IN (\"To Do\", \"Backlog\", \"Open\", \"New\") AND status != \"Blocked\" ORDER BY priority ASC, rank ASC"

  local response
  response=$(jira_search "$jql" "summary,status,priority,issuetype" 20)

  local count
  count=$(echo "$response" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('issues', [])))" 2>/dev/null || echo "0")

  echo -e "${BOLD}${CYAN}My Assigned Issues (${count} found)${RESET}"
  echo -e "${DIM}Project: ${JIRA_PROJECT} | Excludes: Blocked | Sorted: High priority first${RESET}"
  echo ""

  echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
issues = data.get('issues', [])
if not issues:
    print('  No issues found.')
else:
    priority_colors = {'Highest': '\033[1;31m', 'High': '\033[0;31m', 'Medium': '\033[1;33m', 'Low': '\033[0;34m', 'Lowest': '\033[2m'}
    reset = '\033[0m'
    for i, issue in enumerate(issues, 1):
        key = issue['key']
        fields = issue['fields']
        summary = fields.get('summary', '(no summary)')
        status = fields.get('status', {}).get('name', '?')
        priority = fields.get('priority', {}).get('name', '?')
        issue_type = fields.get('issuetype', {}).get('name', '?')
        pcolor = priority_colors.get(priority, '')
        marker = ' ⬆' if priority in ('Highest', 'High') else ''
        print(f'  {i}. [{key}] {summary}')
        print(f'     Type: {issue_type} | {pcolor}Priority: {priority}{marker}{reset} | Status: {status}')
        print()
" 2>/dev/null
}

cmd_issue() {
  local issue_key="${1:?Usage: jira.sh issue <ISSUE_KEY>}"
  local response
  response=$(jira_curl GET "/issue/${issue_key}?fields=summary,description,status,priority,issuetype,assignee,labels,created,updated")

  echo -e "${BOLD}${CYAN}Issue: ${issue_key}${RESET}"
  echo ""

  echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'errorMessages' in data:
    for e in data['errorMessages']:
        print(f'  Error: {e}')
    sys.exit(1)
fields = data.get('fields', {})
print(f'  Summary:  {fields.get(\"summary\", \"?\")}')
print(f'  Type:     {fields.get(\"issuetype\", {}).get(\"name\", \"?\")}')
print(f'  Status:   {fields.get(\"status\", {}).get(\"name\", \"?\")}')
print(f'  Priority: {fields.get(\"priority\", {}).get(\"name\", \"?\")}')
assignee = fields.get('assignee')
if assignee:
    print(f'  Assignee: {assignee.get(\"displayName\", \"?\")}')
labels = fields.get('labels', [])
if labels:
    print(f'  Labels:   {', '.join(labels)}')
print(f'  Created:  {fields.get(\"created\", \"?\")[:10]}')
print(f'  Updated:  {fields.get(\"updated\", \"?\")[:10]}')
" 2>/dev/null

  echo ""
  echo -e "${BOLD}Description:${RESET}"
  echo ""

  local description_json
  description_json=$(echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
desc = data.get('fields', {}).get('description')
if desc:
    json.dump(desc, sys.stdout)
else:
    print('null')
" 2>/dev/null)

  if [[ "$description_json" != "null" && -n "$description_json" ]]; then
    echo "$description_json" | adf_to_text | sed 's/^/  /'
  else
    echo "  (no description)"
  fi
}

cmd_description() {
  local issue_key="${1:?Usage: jira.sh description <ISSUE_KEY>}"
  local response
  response=$(jira_curl GET "/issue/${issue_key}?fields=description,summary")

  local summary
  summary=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('fields',{}).get('summary',''))" 2>/dev/null)

  local description_json
  description_json=$(echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
desc = data.get('fields', {}).get('description')
if desc:
    json.dump(desc, sys.stdout)
else:
    print('null')
" 2>/dev/null)

  echo "# ${issue_key}: ${summary}"
  echo ""
  if [[ "$description_json" != "null" && -n "$description_json" ]]; then
    echo "$description_json" | adf_to_text
  else
    echo "(no description)"
  fi
}

cmd_transitions() {
  local issue_key="${1:?Usage: jira.sh transitions <ISSUE_KEY>}"
  local response
  response=$(jira_curl GET "/issue/${issue_key}/transitions")

  echo -e "${BOLD}${CYAN}Available transitions for ${issue_key}:${RESET}"
  echo ""

  echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
transitions = data.get('transitions', [])
if not transitions:
    print('  No transitions available.')
else:
    for t in transitions:
        tid = t['id']
        name = t['name']
        to_status = t.get('to', {}).get('name', '?')
        print(f'  [{tid}] {name} → {to_status}')
" 2>/dev/null
}

cmd_transition() {
  local issue_key="${1:?Usage: jira.sh transition <ISSUE_KEY> <STATUS>}"
  local target_status="${2:?Usage: jira.sh transition <ISSUE_KEY> <STATUS>}"

  # Normalize status names
  local search_terms=""
  case "$(echo "$target_status" | tr '[:upper:]' '[:lower:]')" in
    in-progress|"in progress"|progress|start)
      search_terms="in progress|start progress|in development"
      ;;
    code-review|review|"code review")
      search_terms="code review|review|peer review"
      ;;
    qa|testing|"quality assurance")
      search_terms="qa|testing|quality|ready for qa|ready for test"
      ;;
    done|closed|resolved)
      search_terms="done|closed|resolved|complete"
      ;;
    "ready for development"|"ready-for-dev"|ready)
      search_terms="ready for development|ready for dev"
      ;;
    blocked|block)
      search_terms="blocked|block"
      ;;
    todo|"to do"|"to-do"|backlog)
      search_terms="to do|todo|backlog"
      ;;
    "ready to deployment"|deploy|"ready for deployment")
      search_terms="ready to deploy|ready for deploy|deployment|deploy"
      ;;
    *)
      search_terms="$target_status"
      ;;
  esac

  # Get available transitions and find matching one
  local transitions_response
  transitions_response=$(jira_curl GET "/issue/${issue_key}/transitions")

  local transition_id
  transition_id=$(echo "$transitions_response" | python3 -c "
import sys, json, re
data = json.load(sys.stdin)
search = '${search_terms}'.lower()
patterns = search.split('|')
transitions = data.get('transitions', [])
for t in transitions:
    name = t['name'].lower()
    to_name = t.get('to', {}).get('name', '').lower()
    for p in patterns:
        if p in name or p in to_name:
            print(t['id'])
            sys.exit(0)
# Fallback: if target_status matches exactly
for t in transitions:
    if t['name'].lower() == '${target_status}'.lower():
        print(t['id'])
        sys.exit(0)
    if t.get('to', {}).get('name', '').lower() == '${target_status}'.lower():
        print(t['id'])
        sys.exit(0)
print('')
" 2>/dev/null)

  if [[ -z "$transition_id" ]]; then
    echo -e "${RED}❌ No matching transition found for '${target_status}'${RESET}"
    echo ""
    echo "Available transitions:"
    cmd_transitions "$issue_key"
    return 1
  fi

  # Execute transition
  local result
  result=$(jira_curl POST "/issue/${issue_key}/transitions" \
    -d "{\"transition\":{\"id\":\"${transition_id}\"}}")

  if [[ -z "$result" || "$result" == "" ]]; then
    echo -e "${GREEN}✅ ${issue_key} transitioned to '${target_status}'${RESET}"
  else
    echo -e "${RED}❌ Transition failed:${RESET}"
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    return 1
  fi
}

cmd_comment() {
  local issue_key="${1:?Usage: jira.sh comment <ISSUE_KEY> <TEXT>}"
  local text="${2:?Usage: jira.sh comment <ISSUE_KEY> <TEXT>}"

  local body
  body=$(python3 -c "
import json
body = {
    'body': {
        'type': 'doc',
        'version': 1,
        'content': [{
            'type': 'paragraph',
            'content': [{'type': 'text', 'text': '''${text}'''}]
        }]
    }
}
print(json.dumps(body))
")

  local result
  result=$(jira_curl POST "/issue/${issue_key}/comment" -d "$body")

  if echo "$result" | python3 -c "import sys,json; data=json.load(sys.stdin); assert 'id' in data" 2>/dev/null; then
    echo -e "${GREEN}✅ Comment added to ${issue_key}${RESET}"
  else
    echo -e "${RED}❌ Failed to add comment${RESET}"
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    return 1
  fi
}

cmd_search() {
  local jql="${1:?Usage: jira.sh search <JQL>}"

  local response
  response=$(jira_search "$jql" "summary,status,priority,issuetype,assignee" 30)

  echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
issues = data.get('issues', [])
print(f'Results: {len(issues)} found')
print()
for issue in issues:
    key = issue['key']
    f = issue['fields']
    summary = f.get('summary', '?')
    status = f.get('status', {}).get('name', '?')
    assignee = f.get('assignee', {})
    assignee_name = assignee.get('displayName', 'Unassigned') if assignee else 'Unassigned'
    print(f'  [{key}] {summary}')
    print(f'    Status: {status} | Assignee: {assignee_name}')
    print()
" 2>/dev/null
}

# ─── Main Dispatch ───────────────────────────────────────────────
CMD="${1:-help}"
shift 2>/dev/null || true

case "$CMD" in
  my-issues|my|mine|assigned)
    cmd_my_issues
    ;;
  issue|show|get)
    cmd_issue "$@"
    ;;
  description|desc)
    cmd_description "$@"
    ;;
  transitions|trans)
    cmd_transitions "$@"
    ;;
  transition|move|status)
    cmd_transition "$@"
    ;;
  comment)
    cmd_comment "$@"
    ;;
  search|jql)
    cmd_search "$@"
    ;;
  help|--help|-h)
    echo "Usage: ./jira.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  my-issues                        List issues assigned to me (backlog/todo)"
    echo "  issue <KEY>                      Show full issue details"
    echo "  description <KEY>                Print issue description (plain text)"
    echo "  transitions <KEY>                List available status transitions"
    echo "  transition <KEY> <STATUS>        Move issue to a status"
    echo "  comment <KEY> <TEXT>             Add a comment"
    echo "  search <JQL>                     Run a JQL query"
    echo ""
    echo "Status shortcuts for 'transition':"
    echo "  in-progress, code-review, qa, done, ready-to-deployment"
    echo ""
    echo "Environment (.env):"
    echo "  JIRA_BASE_URL    — Atlassian instance URL"
    echo "  JIRA_USER_EMAIL  — Your email"
    echo "  JIRA_API_TOKEN   — API token"
    echo "  JIRA_PROJECT     — Project key (default: LD)"
    ;;
  *)
    echo "Unknown command: $CMD"
    echo "Run './jira.sh help' for usage."
    exit 1
    ;;
esac
