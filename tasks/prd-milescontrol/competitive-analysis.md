# Competitive Analysis — MilesControl vs AwardWallet vs Oktoplus

## Executive Summary

MilesControl competes in the loyalty program management space with two established players. Rather than competing head-to-head on their strengths (auto-sync for AwardWallet, mobile app for Oktoplus), we differentiate through **promotional intelligence and strategic decision-making** — features neither competitor offers.

## AwardWallet

**Website**: awardwallet.com
**Founded**: 2004 (20+ years)
**Pricing**: Free (basic) / $49.99/yr (Plus)
**Coverage**: 623 programs globally
**Platforms**: Web + iOS + Android

### Strengths (steal these)
1. **Auto balance sync** — logs into accounts and pulls balances automatically. This is their killer feature and the main reason users pay.
2. **Balance change notifications** — weekly emails showing which programs had increases/decreases. Simple but incredibly sticky. → **Steal for F1.13**
3. **One-click login links** — stores program URLs and lets users jump directly to any account. → **Steal for F1.12**
4. **Certificate/benefit tracking** — tracks free night certificates, companion passes, upgrade credits, travel credits — not just miles. → **Steal for F1.14**
5. **Family management** — one account manages the entire family's loyalty programs. → **Steal for F1.15**
6. **Historical balance data** — shows accrual and redemption trends over time.
7. **Travel itinerary organizer** — imports trips from email, shows master itinerary.
8. **Merchant category lookup** — tells you which credit card earns more at specific stores.
9. **20 years of trust** — bank-level encryption, established reputation.
10. **Multi-language** — Portuguese, Spanish, English, etc.

### Weaknesses (exploit these)
1. **Zero promotional intelligence** — doesn't track transfer bonuses, point purchases, or any promotions. Purely passive tracking.
2. **No flight search** — tracks balances but never helps spend them.
3. **No cost analysis** — can't calculate cost-per-milheiro or advise on transfer timing.
4. **No Brazil market depth** — treats Smiles/Livelo/Esfera as generic programs. No understanding of the club/transfer bonus ecosystem.
5. **Auto-sync eroding** — airlines adding 2FA, blocking third-party access. AwardWallet acknowledged this publicly. American AAdvantage blocked them entirely.
6. **Security concerns** — requires storing login credentials for every loyalty program. Users uncomfortable sharing banking passwords.
7. **Recent price increase** — from $30 to $49.99/yr, with acknowledgment that costs are rising due to airlines making scraping harder.
8. **No Telegram alerts** — only email and push.
9. **No club subscription tracking** — can't model "first 6 months at 2k/month then 1k/month."
10. **No admin/consultant tools** beyond basic Business tier.

### What we learn
AwardWallet proves that **balance tracking alone is worth paying for**. But their model (credential-based auto-sync) is under threat. Our manual-entry approach, combined with promotional intelligence, creates a defensible alternative that doesn't rely on fragile scraping.

---

## Oktoplus

**Website**: oktoplus.com.br
**Founded**: ~2014 (Florianópolis, SC)
**Pricing**: Free (basic) / Premium (subscription)
**Coverage**: 65+ programs (Brazil only)
**Platforms**: iOS + Android (mobile-first), web only for Premium flight search
**Downloads**: 1M+ (Google Play)

### Strengths (steal these)
1. **Brazil-focused** — built specifically for the Brazilian miles ecosystem. Understands Smiles, Latam Pass, Azul, Livelo, Esfera.
2. **Flight search: miles vs. cash** — compares flight prices in miles and cash across Brazilian airlines in a single search. → **Already planned in F4**
3. **"Dica Oktoplus"** — advisor that tells you whether to use points or pay cash. → **Steal and improve as F3.6 Miles Value Advisor (with personal cost data)**
4. **Explore destinations** — browse flights by region, holidays, weekends. Inspirational and visual. → **Steal for F4.8**
5. **Sell miles marketplace** — connects users with agencies that buy miles. Monetization opportunity. → **Plan for F6 (v2)**
6. **Bonus promotion alerts** — notifies users about transfer bonus promotions.
7. **Points consolidation view** — shows potential balance if you combine all programs. → **Steal for F1.11**
8. **Save favorite filters** — save common search patterns for quick reuse. → **Steal for F4.9**
9. **1M+ downloads** — proves Brazilian market demand exists.
10. **"Compre e Ganhe"** — earn points through partner purchases.

