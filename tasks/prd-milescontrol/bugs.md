# Bugs — MilesControl

## Open Bugs

| ID | Phase | Description | Severity | Location | Status | Reproduction Steps |
|----|-------|-------------|----------|----------|--------|--------------------|
| BUG-01 | 5 | Task 5.7 not marked as complete in `phase_5_tasks.txt` | Low | `logs/phase-5/phase_5_tasks.txt` line 19 | Open | Open file — `[ ]` should be `[x]`; feature fully implemented in commits 4e367cf (feat) and 256a22b (review) |
| BUG-02 | 7.1 | Silent premium gate bypass for unauthenticated callers in `computeRedemptionAdvisorAction` and `exploreDestinationsAction` | Low | `src/actions/calculator.ts:102-103`, `src/actions/explore.ts:48-49` | Open | Call either Server Action directly without a valid session cookie. The `if (session?.user?.id)` guard skips `assertPremiumFeatureAccess`, so the action proceeds as if the caller is premium. Not exploitable via normal UI (pages redirect to `/login`), but a crafted direct call bypasses the check silently. Fix: add explicit auth check or `else` branch returning auth error when session is null. |
| BUG-03 | 7.1 | `sendTelegramAlerts` logs "no chatId configured on alert config" and increments `failed` counter when user is free tier — misleading monitoring signal | Low | `src/lib/services/telegram-notification.service.ts:85-103` | Open | Configure a free-tier user with a Telegram alert config. Trigger alert dispatch. Log reports failed delivery citing missing chatId; real reason is user is not Premium. Monitoring dashboards cannot distinguish config errors from intentional tier suppression. Fix: add separate log message and counter for premium-gated skips. |

---

## Closed Bugs

_None._
