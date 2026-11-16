# Stage 9: Implementation Readiness Test

**Target range:** Detailed Implementation Plan, [`design_draft.md`](../design_draft.md) lines 257–372  
**Context:** [`concepts_brief.md`](../concepts_brief.md); Implementation Readiness Standard

## Implementation Readiness reviewer

### Nit — Save-state type and transitions are inconsistent

The Technical Plan defines `saved | saving | not-persisted`, while the `AppState` example also includes `idle`. The implementation plan points back to the action union without defining the initial or load-success save state. Choose one union and say when each value applies.

The reviewer otherwise found the 18-file inventory, module boundaries, revision guards, storage behavior, cross-tab limitation, and test/manual plan actionable. It found no Blocker or Major issue. An optional suggestion was to assert stale save results after a pending save attempt following reset/reload.

## Codebase Details reviewer

### Major — Node environment does not specify a cross-tab event test target

**Scope:** `src/persistence/crossTab.test.ts`, `vite.config.ts`, and the event subscription in `src/persistence/crossTab.ts`.

Vitest is configured for Node, but the cross-tab helper listens to the browser `storage` event. The plan specifies a fake `Storage` object for persistence tests, but not how cross-tab tests access an event target with `addEventListener` and `removeEventListener`. The plan should specify either a minimal injectable event target contract or a test environment/setup that provides those methods, plus assertions for registration, relevant-key events, unrelated-key events, and cleanup.

No current-code drift or reuse opportunity was found: the workspace has no application source or scaffold, and proposed files are marked Create. The reviewer found no other Blocker/Major issue.

## Style reviewer

### Nit — Manual cross-tab verification wording overstates the guarantee

The manual check says the stale tab “does not silently overwrite” newer data, while the design documents a remaining compare/write race. Calibrate the check to verify that detected changes produce a notice and block the corresponding stale write, while preserving the documented limitation.

### Nit — Repeated subjective descriptors

Repeated uses of “small” and “predictable” are low-information and can be removed where they do not identify a concrete constraint. This is an optional editorial improvement.

The reviewer found no Blocker or Major style issue and no new revision-behavior contradiction in the detailed range.

## Execution note

The Stage 9 reviewer prompts included the Stage 8 report before `intermediate_zoom_out_report.md` had been written; the reviewers could not read that optional prior report. The official Stage 9 inputs—the target, concepts brief, personas, and implementation-readiness standard—were available. The Stage 8 results are represented separately in that report and in the consolidated report.
