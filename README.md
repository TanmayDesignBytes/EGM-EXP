# EGM-EXP: An Elephant–Goldfish Model Case Study

This repository records a design-first AI-agent experiment: we used the Elephant–Goldfish Model (EGM) workflow to specify, independently review, and build a local task manager with prerequisite dependencies. It includes the application, the original EGM brief and design, review reports, and an evidence index.

**Research question:** What does an EGM-style workflow surface and change in one software project? This case study documents one experiment. It does not compare EGM with ordinary agent coding under controlled conditions, so it cannot establish that EGM is faster, cheaper, more accurate, or generally superior.

## Start here

| Document | What it covers |
|---|---|
| [EGM fundamentals and Codex integration](docs/egm/fundamentals-and-codex.md) | EGM terms, roles, fresh-context review, Codex skill integration, and what installation evidence is missing |
| [Experiment and workflow](docs/egm/experiment-and-workflow.md) | The chosen task-manager experiment and the chronological phase-by-phase record |
| [Goldfish findings and dispositions](docs/egm/review-findings.md) | Initial brainstorm themes, all five design-review stages, severity, evidence, and final disposition |
| [Implementation and verification](docs/egm/implementation-and-verification.md) | Implemented architecture, planned files, tests, build, audit, and manual-check status |
| [Evaluation and lessons](docs/egm/evaluation.md) | Benefits, costs, limits, suitable use cases, and evidence-bounded conclusions |
| [Claim-to-evidence map](docs/egm/evidence-map.md) | The source artifact or execution record behind each major claim |
| [Screenshot evidence index](docs/evidence/README.md) | Four saved browser captures and two terminal captures marked blocked |

## What EGM is

EGM is the Elephant–Goldfish Model, a spec-driven development workflow distributed as a plugin for AI coding environments. In the metaphor, the Elephant is the drafting assistant that carries project context; Goldfish reviewers read the written plan in fresh conversation contexts; the human chooses which findings to accept and approves the design before implementation. A fresh review is a way to challenge assumptions, not proof of correctness. See the [EGM fundamentals](docs/egm/fundamentals-and-codex.md) and [upstream EGM project](https://github.com/google/elephant-goldfish-model).

## What this experiment built

The app is a React + TypeScript + Vite task manager. Tasks can have multiple prerequisites. Blocked state is derived from incomplete prerequisites; domain functions enforce completion, reopening, cycle, and deletion rules. The app stores a versioned dataset in one browser’s localStorage and provides recovery and best-effort cross-tab conflict awareness.

The design and final implementation use one reducer, pure domain functions, separate persistence helpers, and a minimal injectable storage-event target. The full decision record and file map are in [Implementation and verification](docs/egm/implementation-and-verification.md).

## EGM workflow at a glance

1. **Brainstorm:** clarify the idea and boundaries; produce `concepts_brief.md`.
2. **Draft:** write and approve a technical design section by section; produce `design_draft.md`.
3. **Goldfish review:** run five review stages with fresh contexts; preserve each report.
4. **Resolve:** human-select findings to address; record accepted fixes and retained trade-offs.
5. **Implement:** build the approved design and run unit tests, type checking, build, and dependency audit.
6. **Browser evidence:** scoped Chrome captures show the README artifact map, the M1 finding, its resolution, and the Task Manager with synthetic blocked work. Terminal screenshots remain blocked; see the [evidence index](docs/evidence/README.md). The app interaction is a limited smoke check, not a complete manual verification pass.

The chronological account, approvals, and missing records are described in [Experiment and workflow](docs/egm/experiment-and-workflow.md).

## Goldfish findings

The initial review summary in the concept brief records concerns about dependency invariants, blocked-task explanations, filtering, deletion effects, centralized validation, and storage failures. The later five-stage design review identified a Major testability gap for storage-event subscriptions in Vitest’s Node environment, plus clarity issues around save states, Active-filter membership, and cross-tab guarantees. The user approved a small event-target seam and the clarity fixes; revision tracking was retained as an explicit trade-off. The consolidated report is the pre-resolution snapshot; the later annotated report records the resolution. Details and evidence are in [Goldfish findings and dispositions](docs/egm/review-findings.md).

## Verification snapshot

On the latest recorded run for this documentation pass:

- `npm test`: 4 test files, 19 tests passed.
- `npm run build`: TypeScript checking and the Vite production build passed.
- `npm audit`: zero vulnerabilities.
- Manual browser scenarios: **not confirmed complete**. The synthetic `Design UI` and dependent `Build UI` tasks were created through the app form in an isolated Chrome session; the rendered page showed Build UI as blocked. Other scenarios remain unverified. Four scoped browser screenshots are saved; terminal screenshots are marked blocked.

These results are evidence for this project’s checks only. They are not a comparative evaluation of EGM. See [Implementation and verification](docs/egm/implementation-and-verification.md) for coverage and caveats.

## Run the app

Use Node.js and npm, then run:

```sh
npm ci
npm run dev
```

Run the automated checks with:

```sh
npm test
npm run build
npm audit
```

Task data stays in browser localStorage; there is no backend or authentication. localStorage is not an encryption boundary, and the cross-tab compare-before-write check is not atomic. Do not use sensitive task text. The experiment’s approved scope and known limits are in the [concept brief](docs/egm/concepts_brief.md) and [evaluation](docs/egm/evaluation.md).

## Repository map

```text
src/                         Task Manager source and Vitest tests
docs/egm/                    Original brief/design, EGM research, and review reports
docs/evidence/               Evidence index and scoped screenshots
README.md                    Project and research entry point
```

No license file is included; company licensing policy has not been confirmed.
