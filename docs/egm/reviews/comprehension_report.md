# Stage 6: Comprehension Test

## What this proposes

A local React and TypeScript task manager stores tasks in one browser, with no backend or accounts. Tasks can depend on prerequisites: blocked state is derived from incomplete prerequisites, and invalid dependency or status changes are rejected with an explanation. The design also specifies filtering, deletion cleanup, storage recovery, and best-effort conflict detection between tabs. It lays out the architecture, planned files, implementation sequence, and verification plan.

## How the existing system works, per this document

The document says there is no existing application scaffold or production code; this is a plan to create the app from scratch. The planned flow sends user actions from React event handlers to pure domain functions, then to persistence when a mutation is accepted; results update state through a reducer, and components render that state. Browser storage holds a versioned task envelope, while a storage-event handler reports changes from other tabs without reloading or merging them.

## Findings

### Nit — Save-state names and transitions are inconsistent

**Scope:** Reducer state and transitions.

The prose lists `saved`, `saving`, and `not-persisted`, while the `AppState` example uses `idle` instead of `not-persisted`. The transition description also alternates between marking a change as `saving` and `not persisted` before the save result. Standardize the state values and state when each transition applies.

### Nit — Active filter membership is not explicit

**Scope:** CUJ 5 and filtering description.

The design mentions active, blocked, and completed tasks but does not explicitly say whether Active includes blocked tasks. The approved brief says it includes all incomplete tasks, including blocked tasks. State that membership directly so implementation does not depend on inference.
