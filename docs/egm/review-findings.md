# Goldfish review findings and dispositions

This document separates the early brainstorm themes from the later five-stage design review. The original reports are retained in [`reviews/`](reviews/); the report chronology matters because the consolidated review predates the approved resolution.

## Initial brainstorm review themes

The concept brief says the first six-lens review identified the following gaps. It does not preserve reviewer names, raw returns, or severities. These are themes recorded by the brief, not reconstructed per-agent findings.

| Theme recorded in the brief | Why it mattered | Clarification in the approved brief | Evidence and disposition |
|---|---|---|---|
| Dependency invariants | Invalid graphs or completion order can make task state contradictory | Multiple prerequisites; existing references; no duplicates, self-links, or cycles; completed tasks require completed prerequisites | Clarified and retained in [`concepts_brief.md`](concepts_brief.md); implemented in `src/domain/tasks.ts` |
| Blocked-task explanations | A user needs to know why a task cannot be completed | Blocked is derived and incomplete prerequisite titles are identified | Clarified and retained; domain tests exercise blocked completion rejection |
| Filter behavior | Blocked tasks could be omitted or treated as a stored status | Active includes all active tasks, blocked and unblocked; counts, hidden count, empty states, and deterministic sorting are defined | Clarified in the brief/design; filter behavior is covered by domain tests |
| Deletion effects | Removing a prerequisite can change dependent tasks' blocked state | Confirm when direct dependents exist, clean their references atomically, report possible unblocking, preserve statuses | Clarified in the brief/design; atomic cleanup is covered by domain tests |
| Centralized validation | Rules repeated in UI paths could diverge | Pure domain layer validates datasets and mutations; UI displays rejection reasons | Clarified in the brief/design and implemented in `src/domain/tasks.ts` |
| Storage failure handling | Treating failures as empty data or losing work could destroy trust/data | Versioned envelope; validation; recovery states; in-memory retention and retry; explicit reset | Clarified in the brief/design and implemented in `src/persistence/taskStorage.ts` and reducer |

No initial-review severity or one-to-one reviewer attribution is available; none is assigned here.

## Five-stage design review

### Stage 5 — Initial Zoom Out

Source: [`zoom_out_report.md`](reviews/zoom_out_report.md).

| Finding | Severity in report | Why it matters | Proposed response | Actual disposition and evidence |
|---|---|---|---|---|
| Detailed implementation inventory may be too specific for a high-level design | Major | Exact files, dependency list, tests, and repeated verification can overconstrain implementation | Shorten the detailed plan | Retained as an optional trade-off because the EGM implementation-readiness workflow called for an actionable enumerated plan and the user approved the 18-file plan. The final design and source preserve that plan. |
| Revision tracking may be unnecessary for synchronous localStorage | Major | Current storage calls are synchronous, so revisions add reducer state and tests without a demonstrated asynchronous save | Reconsider or simplify | Not accepted as a required change. The user explicitly retained revision-aware behavior and stale-result coverage after reset/reload. Evidence: [`design_draft.md`](design_draft.md), reducer tests. |

### Stage 6 — Comprehension

Source: [`comprehension_report.md`](reviews/comprehension_report.md).

| Finding | Severity | Why it matters | Proposed response | Actual disposition and evidence |
|---|---|---|---|---|
| Save-state names and transitions were inconsistent | Nit | An implementer could choose contradictory transitions | Define one union and state when values apply | Accepted. Design and code use `idle`, `saving`, `saved`, `not-persisted`; reducer tests cover success/failure and retry. |
| Active filter membership was unclear | Nit | Blocked tasks might be omitted from Active | Say Active includes all incomplete tasks | Accepted. Brief, design, domain filter, and tests include blocked active tasks. |

### Stage 7 — Critic Review

Source: [`critic_report.md`](reviews/critic_report.md).

| Finding | Severity/status | Why it matters | Proposed response | Actual disposition and evidence |
|---|---|---|---|---|
| Design critic found no evidence-based issue | No Blocker/Major/Nit | Scope, architecture, trade-offs, and behavior aligned with the brief | None | No design change. This is a reviewer result, not proof the design is correct. |
| Structural reviewer objected to “Rejected by author” attribution | Disputed Major | Concern was unsupported attribution | Remove attribution | Not accepted: the report checked the referenced template and concluded author attribution is allowed. The design retained its author-rationale wording. |
| LocalStorage trust boundary was not stated in a named risk section | Potential Nit, optional | localStorage is not encrypted/protected storage | Add a concise security assumption | Not applied as a design change. This research documentation now states that localStorage is not an encryption boundary and warns against sensitive task content; no security feature was added. |
| Some cross-tab wording overstated stale-write prevention | Nit | Compare and write are separate operations and can race | Qualify claims to detected changes and describe the race | Accepted later in the resolution. Design states best-effort detection and non-atomicity; implementation uses storage events plus compare-before-write. |
| Repeated descriptors and alternative rationale | Nit/editorial | Repeated subjective wording reduces precision | Trim repetitions | Optional; no behavior change was made for this. |

### Stage 8 — Intermediate Zoom Out

Source: [`intermediate_zoom_out_report.md`](reviews/intermediate_zoom_out_report.md).

