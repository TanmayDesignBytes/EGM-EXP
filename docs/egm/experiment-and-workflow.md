# Experiment objectives and chronological workflow

## Experiment objective

The project tested whether a deliberately small local task manager could make prerequisite workflows explicit while keeping task rules, persistence failures, and concurrent-tab changes understandable. The task manager was a useful EGM test case because completion, reopening, deletion, filtering, and persistence interact through a dependency graph. The brief intentionally excluded a backend, authentication, search, priorities, due dates, categories, automatic merging, and migrations.

This is a single project case study, not a controlled comparison against direct agent coding. No matched baseline, repeated samples, time tracking, token accounting, or defect-rate measurement was recorded.

## Phase record

| Phase | Objective and inputs | Workflow used | Output and outcome |
|---|---|---|---|
| 1. Clarification | Turn the initial task-manager idea into explicit user behavior and boundaries | EGM brainstorm skill; multi-turn questions and human responses | Agreed dependency semantics, task fields, filters, local-only storage, recovery, and later cross-tab constraints |
| 2. Initial Goldfish ideation | Challenge the anchored hypothesis before formal design | Fresh-context multi-lens review, as summarized in the concept brief | The brief records six concern themes; individual raw reviewer reports and a per-reviewer mapping are absent |
| 3. Concept brief | Preserve the agreed hypothesis, analysis, goals, non-goals, alternatives, and decisions | Brainstorm synthesis followed by human review and clarification | [`concepts_brief.md`](concepts_brief.md), dated 2026-11-03 |
| 4. Design drafting | Make the approved behavior implementable without changing scope | EGM draft skill; section-by-section review and human approval | [`design_draft.md`](design_draft.md), dated 2026-11-03, with Technical Plan, Alternatives, CUJs, Open Questions, and an 18-file implementation plan |
| 5. Five-stage Goldfish review | Check completeness, clarity, design quality, and implementation readiness | EGM review skill; independent fresh-context reviewers | Five stage reports plus a consolidated report; initial reports preserved under [`reviews/`](reviews/) |
| 6. Resolution | Decide which findings should change the approved design | EGM resolution workflow and explicit human selections | [`goldfish_review_report.md`](reviews/goldfish_review_report.md) records the approved fixes and retained trade-off |
| 7. Implementation | Build the approved design, keeping I/O out of the reducer and task rules centralized | Normal Codex implementation from the approved design | 18 planned project files, including app source and four Vitest suites; no backend or state library |
| 8. Automated verification | Recheck implementation behavior, types, build output, and dependencies | `npm test`, `npm run build`, `npm audit` | Latest run: 19 passing tests, successful type check/build, zero audit vulnerabilities |
| 9. Manual browser evidence | Confirm real browser storage, UI, accessibility, responsiveness, and cross-tab behavior | Local Vite server and attempted browser access | Incomplete. The server started, but the browser access host was unavailable. One checkbox behavior was reported by the user and traced in code; no screenshot or full manual results were saved |

## What happened in clarification and ideation

The initial concept was a React + TypeScript task manager. The user then made these product decisions explicit:

1. Tasks can have multiple prerequisites; blocked completion is rejected with prerequisite names; self-links and cycles are rejected; deleting a prerequisite cleans direct references; reopening a prerequisite with completed dependents is rejected.
2. Completed tasks can have details edited without reopening. Dependency changes on completed tasks must use completed prerequisites. Failed validation leaves data and status unchanged.
3. The task schema stays limited to ID, title, optional description, status, dependencies, and timestamps. Blocked state is derived. All/Active/Completed filters have counts, hidden-task messaging, empty states, and deterministic sorting.
4. Persistence uses one `schemaVersion: 1` envelope, full-dataset validation, no migrations, and explicit recovery for malformed, incompatible, unavailable, and failed-save conditions.
5. Deletion with direct dependents requires a confirmation explaining cleanup and possible unblocking; cancellation changes nothing.
6. Cross-tab awareness uses storage events and a pre-write comparison, with an explicit reload action and unsaved-change warning. No merge or guarantee of atomicity is claimed.

