# Seed Data for MilesControl

## Programs

```json
[
  {
    "name": "Smiles",
    "type": "AIRLINE",
    "currency": "miles",
    "website": "https://www.smiles.com.br",
    "transferPartners": [
      { "name": "Livelo", "defaultRatio": "1:1" },
      { "name": "Esfera", "defaultRatio": "1:1" },
      { "name": "iupp", "defaultRatio": "1:1" }
    ]
  },
  {
    "name": "Latam Pass",
    "type": "AIRLINE",
    "currency": "miles",
    "website": "https://latampass.latam.com",
    "transferPartners": [
      { "name": "Livelo", "defaultRatio": "1:1" },
      { "name": "Esfera", "defaultRatio": "1:1" },
      { "name": "iupp", "defaultRatio": "1:1" }
    ]
  },
  {
    "name": "Azul Fidelidade",
    "type": "AIRLINE",
    "currency": "points",
    "website": "https://www.voeazul.com.br/tudoazul",
    "transferPartners": [
      { "name": "Livelo", "defaultRatio": "1:1" },
      { "name": "Esfera", "defaultRatio": "1:1" },
      { "name": "iupp", "defaultRatio": "1:1" }
    ]
  },
  {
    "name": "Livelo",
    "type": "BANKING",
    "currency": "points",
    "website": "https://www.livelo.com.br",
    "transferPartners": [
      { "name": "Smiles", "defaultRatio": "1:1" },
      { "name": "Latam Pass", "defaultRatio": "1:1" },
      { "name": "Azul Fidelidade", "defaultRatio": "1:1" }
    ]
  },
  {
    "name": "Esfera",
    "type": "BANKING",
    "currency": "points",
    "website": "https://www.esfera.com.vc",
    "transferPartners": [
      { "name": "Smiles", "defaultRatio": "1:1" },
      { "name": "Latam Pass", "defaultRatio": "1:1" },
      { "name": "Azul Fidelidade", "defaultRatio": "1:1" },
      { "name": "ConnectMiles", "defaultRatio": "3:1" }
    ]
  },
  {
    "name": "iupp",
    "type": "BANKING",
    "currency": "points",
    "website": "https://www.iupp.com.br"
  },
  {
    "name": "Átomos",
    "type": "BANKING",
    "currency": "points",
    "website": "https://www.c6bank.com.br"
  }
]
```

## Club Tiers

```json
[
  {
    "program": "Smiles",
    "tiers": [
      { "name": "Clube Smiles 1.000", "monthlyPrice": 42.00, "baseMonthlyMiles": 1000, "minimumStayMonths": 6 },
      { "name": "Clube Smiles 2.000", "monthlyPrice": 73.80, "baseMonthlyMiles": 2000, "minimumStayMonths": 6 },
      { "name": "Clube Smiles 5.000", "monthlyPrice": 162.00, "baseMonthlyMiles": 5000, "minimumStayMonths": 6 },
      { "name": "Clube Smiles 7.000", "monthlyPrice": 219.00, "baseMonthlyMiles": 7000, "minimumStayMonths": 6 },
      { "name": "Clube Smiles 10.000", "monthlyPrice": 299.00, "baseMonthlyMiles": 10000, "minimumStayMonths": 6 },
      { "name": "Clube Smiles 20.000", "monthlyPrice": 819.00, "baseMonthlyMiles": 20000, "minimumStayMonths": 10 }
    ]
  },
  {
    "program": "Livelo",
    "tiers": [
      { "name": "Clube Livelo 200", "monthlyPrice": 15.90, "baseMonthlyMiles": 200, "minimumStayMonths": 0 },
      { "name": "Clube Livelo 500", "monthlyPrice": 29.90, "baseMonthlyMiles": 500, "minimumStayMonths": 0 },
      { "name": "Clube Livelo 1.000", "monthlyPrice": 49.90, "baseMonthlyMiles": 1000, "minimumStayMonths": 0 },
      { "name": "Clube Livelo 3.000", "monthlyPrice": 139.90, "baseMonthlyMiles": 3000, "minimumStayMonths": 0 },
      { "name": "Clube Livelo 5.000", "monthlyPrice": 219.90, "baseMonthlyMiles": 5000, "minimumStayMonths": 0 },
      { "name": "Clube Livelo 10.000", "monthlyPrice": 399.90, "baseMonthlyMiles": 10000, "minimumStayMonths": 0 }
    ]
  },
  {
    "program": "Azul Fidelidade",
    "tiers": [
      { "name": "Clube TudoAzul 500", "monthlyPrice": 29.90, "baseMonthlyMiles": 500, "minimumStayMonths": 3 },
      { "name": "Clube TudoAzul 1.000", "monthlyPrice": 49.90, "baseMonthlyMiles": 1000, "minimumStayMonths": 3 },
      { "name": "Clube TudoAzul 3.000", "monthlyPrice": 129.90, "baseMonthlyMiles": 3000, "minimumStayMonths": 3 },
      { "name": "Clube TudoAzul 5.000", "monthlyPrice": 199.90, "baseMonthlyMiles": 5000, "minimumStayMonths": 3 },
      { "name": "Clube TudoAzul 10.000", "monthlyPrice": 379.90, "baseMonthlyMiles": 10000, "minimumStayMonths": 3 }
    ]
  },
  {
    "program": "Esfera",
    "tiers": [
      { "name": "Clube Esfera 500", "monthlyPrice": 24.90, "baseMonthlyMiles": 500, "minimumStayMonths": 0 },
      { "name": "Clube Esfera 1.000", "monthlyPrice": 44.90, "baseMonthlyMiles": 1000, "minimumStayMonths": 0 },
      { "name": "Clube Esfera 3.000", "monthlyPrice": 119.90, "baseMonthlyMiles": 3000, "minimumStayMonths": 0 },
      { "name": "Clube Esfera 5.000", "monthlyPrice": 189.90, "baseMonthlyMiles": 5000, "minimumStayMonths": 0 }
    ]
  },
  {
    "program": "Latam Pass",
    "tiers": [
      { "name": "Clube Latam Pass 500", "monthlyPrice": 34.90, "baseMonthlyMiles": 500, "minimumStayMonths": 3 },
      { "name": "Clube Latam Pass 1.000", "monthlyPrice": 54.90, "baseMonthlyMiles": 1000, "minimumStayMonths": 3 },
      { "name": "Clube Latam Pass 2.500", "monthlyPrice": 119.90, "baseMonthlyMiles": 2500, "minimumStayMonths": 3 },
      { "name": "Clube Latam Pass 5.000", "monthlyPrice": 219.90, "baseMonthlyMiles": 5000, "minimumStayMonths": 3 }
    ]
  }
]
```

