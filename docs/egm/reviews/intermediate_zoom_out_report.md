# Stage 8: Intermediate Zoom Out Review

**Target:** Complete [`design_draft.md`](../design_draft.md)  
**Reviewer:** `egm-zoom-out` (fresh subagent context)  
**Context:** [`concepts_brief.md`](../concepts_brief.md), Stage 5/6/7 reports, Zoom-Out Standard

## Findings

### Major — Revision tracking may be unnecessary for synchronous localStorage

**Scope:** Technical Plan reducer revisions and save-result handling.

The design uses task and persisted revisions, tags save results, ignores old results, and tests results after reload/reset, but the described persistence calls are synchronous and no asynchronous save path is specified. The reviewer considers this speculative race protection that adds reducer state and test work. This repeats Stage 5. The user has explicitly approved this behavior and requested its tests; retain it unless the author chooses to revisit that trade-off.

### Nit — Active filter membership is not explicit

**Scope:** CUJ 5.

CUJ 5 names the Active filter but does not state that it includes all incomplete tasks, including blocked tasks. The brief does. Add that direct statement to remove ambiguity.

### Nit — Save-state values and timing are inconsistent

**Scope:** Reducer state example and save transitions.

The prose lists `saved`, `saving`, and `not-persisted`, while the state example also has `idle`; transitions describe accepted changes as both saving and not persisted. Specify the exact union and when each value applies.

## Prior findings and dispositions

* Stage 5's implementation-detail concern remains an optional concision issue. The EGM drafting workflow explicitly calls for an actionable implementation plan with enumerated files, so retaining detail is defensible.
* Stage 7's stale-write phrasing is mostly mitigated by best-effort wording and the documented race. The Goals bullet can still be calibrated to say detected stale writes are refused.
* Stage 7's alternatives-attribution objection is not supported: the standard restricts unsupported maintainer attribution, while the document says “Rejected by author,” which the template permits.
* A concise localStorage trust-boundary note remains optional; no security feature is needed.
* Repeated subjective descriptors/rationales remain optional editorial cleanup.

## Reuse check

Workspace search found design and review documents but no application code or task/persistence utilities to reuse.