The brief summarizes the first Goldfish pass as identifying gaps in dependency invariants, blocked explanations, filtering, deletion effects, centralized validation, and storage-failure handling. It does not include individual reviewer prompts, exact per-reviewer returns, or severity labels for these themes. This repository therefore does not map each theme to a named reviewer or claim six independent findings one-to-one.

The brief also records a later cross-tab overwrite concern, which led to the conflict-awareness scope. That decision is documented in the brief; the underlying raw reviewer output is not preserved.

## Design drafting and human checkpoints

Drafting proceeded in approved sections rather than one unreviewed document dump:

- Overview, Problem, Goals, and Non-Goals were shown in full and approved.
- The Technical Plan was presented and revised in response to user-selected `useReducer` coordination, explicit state/actions, revision-aware save results, storage access exceptions, centralized graph validation, and a reconciled 18-file inventory.
- Alternatives Considered was approved with four comparisons: `useReducer` vs. separate `useState`, domain validation vs. UI validation, localStorage vs. backend, and conflict detection/reload vs. automatic synchronization.
- The Detailed Implementation Plan was reviewed, revised for reset/reload revision invalidation and deterministic sort order, and approved.
- CUJs and Open Questions were added from the approved source documents. The final check found all required sections and no remaining design decisions.
- The user then authorized independent Goldfish review, later approved the resolution report, and separately approved implementation.

The approval trail exists in the project conversation, not as a separate signed approval artifact. The corresponding approved product/design decisions are retained in the brief and design document.

## Review execution and chronology

The review covered five ordered stages:

| Stage | Purpose | Artifact |
|---|---|---|
| 5 — Initial Zoom Out | Reassess problem fit, scope, simplicity, and premature detail | [`zoom_out_report.md`](reviews/zoom_out_report.md) |
| 6 — Comprehension | Test whether a reader can explain the design without the prior conversation | [`comprehension_report.md`](reviews/comprehension_report.md) |
| 7 — Critic Review | Examine design decisions, document structure, and wording | [`critic_report.md`](reviews/critic_report.md) |
| 8 — Intermediate Zoom Out | Recheck the changed design and repeated issues | [`intermediate_zoom_out_report.md`](reviews/intermediate_zoom_out_report.md) |
| 9 — Implementation Readiness | Check whether modules, steps, tests, and failure cases are implementable | [`implementation_readiness_report.md`](reviews/implementation_readiness_report.md) |

The process also produced [`consolidated_review_report.md`](reviews/consolidated_review_report.md), a pre-resolution snapshot, and [`goldfish_review_report.md`](reviews/goldfish_review_report.md), the later resolution record. They intentionally differ: the consolidated report says M1 and Nits remain because it was written before the user's approved fixes. The annotated report records those fixes as applied. Both are retained to preserve chronology.

The consolidated report records nine fresh-context reviewer executions across Stages 5–9: one each in Stages 5, 6, and 8, and three each in Stages 7 and 9. It also records limitations: the host could not prove project instructions were excluded from fresh contexts, and Stage 9 reviewers were prompted with the Stage 8 report before that optional report had been written. The required Stage 9 target, brief, personas, and standard were available.

## Implementation and follow-up

The user approved implementation against the 18-file plan. The first dependency installation exposed three advisories in the initially selected Vitest toolchain. Vitest was upgraded within the same planned dependency category; the subsequent installation and final audit reported zero vulnerabilities. No new framework was introduced.

The development server later started at `http://127.0.0.1:5173/` for manual verification. The available browser host reported that it was unavailable. The user subsequently reported a prerequisite checkbox becoming unchecked after refresh. Code tracing found that the New Task form owns an unsaved local draft and clears its selected dependencies after successful creation; the edit form initializes from the saved task's dependency IDs. No live browser storage was available to confirm the user's particular sequence, so this remains a user-reported observation rather than a confirmed manual pass or confirmed persistence defect.

See [Implementation and verification](implementation-and-verification.md) and the [evidence index](../evidence/README.md) for current automated results and missing browser artifacts.
