# Consolidated EGM Goldfish Review

**Target:** [`design_draft.md`](../design_draft.md)  
**Approved context:** [`concepts_brief.md`](../concepts_brief.md)  
**Mode:** Consolidated report, all five review stages  
**Review status:** Complete; no design edits applied

## Overall result

No Blocker findings were reported. One actionable Major implementation-readiness issue remains: the plan does not specify how browser storage-event listeners will be exercised by tests configured for the Node environment. Several Nit-level clarity issues should be corrected before implementation. Reviewers also challenged revision tracking as unnecessary for synchronous localStorage; that is a real simplicity trade-off, but it conflicts with an explicitly approved design decision and is not accepted as a required change in this review.

No application code was implemented. `design_draft.md` was not modified during review.

## Consolidated findings by severity

### Major

#### M1. Cross-tab tests lack a specified event target under Node

**Evidence:** The Technical Plan configures Vitest to use Node. `crossTab.ts` subscribes to the browser `storage` event, and `crossTab.test.ts` is expected to verify event handling and cleanup. The plan does not specify how those tests provide `addEventListener` / `removeEventListener`.

**Why it matters:** An implementer must choose an unstated browser-event testing strategy. This conflicts with the implementation-readiness standard’s zero-decision rule.

**Recommended correction:** Specify either a small injectable event-target interface for the cross-tab subscription and test it with a fake, or a test environment/setup that provides `window`. State the assertions for matching-key changes/removals, unrelated keys, and listener cleanup. Keep this test seam local; no new framework is needed.

**Source:** Stage 9 Codebase Details.

### Nit

#### N1. Save-state names and transitions conflict

**Evidence:** The prose uses `saved`, `saving`, and `not-persisted`; the `AppState` union also includes `idle`. Accepted mutations are described as entering both `saving` and `not persisted` before persistence results.

**Recommended correction:** Choose and define one union, including initial load, accepted mutation, successful save, and failed save transitions. One simple option is `idle | saving | saved | not-persisted`; another is to initialize the app in `saved` after a successful initial load and omit `idle`. Make the selected behavior consistent across Technical and Detailed Plans.

**Sources:** Stages 6, 8, and 9.

#### N2. Active filter should explicitly include blocked tasks

**Evidence:** CUJ 5 names All, Active, and Completed but does not define Active membership. The approved brief says Active includes all incomplete tasks, including blocked tasks.

**Recommended correction:** State that the Active filter includes every active task, including blocked tasks, and that its count includes those blocked tasks.

**Sources:** Stages 6 and 8.

#### N3. Calibrate stale-write claims to the documented best-effort behavior

**Evidence:** The Goals and manual cross-tab verification use broad wording about preventing stale overwrites. The architecture correctly explains that compare and write are separate operations and can race.

**Recommended correction:** Say that detected changes block the corresponding stale write and that the design reduces, but cannot eliminate, stale-write races. Make the manual check assert this detectable case rather than guarantee all interleavings.

**Sources:** Stage 7 Style and Stage 9 Style.

## Reviewer challenges and optional improvements

### Revision tracking for synchronous localStorage

Stage 5 and Stage 8 rated revision tracking a Major simplicity concern: the plan describes synchronous localStorage calls, not a delayed asynchronous save, so task revisions, persisted revisions, and stale-result tests may be extra machinery. The detailed plan covers the scenario thoroughly and the author explicitly approved revision-aware reset/reload protection and tests. **Recommendation:** retain the approved mechanism unless the author wants to simplify it; do not remove it automatically. If retained, keep the guards pure and minimal as currently designed.

### Level of implementation detail

Stage 5 raised a Major concern that the 18-file inventory and test catalog pull the design into implementation weeds and repeat verification details. Stage 8 treated this as optional because the official drafting workflow requires a detailed, enumerated implementation plan. **Recommendation:** no required change. The current detail is useful for a small scaffold-from-scratch experiment, though duplicated test/verification wording can be shortened later.

### LocalStorage security note

Stage 7 Structural suggested a short note that localStorage is not encrypted or an isolation boundary. The standard asks for security implications where applicable. This is a useful assumption to make explicit if task content may be sensitive; it does not justify adding encryption, authentication, or another feature. The reviewer’s other alternatives-attribution finding was not accepted: the document says “Rejected by author,” which the template permits; the standard prohibits unsupported maintainer attribution.

### Editorial cleanup

Stage 7 and Stage 9 Style noted repeated evaluative words such as “small” and “predictable” and some repeated rationale in Alternatives Considered. These are optional concision changes, not behavior or readiness defects.

## Stage-by-stage review

### Stage 5 — Initial Zoom Out

Evaluated objective, root-problem fit, scope, simplicity, reuse, and premature detail across the whole document. Found no code or utilities to reuse. Raised the detail-level and revision-tracking challenges described above. Found core task, recovery, and cross-tab behavior aligned with the brief.

### Stage 6 — Comprehension

The reviewer paraphrased the product and data flow successfully, showing the design can be understood without prior conversation. Found the save-state inconsistency and Active-filter ambiguity (N1 and N2).

### Stage 7 — Critic Review

The Design Critic found no evidence-based findings and judged the feature scope aligned with the brief. The Structural Critic found no hierarchy or Markdown defects; its author-attribution concern was rejected because the template allows author rationale. Its suggestion to make localStorage security assumptions explicit is retained as optional. The Style Critic raised stale-write wording and concision concerns (N3 and optional editorial cleanup).

### Stage 8 — Intermediate Zoom Out

Rechecked whether prior issues were addressed and examined high-level simplicity. Confirmed N1 and N2 remain. Repeated the revision-tracking challenge. Found cross-tab limits mostly calibrated, with one goal/manual-check phrasing improvement (N3). Treated implementation-plan length and repeated prose as optional.

### Stage 9 — Implementation Readiness

Checked file boundaries, module responsibilities, implementation sequence, edge cases, and testability. Found M1 because Node-based cross-tab tests have no specified browser event target. Repeated N1; the Style reviewer raised N3 and optional wording cleanup. The workspace has no source implementation, consistent with the proposal to create the 18 files.

## Requirements and scope audit

The review found no contradiction with the concepts brief in dependency completion, completed-task editing, reopening restrictions, cycle prevention, atomic deletion/reference cleanup, task filters and sorting, versioned localStorage recovery, save retry, or best-effort cross-tab conflict handling. No backend, authentication, merge, migration, or unrelated task features were introduced.

## Reviewer independence and execution limits

All nine reviewer executions were dispatched as separate native subagents with `fork_turns: "none"`: one each for Stages 5, 6, and 8, plus three independent reviewers at Stages 7 and 9. Each completed and returned a report. Stage 6 received only the design document, as prescribed; other stages received the concepts brief as review context.

The host cannot prove that project-level instruction files were excluded from fresh contexts; the EGM Codex integration documentation identifies that limitation. Stage 9 reviewers were also told to read the Stage 8 report before that report had been written. The official Stage 9 inputs (target, brief, personas, and standard) were available, but the optional prior-report context was not. The Stage 9 findings are completed; this context-order limitation is disclosed rather than treated as a clean read of that report.

## Approval gate

No findings have been applied to `design_draft.md`. The author should decide whether to address M1 and the Nit findings, and whether to retain the already-approved revision guards and implementation detail, before any design changes are made.