| Finding | Severity in report | Why it matters | Proposed response | Actual disposition and evidence |
|---|---|---|---|---|
| Revision tracking adds complexity to synchronous persistence | Major | Same concern as Stage 5 | Reconsider it | Rejected for this experiment by explicit user choice; retained and tested. |
| Active filter did not explicitly include blocked tasks | Nit | Filter count and membership could be misread | State membership directly | Accepted; design and domain tests make it explicit. |
| Save-state terminology/transitions inconsistent | Nit | State behavior could be implemented inconsistently | Standardize names and transitions | Accepted; see Stage 6 disposition. |
| Implementation plan is detailed; stale-write wording, attribution, security note, editorial repetition | Optional or previously reviewed | Readability and claim calibration | Shorten/calibrate where useful | Detail retained because the user approved it; stale-write wording was resolved; unsupported attribution objection rejected; optional style changes deferred. |

### Stage 9 — Implementation Readiness

Source: [`implementation_readiness_report.md`](reviews/implementation_readiness_report.md).

| Finding | Severity in report | Why it matters | Proposed response | Actual disposition and evidence |
|---|---|---|---|---|
| No event target specified for `storage` listener tests in Vitest Node environment (M1) | Major | Browser listener API was not available in the planned Node test environment | Inject a minimal event-target boundary or add a browser simulator | Accepted. `crossTab.ts` takes a minimal typed target; `crossTab.test.ts` uses a fake target and checks registration, matching/unrelated keys, removals, and cleanup. No browser simulator was added. |
| Save states needed consistent names and transitions | Nit | Same state-contract ambiguity | Standardize state union and lifecycle | Accepted; reducer implementation and tests match the design. |
| Manual cross-tab check implied stronger protection than provided | Nit | LocalStorage does not make read/compare/write atomic | Test the detected conflict case and state the limit | Accepted; design and research docs explicitly state best-effort detection and possible race. |
| Repeated wording | Optional Nit | Editorial consistency | Remove low-information repetition | Deferred; not a behavior defect. |

The report notes Stage 9 reviewers were prompted with the Stage 8 report before it existed. Required Stage 9 materials were available; the optional prior-report context was not.

## Reviewer-by-reviewer record in the available reports

The reports aggregate some feedback by persona rather than preserving complete transcripts. This list records each reviewer execution that the reports identify and does not invent missing comments:

| Stage / reviewer | Recorded contribution |
|---|---|
| Stage 5 — `egm-zoom-out` | Two Major challenges: implementation-plan detail and revision tracking for synchronous storage; found no other issue and no code to reuse. |
| Stage 6 — `egm-comprehension` | Two Nits: save-state terminology/transitions and explicit Active membership. Its paraphrase of architecture indicated the document was understandable to a new reader. |
| Stage 7 — Design Critic | No evidence-based Blocker, Major, or Nit; judged product scope and design aligned with the brief. |
| Stage 7 — Structural Critic | Disputed the alternatives-rejection attribution as a Major, but the report found the template supported author attribution and did not accept the objection. Also suggested a localStorage trust-boundary note as optional. |
| Stage 7 — Style Critic | Nit to qualify stale-write wording; optional Nits on repeated descriptors and repeated alternative rationale. |
| Stage 8 — `egm-zoom-out` | Repeated the revision-tracking simplicity challenge; repeated the Active-filter and save-state Nits; treated implementation detail and editorial repetition as optional; noted stale-write wording could be tightened. |
| Stage 9 — Implementation Readiness reviewer | Nit on save-state definition; otherwise found the plan actionable. Suggested optionally testing stale results after a pending save attempt followed by reset/reload. |
| Stage 9 — Codebase Details reviewer | Major M1: the Node-based test plan did not specify an event target for the browser storage listener. No reuse or codebase drift was found because the app was still a design. |
| Stage 9 — Style reviewer | Nit to scope cross-tab claims to detected changes; optional Nit on repeated subjective wording. |

The initial brainstorm's individual Goldfish identities and comments are not retained. The concept brief only summarizes the concern themes, so no reviewer-by-reviewer reconstruction is possible for that phase.

## Resolution chronology

[`consolidated_review_report.md`](reviews/consolidated_review_report.md) is the **pre-resolution** five-stage snapshot. It says M1 and Nits remain and that no design edits had been applied at the time it was written. The user then approved resolving M1 and the relevant Nits while explicitly retaining revision tracking. [`goldfish_review_report.md`](reviews/goldfish_review_report.md) is the **later resolution report** and records four approved fixes:

1. A minimal injectable event target for Node tests.
2. Standardized save-state terminology and transitions.
3. Explicit Active membership for blocked and unblocked active tasks.
4. Best-effort wording for storage-event and compare-before-write conflict detection.

The report says the four proposed fixes were applied and no approved M1/Nit remained. This is the final disposition; the earlier consolidated report is preserved as historical evidence.

## Review limits

- The review reports record fresh native subagents, but the host could not prove complete isolation from project/user instruction files or shared environment state.
- The first brainstorm’s individual reviewer outputs are not in the repository; only the concept brief’s summary themes remain.
- Review findings are suggestions. Their presence does not establish a defect, and their absence does not establish correctness.
