# Miles Domain Skill

## Programs Ecosystem (Brazil)

### Airline Programs (miles)
- **Smiles** (GOL): Dynamic pricing, Shopping Smiles for online purchases, Clube Smiles for monthly miles
- **Latam Pass** (LATAM): Qualifying points + miles system, best international redemptions (oneworld-adjacent), 36-month expiration
- **Azul Fidelidade** (Azul): TudoAzul points, strong domestic coverage, Star Alliance partners (United, Turkish)

### Banking Programs (points → transfer to airlines)
- **Livelo**: Banco do Brasil + Bradesco. #1 accumulation tool. Points transfer 1:1 to Smiles, Latam Pass, Azul. Frequent 80-133% transfer bonuses.
- **Esfera** (Santander): Similar to Livelo but Santander-exclusive. "Bateu Ganhou" campaigns. Transfer to Smiles, Latam Pass, Azul, Iberia, ConnectMiles.
- **iupp** (Itaú): Itaú's program. Transfer to Latam Pass, Azul, Smiles.
- **Átomos** (C6 Bank): C6 Bank's program.

### Club Subscriptions
Clubs provide: monthly miles accrual, exclusive transfer bonuses, promo-only access.
Example tiers (Clube Smiles): 1.000, 2.000, 5.000, 7.000, 10.000, 20.000 miles/month.
Each tier has different pricing, minimum stay, and promotional bonuses.

## Key Formulas

```typescript
// Miles after transfer with bonus
function milesAfterBonus(points: number, bonusPercent: number): number {
  return Math.floor(points * (1 + bonusPercent / 100));
}

// Cost per milheiro (1,000 miles)
function costPerMilheiro(totalCost: number, totalMiles: number): number {
  return (totalCost / totalMiles) * 1000;
}

// Effective cost when buying points + transferring with bonus
function effectiveCost(
  purchasePricePerK: number, // R$ per 1,000 points
  quantity: number,          // thousands of points
  bonusPercent: number
): number {
  const totalCost = purchasePricePerK * quantity;
  const totalMiles = milesAfterBonus(quantity * 1000, bonusPercent);
  return costPerMilheiro(totalCost, totalMiles);
}

// Miles value when redeeming for flights
function milesValue(cashPriceBRL: number, milesRequired: number): number {
  return (cashPriceBRL / milesRequired) * 1000; // R$ per 1,000 miles
}
```

## Rating Thresholds (Cost per Milheiro)
- **EXCELLENT**: < R$12
- **GOOD**: R$12 – R$16
- **ACCEPTABLE**: R$16 – R$20
- **AVOID**: > R$20

## Promotional Calendar (Key Dates)
- **January**: New year promos, Caixa anniversary
- **March**: Consumer Week (Smiles, Azul, Livelo campaigns)
- **May**: Smiles big transfer bonuses
- **June**: LATAM anniversary
- **July**: Melhores Destinos anniversary
- **September**: Clube Livelo anniversary (Sep 5), biggest month for bonuses
- **November**: Black Friday (biggest deals of the year)
- **December**: Year-end promos

## Transfer Bonus Ranges (Historical 2025)
- Smiles: 70-100% bonus (club members get extra 5-10%)
- Azul Fidelidade: 80-133% bonus
- Latam Pass: 20-35% bonus (lower but more frequent)

## Scraping Sources (Brazilian Miles Blogs)
- passageirodeprimeira.com — Gold standard, detailed analysis
- melhorescartoes.com.br — Promo alerts, app with push
- pontospravoar.com — Detailed cost analysis per promo
- comparemania.com.br — Structured promotion comparison

## External APIs
- **Seats.aero**: Award flight search. Pro API at $9.99/month. Header: `Partner-Authorization`. Endpoints: cached search, bulk availability, get trips. Sources include: `smiles`, `azul`, `aeroplan`, etc.
- **SerpApi Google Flights**: Cash flight prices. Free tier: 250 queries/month. Engine: `google_flights`. Returns best_flights and other_flights arrays with prices in BRL.