### Weaknesses (exploit these)
1. **Severe reliability issues** — recent Google Play reviews: "nothing works anymore," "connections unavailable," "search shows fewer results," multiple Premium users considering canceling.
2. **No cost-per-milheiro calculator** — alerts about promos but can't tell you the effective cost. Can't compare scenarios.
3. **No club subscription management** — can't track variable accrual schedules (6-month promos, tier changes).
4. **No transfer history/logging** — can't see your history of transfers, bonuses used, or average cost over time.
5. **No admin/consultant tools** — family sharing is basic. No multi-client dashboard.
6. **Mobile-only for most features** — web version is limited to flight search for Premium. Power users can't do data analysis.
7. **No miles calendar** — no promotional period forecasting.
8. **No historical promo data** — can't analyze patterns (when do best promos appear?).
9. **No accrual projections** — can't forecast future balances.
10. **Generic advisor** — "Dica Oktoplus" uses generic thresholds, not your personal accumulation cost.

### What we learn
Oktoplus proves that **Brazil-specific miles management is a viable product** with real demand (1M+ downloads). Their flight search with miles comparison is a must-have. But their technical execution is struggling (reliability complaints), and they lack the analytical depth that serious miles enthusiasts need.

---

## MilesControl Positioning Matrix

```
                    TRACKING DEPTH
                    ▲
                    │
     AwardWallet    │    MilesControl
     (623 programs, │    (7 deep programs,
      auto-sync,    │     clubs, accruals,
      benefits)     │     benefits, families)
                    │
    ────────────────┼───────────────────► STRATEGIC INTELLIGENCE
                    │
     Generic        │    Oktoplus
     spreadsheet    │    (flight search,
                    │     basic alerts,
                    │     sell miles)
                    │
```

MilesControl occupies the **upper-right quadrant**: deep tracking AND strategic intelligence. Neither competitor occupies this space.

---

## Features Borrowed from Competitors

| Feature | Source | Our Implementation | Improvement |
|---------|--------|--------------------|-------------|
| Balance change digest | AwardWallet | Weekly email with ±changes | Add promo suggestions in same email |
| One-click program links | AwardWallet | Direct links per enrollment | — |
| Benefit tracking | AwardWallet Plus | Certificates, credits, passes | Expiration countdown + alert |
| Family profiles | Both | Family members under one account | Combined with admin tools |
| Flight search (miles+cash) | Oktoplus | Seats.aero + SerpApi | Miles Value Advisor per result |
| "Use miles or pay?" advisor | Oktoplus "Dica" | Miles Value Advisor | Uses personal cost data, not generic |
| Explore destinations | Oktoplus | Region/holiday/weekend browse | Better filters + save functionality |
| Points consolidation view | Oktoplus | Potential balance calculator | Shows with/without active bonuses |
| Saved search filters | Oktoplus | Save common flight searches | — |
| Sell miles marketplace | Oktoplus | Schema planned now, UI in v2 | Partner agency integration |

## Features Unique to MilesControl (neither competitor has)

1. **Automated promo scraping with cost analysis** — scrapes 4+ blogs, extracts promo details, calculates cost-per-milheiro, rates deals automatically
2. **Club subscription phase tracking** — models "first 6 months at 2k, then 1k" with projections
3. **Transfer history with ROI tracking** — log every transfer, see your average cost trend over time
4. **Miles promotional calendar** — predictive calendar of when best deals are expected
5. **Multi-client admin dashboard** — full consultant tools with client matching and reporting
6. **Promo-client matching** — "12 of your 30 clients benefit from this promo"
7. **Personalized promo matching** — "Relevant for you: you have 15k Livelo points"
8. **Accrual projections** — 3/6/12 month balance forecasts based on subscription schedules
9. **Telegram bot** — instant alerts on the channel Brazilians actually use
10. **Cost calculator with scenario comparison** — compare up to 3 acquisition strategies side-by-side

## How to Win

### Short-term (launch)
1. **Nail the promo scraper + cost calculator** — this is the wedge. No one else does it. It's the reason miles enthusiasts would switch.
2. **Make manual entry frictionless** — quick-update in 2 taps. Staleness reminders. Estimated balances from club accruals fill the gap between updates.
3. **Miles Value Advisor on every flight** — instant answer to "should I use miles?" based on YOUR data.

### Medium-term (growth)
4. **Content marketing** — publish the miles calendar, cost calculator, and promo feed as free public tools. Drive organic traffic from the same audience that reads Passageiro de Primeira.
5. **Telegram community** — build a bot that becomes the go-to alert channel for Brazilian miles enthusiasts.
6. **Admin tools** — target the ~500-1000 miles consultants in Brazil. Each brings 10-50 clients.

### Long-term (moat)
7. **Historical promo data** — over time, build the definitive dataset of Brazilian miles promotions. Enable pattern analysis, price prediction, and optimal transfer timing.
8. **Miles marketplace** — become the platform where people buy/sell miles, earning commission.
9. **API for developers** — let other tools integrate with MilesControl's promo data.
