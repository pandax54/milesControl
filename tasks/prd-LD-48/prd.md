# Product Requirements Document: Currency Conversion Display on Transfer Page

## Overview

When users transfer miles between loyalty programs, they currently see only raw miles amounts with no monetary context. This makes it difficult to evaluate whether a transfer — especially one with a bonus promotion — is financially worthwhile.

This feature adds BRL (Brazilian Real) equivalent values alongside miles amounts in both the **Transfer Form Dialog** and the **Transfer History Table**. By surfacing the user's historical cost-per-mile (CPM) for each program, users can instantly see the monetary value they are giving up versus what they are receiving, enabling informed transfer decisions.

## Objectives

- **Informed decision-making**: Users can evaluate the monetary trade-off of every transfer before confirming it.
- **Transfer visibility**: Past transfers in the history table display their BRL value at a glance, reducing the need for manual calculations.
- **Promotion awareness**: Active promotions are auto-detected and factored into the destination value, making bonus impact immediately visible.
- **Key metric**: Increase in user engagement with the transfer feature (measured by transfer page views and completed transfers).

## User Stories

- **US-1**: As a miles holder, I want to see the BRL equivalent of the miles I am transferring so that I can understand the monetary cost of the transfer.
- **US-2**: As a miles holder, I want to see the BRL equivalent of the miles I will receive (including any bonus) so that I can understand the monetary value I am gaining.
- **US-3**: As a miles holder, I want to see a net value badge (positive, negative, or neutral) so that I can quickly judge whether a transfer is worth it.
- **US-4**: As a miles holder, I want the BRL values to update in real-time as I type the miles amount so that I get immediate feedback.
- **US-5**: As a miles holder, I want active promotions to be auto-detected and pre-filled so that the conversion reflects the actual bonus I will receive.
- **US-6**: As a miles holder, I want to see BRL values on my past transfers in the history table so that I can review the value of previous transfers without manual calculation.
- **US-7**: As a miles holder, when a program has no CPM history, I want to see a clear "no data" indicator so that I understand why the conversion is unavailable rather than thinking the feature is broken.

## Core Features

### Feature 1: BRL Value Display in Transfer Form Dialog

Display the BRL equivalent value below each miles amount (source and destination) in the transfer form.

**Why it is important**: This is the primary decision point — users need monetary context before confirming a transfer.

**How it works**: When the user selects source and destination programs and enters a miles amount, the system calculates BRL values using each program's user-average CPM and displays them in real-time.

**Functional Requirements**:

1. **FR-1**: The system SHALL display the BRL equivalent value below the source miles amount, calculated as `source miles × source program average CPM / 1000`.
2. **FR-2**: The system SHALL display the BRL equivalent value below the destination miles amount (including bonus), calculated as `received miles × destination program average CPM / 1000`.
3. **FR-3**: The BRL values SHALL update within 300ms of the user changing the miles amount input (debounced).
4. **FR-4**: BRL values SHALL be displayed in a smaller, muted font directly below their corresponding miles amount.
5. **FR-5**: When a program has no CPM history (average CPM is null), the system SHALL display a "no data" placeholder instead of a BRL value.
6. **FR-5.1**: When CPM data is unavailable, the system SHOULD display a tooltip or helper text encouraging the user to make transfers to establish CPM history.

### Feature 2: Net Value Comparison Badge

Display a badge between the source and destination program cards indicating the net value of the transfer.

**Why it is important**: A single visual indicator lets users instantly assess transfer value without comparing two numbers.

**How it works**: The system computes the difference between destination BRL value and source BRL value, then displays a color-coded badge.

**Functional Requirements**:

7. **FR-6**: The system SHALL display a net value badge between the two program cards showing the BRL difference (`destination BRL value − source BRL value`).
8. **FR-7**: The badge SHALL be colored **green** when the net value is positive (difference > +5%).
9. **FR-8**: The badge SHALL be colored **red** when the net value is negative (difference < −5%).
10. **FR-9**: The badge SHALL be colored **gray** when the net value is neutral (difference within ±5%).
11. **FR-10**: If either program lacks CPM data, the net value badge SHALL NOT be displayed.

### Feature 3: Auto-Detection of Active Promotions

Automatically detect active promotions for the destination program and pre-fill the bonus percentage.

