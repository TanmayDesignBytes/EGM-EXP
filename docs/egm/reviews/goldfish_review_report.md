# Goldfish Annotated Review Report

**Status:** resolved  
**Target:** [`design_draft.md`](../design_draft.md) (Technical Plan and Detailed Implementation Plan)

## Prioritized Findings & AI Suggestions

### Issue 1 [egm-codebase-details] - Severity: Major

* **Affected Scope:** Technical Plan file layout and test strategy; Detailed Implementation Plan items `src/persistence/crossTab.ts`, `src/persistence/crossTab.test.ts`, and Vitest configuration.
* **Discrepancy Description:** Vitest is configured for Node while cross-tab behavior depends on a browser `storage` event target. The plan did not say how tests can supply an event target with listener registration/removal.
* **Rationale:** An implementer otherwise needs to choose an unplanned environment or test seam.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** The gap is real and can be closed with a small injectable event-target boundary and a fake target in Node, without a browser simulation framework.
* ***Proposed Edit:***
    * Location: Technical Plan architecture and file layout; Detailed Implementation Plan cross-tab module and test entries.
    * Change: Specify that the subscription accepts a minimal typed event target, the app passes `window`, and tests supply a fake target that records listener registration, fires matching and unrelated key changes/removals, and verifies cleanup.

### Issue 2 [egm-comprehension / egm-zoom-out] - Severity: Nit

* **Affected Scope:** Technical Plan reducer state and transitions; Detailed Implementation Plan `src/app/appReducer.ts` and reducer tests.
* **Discrepancy Description:** Save status values and transition wording were inconsistent: prose listed `saved`, `saving`, and `not-persisted`; the state example also had `idle`; accepted changes were described as both `saving` and `not persisted` before a result.
* **Rationale:** The reducer contract should name its full state set and when each state applies.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** This is a document clarity issue, and the author explicitly requested it be resolved.
* **Proposed Edit:**
    * Location: Technical Plan reducer state/transitions and corresponding Detailed Implementation Plan entries/tests.
    * Change: Define `idle | saving | saved | not-persisted`; use `idle` before initial load, `saved` on successful load/reload/reset, `saving` for a current mutation/retry write, `saved` on matching success, and `not-persisted` on matching failure. Ignore stale revision results.

### Issue 3 [egm-comprehension / egm-zoom-out] - Severity: Nit

* **Affected Scope:** CUJ 5, task filtering description, and filter tests.
* **Discrepancy Description:** The Active filter did not explicitly state that blocked tasks are included.
* **Rationale:** The concepts brief defines Active as every incomplete task, including blocked tasks; the design should say so directly.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** This is a brief-alignment clarity correction requested by the author.
* **Proposed Edit:**
    * Location: CUJ 5 and Technical Plan task/filter rules and filter test description.
    * Change: State that Active includes all active tasks, blocked and unblocked, and its count includes both.

### Issue 4 [egm-style] - Severity: Nit

* **Affected Scope:** Goals, CUJ 8, Cross-tab conflict handling, Alternatives Considered, and Detailed Implementation Plan manual two-tab verification.
* **Discrepancy Description:** Some wording could imply unconditional stale-write prevention even though the design correctly documents a remaining compare/write race.
* **Rationale:** Claims should be limited to changes detected by the storage event or pre-write comparison.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Calibrating wording preserves the approved behavior while stating its limitation accurately.
* **Proposed Edit:**
    * Location: The listed cross-tab references.
    * Change: Say that detected external changes produce a notice and block the corresponding stale write; the approach reduces but cannot eliminate races. Make manual verification assert this detectable scenario rather than all possible interleavings.

## Preserved trade-off

The review also challenged revision tracking for synchronous localStorage operations. This design choice is retained under the author’s explicit instruction. No architecture simplification or additional framework is proposed.

## Not applied

Optional suggestions about reducing implementation-plan detail, repeated adjectives/rationale, and adding a localStorage trust-boundary note were not part of the approved resolution request and are not applied.

## Resolution result

Applied four approved fixes: defined the injectable event-target test boundary for Node, standardized save states and transitions, stated Active-filter membership explicitly, and calibrated cross-tab language to detected changes and the known non-atomic race. Revision-aware reducer behavior was preserved. The four findings in this resolution report were categorized PROPOSE FIX and applied. The separate revision-tracking challenge was retained as an author-approved trade-off. Optional style and security suggestions remain unchanged and are not required for the approved resolution. No M1 or approved Nit remains unaddressed.
