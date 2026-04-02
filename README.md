```bash
cp .env.example .env
# Fill in JIRA_API_TOKEN from: https://id.atlassian.com/manage-profile/security/api-tokens
# Fill in JIRA_USER_EMAIL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

# Test Jira connection
./jira.sh my-issues

# Start the full workflow
./workflow.sh            # interactive pick
./workflow.sh LD-14      # specific issue

# Or from Telegram
./ralph-telegram-bot.sh  # then send /next or /workflow LD-14
```

```BASH
./jira.sh transition LD-48 in-progress && echo "---" && ./jira.sh comment LD-48 "Workflow test: branch feature/LD-48-add-currency-conversion-display-to-transfer-pa" && echo "---" && ./jira.sh transition LD-48 todo

Edit the file at the full path above
Or resume with --skip-to prd to skip clarification: .workflow.sh LD-48 --resume --skip-to prd --auto
Process cleanup: no background processes started.

# Phases branch and clarify are already marked done. The error happened
# during the clarify checkpoint. Just resume from the next phase — PRD:
# This will skip branch and clarify (already done) and pick up from Phase 4: Create PRD automatically.
# If you want to re-run clarify (e.g. your answers weren't saved), use --skip-to:
./workflow.sh LD-48 --skip-to clarify
./workflow.sh LD-48 --resume
```
