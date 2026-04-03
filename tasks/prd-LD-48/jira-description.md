# LD-48: Add currency conversion display to transfer page

## Context
When users transfer miles between programs, they currently see only the raw miles amounts. They need to see the equivalent monetary value in BRL so they can make informed decisions about whether a transfer is worth the bonus.
## Requirements
- Display the BRL equivalent value next to each miles amount on the transfer page

- Use the current CPM (cost per mile) rate for each program to calculate the value

- Show a comparison: source program value vs destination program value (including any active bonus)

- Highlight when a transfer results in a net positive value (green) or net negative (red)

- The conversion rate should update in real-time as the user changes the miles amount input


## Acceptance Criteria
- Given a user on the transfer page, when they select source and destination programs, then the BRL value per mile is shown for both

- Given an active bonus on the destination program, when the user enters an amount, then the bonus is factored into the destination value

- Given the transfer amount changes, when the user types, then values update within 300ms (debounced)


## Design Notes
Place the BRL values directly below each miles amount in a smaller, muted font. The net value comparison should appear between the two program cards as a badge (green for positive, red for negative, gray for neutral).
## Out of Scope
- Historical CPM charts (separate ticket)

- Multi-currency support (BRL only for now)