**Why it is important**: Reduces manual input and ensures the conversion calculation reflects the actual bonus the user will receive.

**Functional Requirements**:

12. **FR-11**: When the user selects a destination program, the system SHALL query for active promotions and pre-fill the bonus percentage field if an active promotion exists.
13. **FR-12**: The user SHALL be able to manually override the pre-filled bonus percentage.
14. **FR-13**: The destination BRL value calculation SHALL always use the current bonus percentage (whether auto-filled or manually entered).

### Feature 4: BRL Values in Transfer History Table

Display the BRL equivalent values for past transfers in the transfer history table.

**Why it is important**: Allows users to review the monetary value of historical transfers without manual calculation.

**Functional Requirements**:

15. **FR-14**: Each row in the transfer history table SHALL display the BRL equivalent of the source miles sent.
16. **FR-15**: Each row in the transfer history table SHALL display the BRL equivalent of the destination miles received.
17. **FR-16**: Each row SHALL display the net value badge (green/red/gray) based on the same ±5% threshold logic.
18. **FR-17**: For historical transfers, BRL values SHALL be calculated using the programs' current average CPM (not a historical snapshot).
19. **FR-18**: If a program's CPM data is unavailable, the BRL value column SHALL display a "no data" placeholder.

## User Experience

### Transfer Form Dialog

- BRL values appear in a **smaller, muted font** directly below each miles amount field.
- The net value badge appears **between the two program cards** as a colored badge (green/red/gray).
- Values update responsively as the user types (300ms debounce).
- When a promotion is auto-detected, the bonus field is pre-filled but remains editable.
- "No data" placeholders are non-intrusive and include a brief explanation.

### Transfer History Table

- BRL values are displayed as additional information within each transfer row.
- Net value badges provide at-a-glance assessment of each historical transfer.
- Layout remains consistent with the form dialog's visual treatment.

### Accessibility

- Color-coded badges must not rely solely on color — include text labels or icons for accessibility (e.g., "+R$12.50" in green, "−R$8.00" in red).
- BRL values should be readable by screen readers with appropriate ARIA labels.

## High-Level Technical Constraints

- **Data dependency**: The feature depends on `getUserAverageCostPerMilheiro()` returning a valid CPM for each program. Programs with no transfer history will return null and must be handled gracefully.
- **Performance**: Debounced input handling (300ms) is required to avoid excessive recalculations during typing.
- **Currency**: BRL only — no multi-currency support in this iteration.
- **Existing model**: No schema changes required. The feature uses existing transfer and program data with the existing CPM calculation.
- **Promotion query**: Active promotion detection requires querying the Promotion model filtered by destination program and current date.

## Out of Scope

- **Historical CPM charts** — tracked in a separate ticket.
- **Multi-currency support** — BRL only for this iteration.
- **Market/reference CPM rates** — only user's historical average CPM is used.
- **CPM snapshots** — historical transfers use current average CPM, not the CPM at the time of transfer.
- **New data entry flows** — no manual CPM configuration by users.

## Open Questions

- **OQ-1**: When multiple active promotions exist for the same destination program, which one should be pre-filled? (Suggestion: use the highest bonus percentage, or show a selector if multiple are active.)
  ** asnwer** We should implement the logic to pre-fill the promotion with the highest bonus percentage when multiple active promotions exist for the same destination program. This approach ensures that users are presented with the most advantageous option without overwhelming them with choices. If there are multiple promotions, we can also consider adding a tooltip or an info icon next to the bonus field that allows users to view details about all active promotions for that program, providing transparency without complicating the initial input process.
- **OQ-2**: Should the transfer history table BRL values be sortable/filterable?
- **response**
  While adding sorting/filtering capabilities to the transfer history table for BRL values could enhance usability, it may also add complexity to the initial implementation. For this iteration, we should focus on displaying the BRL values without sorting/filtering functionality. We can gather user feedback after launch to determine if sorting/filtering is a desired feature for future iterations, allowing us to prioritize based on actual user needs and behavior.
- **OQ-3**: Should the "no data" tooltip link to a help article or documentation about CPM?
  **response** Yes, the "no data" tooltip should link to a help article or documentation about CPM. This will provide users with additional context and information about what CPM is, why it matters, and how they can establish a CPM history through transfers. Providing this educational resource can help users understand the feature better and encourage them to engage more with the transfer functionality to build their CPM history.
