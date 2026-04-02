# Implementation Tasks for Currency Conversion Display on Transfer Page (LD-48)

## Overview

Add BRL (Brazilian Real) equivalent values alongside miles amounts in both the Transfer Form Dialog and the Transfer History Table. This enables users to evaluate the monetary trade-off of every transfer using their historical cost-per-mile (CPM).

## Task List

### Phase 1: Foundation

- [x] 1.0 Create `getTransferConversionData` server action
- [ ] 2.0 Create `NetValueBadge` component

### Phase 2: Core Implementation

- [ ] 3.0 Create `useTransferConversion` hook
- [ ] 4.0 Integrate BRL display and net value badge into Transfer Form Dialog
- [ ] 5.0 Add promotion auto-detection and bonus pre-fill to Transfer Form Dialog

### Phase 3: Integration

- [ ] 6.0 Add BRL values and net value badges to Transfer History Table

## Dependency Graph

```
1.0 ──→ 3.0 ──→ 4.0 ──→ 5.0
                  ↑
2.0 ─────────────┘

1.0 + 2.0 ──→ 6.0
```

**Parallel tasks:** 1.0 and 2.0 can be built in parallel.
**Sequential:** 3.0 depends on 1.0. 4.0 depends on 2.0 and 3.0. 5.0 depends on 4.0. 6.0 depends on 1.0 and 2.0.