## Miles Calendar Events (2026)

```json
[
  { "title": "Semana do Consumidor", "startDate": "2026-03-09", "endDate": "2026-03-15", "programs": ["Smiles", "Azul Fidelidade", "Livelo", "Esfera"], "expectedType": "TRANSFER_BONUS", "historicalNote": "2026: Azul+Livelo up to 133% bonus, Smiles bonus adesão" },
  { "title": "Aniversário Smiles", "startDate": "2026-05-01", "endDate": "2026-05-31", "programs": ["Smiles"], "expectedType": "TRANSFER_BONUS", "historicalNote": "2025: up to 90% bonus transfers" },
  { "title": "Dia dos Namorados", "startDate": "2026-06-08", "endDate": "2026-06-12", "programs": ["Livelo", "Esfera"], "expectedType": "POINT_PURCHASE", "historicalNote": "Shopping bonuses and discount campaigns" },
  { "title": "Aniversário LATAM", "startDate": "2026-06-15", "endDate": "2026-06-30", "programs": ["Latam Pass"], "expectedType": "MIXED", "historicalNote": "Award ticket discounts and transfer bonuses" },
  { "title": "Aniversário Melhores Destinos", "startDate": "2026-07-14", "endDate": "2026-07-20", "programs": ["Smiles", "Latam Pass", "Azul Fidelidade", "Livelo", "Esfera"], "expectedType": "MIXED", "historicalNote": "Week-long promotions across multiple programs" },
  { "title": "Aniversário Clube Livelo", "startDate": "2026-09-01", "endDate": "2026-09-30", "programs": ["Livelo"], "expectedType": "TRANSFER_BONUS", "historicalNote": "2025: 40-50% bonus to partner airlines. BIGGEST month for bonuses." },
  { "title": "Esfera → Iberia Club Promo", "startDate": "2026-09-01", "endDate": "2026-09-30", "programs": ["Esfera"], "expectedType": "TRANSFER_BONUS", "historicalNote": "Considered one of the best annual opportunities for Europe redemptions" },
  { "title": "Aniversário Azul", "startDate": "2026-12-01", "endDate": "2026-12-15", "programs": ["Azul Fidelidade"], "expectedType": "MIXED", "historicalNote": "Note: Azul in judicial recovery, promos may be limited in 2026" },
  { "title": "Black Friday", "startDate": "2026-11-23", "endDate": "2026-11-30", "programs": ["Smiles", "Latam Pass", "Azul Fidelidade", "Livelo", "Esfera"], "expectedType": "MIXED", "historicalNote": "2025: Azul 130% bonus, Smiles 100% bonus, Livelo point discounts. BEST DEALS OF THE YEAR." },
  { "title": "Cyber Monday", "startDate": "2026-11-30", "endDate": "2026-12-01", "programs": ["Livelo", "Esfera"], "expectedType": "POINT_PURCHASE", "historicalNote": "Extended Black Friday deals, new promos may appear" },
  { "title": "Aniversário Caixa", "startDate": "2026-01-10", "endDate": "2026-01-20", "programs": ["Livelo"], "expectedType": "TRANSFER_BONUS", "historicalNote": "Caixa card holders get exclusive bonuses via Livelo" }
]
```

## Scraper Sources Configuration

```json
[
  {
    "name": "Passageiro de Primeira",
    "baseUrl": "https://passageirodeprimeira.com",
    "feedUrl": "https://passageirodeprimeira.com/category/promocoes/",
    "frequency": "30m",
    "selectors": {
      "articleList": "article.post",
      "title": "h2.entry-title a",
      "link": "h2.entry-title a[href]",
      "date": "time.entry-date",
      "excerpt": "div.entry-content p"
    }
  },
  {
    "name": "Melhores Cartões",
    "baseUrl": "https://www.melhorescartoes.com.br",
    "feedUrl": "https://www.melhorescartoes.com.br/category/milhas-e-pontos",
    "frequency": "30m",
    "selectors": {
      "note": "HTML structure needs to be verified during implementation"
    }
  },
  {
    "name": "Pontos Pra Voar",
    "baseUrl": "https://pontospravoar.com",
    "feedUrl": "https://pontospravoar.com/",
    "frequency": "30m",
    "selectors": {
      "note": "HTML structure needs to be verified during implementation"
    }
  },
  {
    "name": "Comparemania",
    "baseUrl": "https://www.comparemania.com.br",
    "feedUrl": "https://www.comparemania.com.br/promocoes-bonificadas",
    "frequency": "60m",
    "selectors": {
      "note": "Structured promo cards — easier to parse"
    }
  }
]
```
