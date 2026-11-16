# Local Task Manager with Prerequisites

* **Author:** Tanmay Pasalkar
* **Status:** Draft
* **Date:** 2026-11-03

## Overview

This design describes a small React and TypeScript task manager built with Vite. It stores task data in one browser using localStorage and has no backend or authentication. Its central behavior is prerequisite-based task completion: blocked status is derived from incomplete prerequisites, and invalid dependency or status changes are rejected with clear explanations.

The design also covers task filtering and sorting, safe deletion of tasks referenced by others, recovery from unusable saved data, and basic detection of changes made in another browser tab. It keeps the app limited to the approved experiment scope.

## The Problem

A basic task list does not express that one task must be completed before another. Adding prerequisites introduces rules that must stay consistent across task creation, editing, completion, deletion, persistence, and browser-tab changes. If those rules are unclear or applied differently by different parts of the app, tasks can appear ready when they are blocked, completed tasks can depend on incomplete work, or one tab can silently replace newer saved data.

The design defines one small local application that makes those rules visible, validates changes before applying them, and reports storage and conflict conditions without adding a server or automatic synchronization.

## Goals

* Let a user create, edit, delete, complete, filter, and sort tasks in one browser.
* Enforce prerequisite rules, reject self-dependencies and cycles, derive blocked state, and explain rejected actions.
* Confirm deletion when other tasks depend on the selected task, remove their references together with the deletion, and leave their statuses unchanged.
* Save tasks in a versioned localStorage envelope, validate saved data before use, and provide clear recovery, incompatibility, unavailable-storage, and retry states.
* Detect changes from another tab, refuse writes when a newer value is detected, and let the user reload the latest saved data with a warning when local unsaved changes would be discarded. This best-effort check cannot eliminate every cross-tab race.
* Keep the implementation small and understandable, with domain rules, persistence, cross-tab handling, and UI responsibilities separated.
* Provide an accessible, responsive interface and a practical verification plan using Vitest and manual browser checks.

## Non-Goals

* Backend services, accounts, authentication, cloud storage, or shared task data.
* Search, priorities, due dates, categories, or a separate Blocked filter.
* Automatic completion or reopening cascades when dependencies change or tasks are deleted.
* Automatic cross-tab synchronization or merging, or a guarantee of fully atomic cross-tab transactions.
* Data migrations, database storage, export/import, elaborate backup or recovery tools, or a state-management framework.
* A general-purpose workflow engine or other abstractions beyond the task and persistence rules required for this experiment.

## Open Questions

No unresolved product or architectural decisions remain for this experiment.

## Critical User Journeys (CUJs)

### CUJ 1: Create and edit a task

* **Given** the task manager is ready, **when** the user creates a task with a title and optional description, **then** the trimmed title and task details appear in the list and are saved when persistence succeeds. When the user edits task details, the updated details appear without changing completion status.

### CUJ 2: Complete a task with prerequisites

* **Given** a task has one or more incomplete prerequisites, **when** the user tries to complete it, **then** the task remains active and the app identifies the incomplete prerequisites. After those prerequisites are completed, the user can complete the task.

### CUJ 3: Reopen a completed prerequisite

* **Given** a completed task has a completed dependent, **when** the user tries to reopen the prerequisite, **then** the app rejects the change and identifies the completed dependent that must be reopened first. The task data and statuses remain unchanged.

### CUJ 4: Delete a task with dependents

* **Given** other tasks directly depend on a task, **when** the user chooses to delete it, **then** a confirmation identifies the dependents, gives their count, and explains that references will be removed and tasks may become unblocked. Cancel leaves data unchanged; confirm deletes the task and removes its references together without changing dependent statuses.

### CUJ 5: Filter the task list

* **Given** the task list contains active, blocked, and completed tasks, **when** the user selects All, Active, or Completed, **then** the matching tasks, counts, hidden-task message, and appropriate empty state are shown. Active includes all active tasks, both blocked and unblocked, because blocked is derived rather than a stored status. Filtering does not change stored tasks or dependencies.

### CUJ 6: Recover from unusable saved data

* **Given** the stored value is malformed, invalid, or has an unsupported schema version, **when** the user opens the app, **then** the app shows the appropriate recovery or incompatibility state and preserves the original value until the user confirms reset. If storage cannot be read, the app shows storage unavailable instead of assuming the task list is empty.

### CUJ 7: Retry a failed save

* **Given** a task change succeeds in memory but localStorage saving fails, **when** the app reports that the change is not persisted and the user retries, **then** the current in-memory tasks remain available and the app reports whether the retry saved them.

### CUJ 8: Resolve a change from another tab

* **Given** another same-origin tab changes the stored dataset, **when** the current tab detects the storage event or a pre-write difference, **then** it keeps its current tasks, warns that newer data is available, and refuses the corresponding write. Reload Latest Data warns before discarding unsaved local changes and replaces the current dataset only after the user confirms. The app does not merge changes and does not claim to eliminate every cross-tab race.

## Technical Plan (Architecture)

### Architecture and responsibilities

Use a small Vite application with React and TypeScript. Keep four responsibilities distinct:

* **Task domain:** Types, validation, dependency checks, derived blocked state, sorting/filtering helpers, and task mutations. These functions are pure: they take task data and an action, then return a new valid task list or a clear rejection. They do not read browser APIs or React state.
* **Persistence:** Load and save the versioned localStorage envelope, validate its shape, preserve invalid or unsupported values, reset data after confirmation, and report storage failures. Persistence calls the domain dataset validator after parsing the envelope.
* **Cross-tab handling:** Subscribe to the browser `storage` event and compare the current stored value with the last value loaded or saved before each write. Report a conflict instead of replacing a newer value. This is best-effort conflict detection; the read and write are not one atomic browser operation.
* **React UI and application state:** A small typed `useReducer` coordinates task data, the active filter, persistence state, and conflict state. Event handlers call domain functions and persistence operations outside the reducer, then dispatch explicit results. Components render state and collect user input; they do not repeat dependency validation.

The reducer does not perform I/O. This keeps its transitions predictable and testable. The selected `useReducer` approach coordinates related task, storage, and conflict changes in one place. Separate `useState` values would use less structure at first, but related updates could drift as failures and conflicts are handled. An external state library would add a dependency without solving a need this app has.

```text
User action
    |
    v
React event handler -----> Domain function
    |                           |
    |                      accepted / rejected
    |                           |
    +---- accepted task list ---+
    |                           v
    |                    Persistence operation
    |                    (outside reducer)
    |                           |
    +------ result -------------+
                |
                v
         useReducer state
                |
                v
         React components

Other tab --storage event--> Cross-tab handler --dispatch conflict state
```

Keep the file layout small and map each boundary to one module:

```text
package.json
package-lock.json
.gitignore
index.html
tsconfig.json
vite.config.ts
src/
  main.tsx
  styles.css
  App.tsx
  app/appReducer.ts
  components/TaskManagerView.tsx
  domain/tasks.ts
  domain/tasks.test.ts
  persistence/taskStorage.ts
  persistence/crossTab.ts
  app/appReducer.test.ts
  persistence/taskStorage.test.ts
  persistence/crossTab.test.ts
```

The root files provide the npm project, lockfile, ignore rules, HTML entry point, and TypeScript/Vite configuration. `main.tsx` mounts React and imports `styles.css`; `App.tsx` connects the reducer to side effects. `TaskManagerView.tsx` holds the form, filters, list, notices, and confirmation UI, with temporary form values in local component state. The domain, reducer, and persistence tests sit beside the corresponding modules. This avoids creating separate files for every small visual element.

### Reducer state and transitions

Use a typed reducer state with the task list, active filter, load state, save state, cross-tab conflict state, and a task revision. The load state is `loading`, `ready`, `recovery-required`, `incompatible`, or `unavailable`. Use the save states `idle`, `saving`, `saved`, and `not-persisted`. The conflict state is `clear` or `newer-data`. Track both the current task revision and the last successfully persisted revision; local changes are unsaved when the revisions differ. Keep the last-known raw localStorage value in an app-level ref because it is a persistence comparison value, not task data.

The reducer state and action payloads stay explicit and small:

```text
AppState = {
  tasks: Task[]
  activeFilter: TaskFilter
  loadStatus: loading | ready | recovery-required | incompatible | unavailable
  saveStatus: idle | saving | saved | not-persisted
  conflictStatus: clear | newer-data
  taskRevision: number
  persistedRevision: number
}

Action =
    LOAD_SUCCEEDED { tasks, rawValue }
  | LOAD_FAILED { outcome }
  | MUTATION_ACCEPTED { tasks, revision }
  | SAVE_SUCCEEDED { revision }
  | SAVE_FAILED { revision, reason }
  | RETRY_SAVE { revision }
  | EXTERNAL_CHANGE { newValue }
  | RELOAD_SUCCEEDED { tasks, rawValue }
  | RELOAD_FAILED { outcome }
  | FILTER_CHANGED { filter }
  | RESET_SUCCEEDED { revision }
  | RESET_FAILED { reason }
```

Load and reload outcomes are limited to recovery-required, incompatible, or unavailable. `MUTATION_ACCEPTED` is dispatched only after the domain function returns a valid new dataset. It carries the next task revision. The action list intentionally has no validation action: a rejected domain result is shown by the relevant UI and does not change task state.

Initial state uses save status `idle` until the first load resolves. Successful initial load sets the tasks, raw-value baseline, current and persisted revisions, and save status `saved`. A validated domain mutation increments the current revision, installs its returned task list, and sets save status to `saving` while the event handler tries to persist that exact task snapshot and revision. A save success sets status to `saved` and updates the persisted revision only when its revision still matches the current task revision; a matching save failure sets status to `not-persisted` and leaves the task list untouched. Results for an older revision do not change the current revision's save status or persisted revision, so an older success cannot mark newer in-memory tasks as saved. Retry sets status to `saving` and carries the current task list and revision. An external change sets `newer-data` without replacing tasks. Successful reload installs validated tasks, advances the task revision, sets the persisted revision to the new revision and save status to `saved`, and clears the conflict. Reset success clears tasks and advances the task revision only after storage removal succeeds; it sets the persisted revision to the new revision, save status to `saved`, and returns to ready. Both whole-dataset replacements invalidate save results associated with earlier revisions. Reset or reload failure does not replace task data or advance its revision. Filter changes affect only the filter.

The reducer applies these state transitions only. Domain validation remains in `domain/tasks.ts`; the reducer does not repeat it. Persistence and event handlers perform I/O outside reducer cases.

### Task model and domain rules

Represent a task with `id`, `title`, optional `description`, `status` (`active` or `completed`), `dependencies` (prerequisite task IDs), `createdAt`, and `updatedAt`. The title is trimmed and must not be empty; an optional description is a string. Use valid UTC ISO timestamps. A successful change updates `updatedAt` while preserving `createdAt`; creation sets both timestamps. IDs are stable strings; generate them with the browser's `crypto.randomUUID()` when creating tasks. Sort by `createdAt` descending and then `id` ascending. Keep the stable localStorage key as a single constant, `local-task-manager`.

The domain layer owns the task and filter types and exposes small functions for creating, editing, completing, reopening, and deleting tasks, plus validation and derived view helpers. Each mutation receives the current dataset and returns either a new dataset or a rejection result with an explanation. It never mutates the input array or task objects. The reducer and UI consume the result; they do not reimplement the rules.

The Active filter includes every task with active status, whether blocked or unblocked. Blocked is derived rather than stored as a separate status or offered as a separate filter. Active counts include both blocked and unblocked tasks.

Before accepting a dataset or mutation, require each ID to be a non-empty string and unique within the dataset; validate required task field types, trimmed non-empty titles, optional description type, valid UTC ISO timestamps, valid status values, unique dependency IDs, and references to existing tasks. Reject self-dependencies and cycles. For a proposed edge from a task to a prerequisite, reject it if following existing prerequisite links from that prerequisite can reach the task being edited. The same dataset validator is used for stored data and domain mutations, so UI handlers and reducer cases do not maintain separate copies of these rules.

Completion is allowed only if every direct prerequisite is completed. A completed task may change title or description without changing status. Its dependency list may change only when every resulting prerequisite is completed. Reopening is rejected when any completed task directly depends on the task being reopened; the rejection names those dependents. A task is blocked when it is active and at least one direct prerequisite is incomplete. Derive this state and the prerequisite names for display; do not store it.

Deletion is one domain mutation. Before confirmation, the UI asks the domain layer for direct dependents. If there are any, the dialog names them, gives their count, and explains that references will be removed and tasks may become unblocked. Cancellation makes no mutation. Confirmation removes the selected task and its ID from each dependent's dependency list in one returned dataset, updates affected dependents' `updatedAt`, and leaves all statuses unchanged. No confirmation is needed when there are no dependents.

### Persistence and recovery

Store one JSON envelope under `local-task-manager`:

```text
{
  "schemaVersion": 1,
  "tasks": [ ... ]
}
```

On startup, read the key once. Wrap both obtaining `window.localStorage` and calling its methods in error handling, since access to the property itself may fail in a restricted browser context. No value means a valid empty dataset. A value must parse as JSON, have the supported schema version, have the expected envelope and task field types, and pass the complete domain dataset validation before the UI uses it. Do not normalize or partially load invalid records. `blocked` is derived after validation and is never persisted. Do not migrate formats in this experiment. An incompatible future format must use a higher schema version; preserve the stored value when the version is unsupported.

Keep storage results explicit so the UI can render the approved states: loading, ready/saved, recovery required for malformed or invalid data, incompatible version, storage unavailable on read failure, and not persisted after a write failure. Corrupt or unsupported data is never silently replaced. Offer a confirmed reset only from recovery or incompatibility states and only when storage can be accessed. Reset removes the saved value and initializes an empty task list; if removal fails, keep the recovery state and report that it did not complete.

For an accepted task mutation, update the in-memory task list and set its new revision to `saving` before reporting the storage result. This preserves the user's current work if `setItem` fails. A matching write failure sets the status to `not-persisted`; show a clear message and Retry action. Retry sets the current revision to `saving` and writes the current in-memory dataset. Associate every save result with the revision of the snapshot that was written. The reducer ignores a success or failure for an older revision when deciding whether the current in-memory tasks are saved. A successful current-revision write sets the status to `saved` and updates the last-known stored value. Wrap storage acquisition and reads, writes, and removal in error handling. Use small persistence functions that accept a `Storage` object so Vitest can supply a fake that returns missing, malformed, unsupported data or throws on access and operations. No database or migration framework is needed.

### Cross-tab conflict handling

The cross-tab handler listens for `storage` events for `local-task-manager` and ignores unrelated keys. When another tab changes or removes the key, keep the current in-memory tasks, mark newer data as available, and show a notice with a Reload Latest Data action. Do not reload automatically or merge data. The subscription accepts a minimal typed event target exposing storage-listener registration and removal. The app passes `window`; Node tests pass a fake event target that can register, fire, and remove the listener.

Before saving, compare the current raw value in localStorage with the last-known value. If they differ, refuse that write and set the conflict state; this also catches many cases before the corresponding event has been handled. If this comparison itself fails because storage cannot be read, keep the in-memory changes and report that they are not persisted. If there are unsaved local changes, the reload action warns that reloading will discard them and asks for confirmation. A successful reload reads and validates the latest envelope before replacing in-memory tasks and updating the last-known value. If the latest data is invalid, incompatible, or unreadable, show the corresponding recovery state and preserve it.

The comparison and subsequent `setItem` call are separate operations. Another tab can write between them, so this design reduces silent stale overwrites but does not guarantee fully atomic cross-tab protection. Do not describe the app as providing complete multi-tab consistency.

### React UI responsibilities

The app root runs initial loading and owns the reducer, side-effect handlers, the last-known raw storage value, and storage-event subscription. Keep temporary task-form fields local to the form component. On submit, call a domain function; show its rejection without changing tasks, or pass its accepted result to the persistence flow. The reducer records explicit load, task-change, save-result, external-change, reload, and filter actions.

Small components render the task form, filters and counts, task list, blocked explanations, save/conflict notices, and deletion/reset confirmations. The list derives filtered and sorted rows from the current task data. Use labeled controls, keyboard-operable actions, visible validation, and an announced status area for blocked, persistence, and conflict messages. Use native HTML and CSS for responsive layout; no component library is required.

### Verification strategy

Use Vitest for unit tests, without adding a separate test framework:

* **Domain tests:** trimmed and empty titles; valid task creation and editing; blocked completion rejection and prerequisite explanation; multiple prerequisites; self-link and cycle rejection; completed-task dependency restrictions; reopening rejection when completed dependents exist; atomic deletion cleanup, unchanged statuses, and updated timestamps; filter membership/counts (including blocked and unblocked active tasks), hidden count, and deterministic sorting.
* **Reducer tests:** load outcomes; accepted and rejected mutation transitions; save failure retaining the in-memory task list and marking it not persisted; retry success; external change setting conflict without replacing local tasks; reload replacing state only after a valid load; unsaved-change warning state.
* **Persistence tests:** empty key; valid version-1 envelope; malformed JSON; unsupported version; invalid fields, references, cycles, and completion invariants; read, write, and remove exceptions; retry; confirmed reset behavior; compare-before-write conflict detection. Use a small fake `Storage` object to force failures deterministically.
* **Manual browser checks:** create and edit tasks; verify filters, counts, hidden-task message, empty states, blocked explanations, and keyboard access; exercise blocked completion, dependency edits, reopening guards, and delete confirmation/cancel/cleanup. Reload the page to confirm persistence. In two tabs, change data in one and verify the other shows newer data and refuses the corresponding write when the change is detected; reload only after any required unsaved-change warning. The documented compare/write race remains possible. Use browser developer tools to inspect the versioned envelope and test malformed or unsupported saved data without allowing it to be overwritten.

This plan verifies domain behavior and key state transitions with repeatable unit tests, then checks browser-only behavior such as real storage events and responsive interaction manually. It does not claim that manual testing or the localStorage comparison removes the documented cross-tab race.

## Alternatives Considered

### Separate `useState` values instead of `useReducer`

* **Alternative:** Keep tasks, filter, persistence status, and conflict status in separate `useState` values. This has less structure for a very small initial screen.
* **Selected approach:** Use one small typed `useReducer` for shared application state so related task, save, and conflict transitions stay coordinated. Keep form input local to its component.
* **Reason for rejection:** Rejected by author because separate state updates could drift as failure and conflict cases are added; a state library would add more machinery than the app needs.

### Validation inside React components instead of pure domain functions

* **Alternative:** Put dependency checks in form and button handlers. This may look direct when there are only a few controls.
* **Selected approach:** Use pure domain functions to validate and apply task changes before the reducer receives them.
* **Reason for rejection:** Rejected by author because checks repeated across UI actions can diverge. A small domain module keeps the same rules for completion, editing, deletion, and persisted-data validation without adding a rules framework.

### A backend instead of localStorage

* **Alternative:** Store tasks in a server database. This could support shared data and access from multiple devices.
* **Selected approach:** Store a versioned dataset in localStorage for one browser and one user.
* **Reason for rejection:** Rejected by author because accounts, server operations, and shared data are outside this experiment and would add deployment and operational work.

### Automatic cross-tab synchronization instead of conflict notice and reload

* **Alternative:** Send changes between tabs and automatically merge them. This could reduce manual reloads, but requires rules for conflicting edits and synchronization state.
* **Selected approach:** Detect storage events, compare the saved value before writing, refuse a write when a newer value is detected, and let the user reload the latest data. Do not merge automatically; document that localStorage cannot guarantee fully atomic cross-tab protection.
* **Reason for rejection:** Rejected by author because automatic synchronization and merge behavior add complexity beyond the goal of basic conflict awareness. Explicit conflict handling is proportionate to the experiment.

## Detailed Implementation Plan

### Target Files to Create

Create the following files in one implementation pass. The project has no existing application scaffold, so there are no source files to modify or delete.

1. **`package.json`** (Create)
   * **Type / Scope:** npm project and scripts.
   * **Proposed Changes:** Declare React and React DOM as runtime dependencies. Declare TypeScript, Vite, `@vitejs/plugin-react`, Vitest, React type packages, and Node type packages for the Vite configuration as development dependencies. Add `dev`, `build`, and `test` scripts. The build script runs TypeScript checking and the Vite production build; the test script runs Vitest once.
   * **Rationale:** Provides only the tools needed to run, build, and verify the React + TypeScript app.

2. **`package-lock.json`** (Create)
   * **Type / Scope:** npm dependency lockfile.
   * **Proposed Changes:** Generate from `package.json` using npm.
   * **Rationale:** Makes dependency installation repeatable without adding another package manager.

3. **`.gitignore`** (Create)
   * **Type / Scope:** Repository ignore rules.
   * **Proposed Changes:** Ignore `node_modules/`, Vite build output, and local environment files.
   * **Rationale:** Keeps generated and machine-specific files out of source control.

4. **`index.html`** (Create)
   * **Type / Scope:** Vite HTML entry point.
   * **Proposed Changes:** Provide the root element and load `src/main.tsx` as the browser entry point.
   * **Rationale:** Vite needs a small document to mount the React app.

5. **`tsconfig.json`** (Create)
   * **Type / Scope:** TypeScript configuration.
   * **Proposed Changes:** Enable strict type checking, browser DOM types, and the React JSX transform. Include the application and Vite configuration files.
   * **Rationale:** Catches invalid task, reducer, and persistence result shapes during the build.

6. **`vite.config.ts`** (Create)
   * **Type / Scope:** Vite and Vitest configuration.
   * **Proposed Changes:** Register the React plugin and configure Vitest to use the Node environment for pure domain, reducer, storage, and event-handler tests.
   * **Rationale:** Keeps the app and unit tests on the same small build tool; no browser simulation package is needed for the planned unit tests.

7. **`src/main.tsx`** (Create)
   * **Type / Scope:** React entry point.
   * **Proposed Changes:** Mount `App` and import the application stylesheet.
   * **Rationale:** Keeps browser bootstrapping separate from application behavior.

8. **`src/App.tsx`** (Create)
   * **Type / Scope:** Application coordinator.
   * **Proposed Changes:** Initialize `useReducer`; load saved data on startup; own the last-known raw storage value; call pure domain mutations; perform persistence operations outside the reducer; dispatch results tagged with the relevant task revision; subscribe to and clean up cross-tab notifications; pass state and callbacks to the view.
   * **Rationale:** Provides one small place to coordinate UI state and side effects without putting I/O in the reducer or validation in components.

9. **`src/app/appReducer.ts`** (Create)
   * **Type / Scope:** Typed React state and reducer.
    * **Proposed Changes:** Define `AppState` with tasks, active filter, load status, save status (`idle`, `saving`, `saved`, or `not-persisted`), conflict status, current task revision, and persisted revision. Use `idle` before initial load resolves; successful initial load, reload, or reset sets `saved`; accepted mutations and retries set `saving`; matching save success sets `saved`; matching save failure sets `not-persisted`. Successful reload and reset each advance the task revision and set the persisted revision to that new revision; failed replacements leave task data and revision unchanged. Ignore save success or failure actions whose revision does not match the current task revision. Do not import storage APIs or implement domain rules here.
   * **Rationale:** Keeps related UI states predictable and makes stale save-result behavior directly testable.

10. **`src/domain/tasks.ts`** (Create)
    * **Type / Scope:** Task model and pure domain operations.
    * **Proposed Changes:** Define task, filter, and mutation-result types. Export dataset validation, create/edit/complete/reopen/delete operations, direct-dependent lookup, blocked-state derivation, filter/count calculation, and sorting by `createdAt` descending, then `id` ascending. The Active filter includes all active tasks, blocked and unblocked, and its count includes both. Validate non-empty unique string IDs, trimmed non-empty titles, optional description type, valid UTC ISO timestamps, valid statuses, unique dependency IDs, existing references, no self-links or cycles, and completion invariants. Return a new dataset on success or a rejection reason without mutating inputs.
    * **Rationale:** Applies every dependency rule in one place for both user actions and loaded data.

11. **`src/persistence/taskStorage.ts`** (Create)
    * **Type / Scope:** Versioned localStorage access.
    * **Proposed Changes:** Define the stable key `local-task-manager` and version 1 envelope. Provide load, compare-before-save, retry/save, and reset operations with typed results. Wrap obtaining `window.localStorage` and every storage operation in error handling. Parse the envelope, reject unsupported versions, validate its shape, and call the domain dataset validator. Preserve corrupt or unsupported values unless the user confirms reset. A save compares the current raw value with the expected last-known value before writing and returns the exact raw value written on success.
    * **Rationale:** Keeps browser storage and failure handling out of task rules and React components while making storage failures testable with a small fake `Storage` object.

12. **`src/persistence/crossTab.ts`** (Create)
    * **Type / Scope:** Browser storage-event subscription.
    * **Proposed Changes:** Accept a minimal typed event target exposing storage-listener registration and removal. The app passes `window`; Node tests pass a fake event target. Listen for `storage` events for the stable task key, ignore unrelated keys, and report a change or removal to the app coordinator. Return a cleanup function for the event listener. Do not reload, merge, or write data from this module.
    * **Rationale:** Separates notification of external changes from localStorage persistence and reducer state transitions.

13. **`src/components/TaskManagerView.tsx`** (Create)
    * **Type / Scope:** Task manager interface.
    * **Proposed Changes:** Render task form, dependency selection, filters and counts, sorted task list, blocked reasons, validation messages, persistence/conflict notices, delete confirmation, and recovery/reset states. Keep temporary form values local to the relevant component. Call supplied callbacks and display their results; do not repeat domain validation. Use semantic controls, keyboard access, and an announced status area.
    * **Rationale:** Keeps UI rendering and local form input simple while leaving shared task rules in the domain module.

14. **`src/styles.css`** (Create)
    * **Type / Scope:** Responsive application styling.
    * **Proposed Changes:** Add readable layout, focus visibility, and small-screen behavior for the form, task list, dialogs, filters, and notices.
    * **Rationale:** Meets the responsive and accessible presentation goal without a component or styling framework.

15. **`src/domain/tasks.test.ts`** (Create)
    * **Type / Scope:** Vitest domain tests.
    * **Proposed Changes:** Cover title trimming and rejection, IDs and timestamps, dependency references, multiple prerequisites, self-links and cycles, completion and reopening guards, completed-task dependency edits, atomic deletion cleanup and timestamps, derived blocked state, filter membership/counts including blocked active tasks, and deterministic sorting.
    * **Rationale:** Exercises invariants without needing a browser or React render.

16. **`src/app/appReducer.test.ts`** (Create)
    * **Type / Scope:** Vitest reducer tests.
    * **Proposed Changes:** Cover initial `idle`, successful load/reload/reset setting `saved`, accepted mutation and retry setting `saving`, matching success setting `saved`, matching failure setting `not-persisted` while retaining in-memory tasks, external changes preserving current tasks, and recovery outcomes. Also cover stale save successes and failures arriving after successful reset or reload; verify each replacement advances the revision and older results cannot change its save status.
    * **Rationale:** Verifies the state coordination chosen for this app without involving storage side effects.

17. **`src/persistence/taskStorage.test.ts`** (Create)
    * **Type / Scope:** Vitest persistence tests.
    * **Proposed Changes:** Use a small fake `Storage` implementation to cover empty storage, valid version 1, malformed and unsupported data, invalid task datasets, throwing storage access/read/write/remove operations, compare-before-save conflicts, retry, and confirmed reset.
    * **Rationale:** Makes browser storage failures repeatable in tests without adding a database or browser-test framework.

18. **`src/persistence/crossTab.test.ts`** (Create)
    * **Type / Scope:** Vitest cross-tab listener tests.
    * **Proposed Changes:** In Vitest's Node environment, use a fake event target to verify listener registration, task-key changes and removals, ignored unrelated keys, and listener cleanup. No browser simulation package is required.
    * **Rationale:** Covers the event filter and listener lifecycle; real two-tab behavior is checked manually.

### Implementation Sequence

1. Create the npm, TypeScript, and Vite scaffold files.
2. Implement task types, dataset validation, derived views, and pure mutations in `src/domain/tasks.ts`.
3. Implement the typed reducer and test its revision-aware transitions.
4. Implement versioned storage operations and fake-storage tests, including failure to obtain `window.localStorage`.
5. Add the storage-event subscription and its tests.
6. Connect load, domain mutations, persistence results, retries, conflict notices, and reload in `src/App.tsx`.
7. Build the task view and responsive styles, then perform the manual browser checks below.

### Verification Plan

* **Build and type check:** Run `npm run build` to run strict TypeScript checking and produce the Vite production build.
* **Unit tests:** Run `npm test` (Vitest) for domain, reducer, persistence, and cross-tab helper cases listed above. Cross-tab subscription tests use the fake event target and run in Node; no browser simulation framework is required.
* **Manual task behavior:** In a browser, create and edit tasks, check All/Active/Completed counts and hidden-task messages, complete and reopen tasks, inspect blocked reasons, and exercise cycle/self-dependency rejection.
* **Manual deletion and accessibility:** Confirm deletion lists direct dependents and explains unblocking; cancel and verify no changes; confirm and verify references are removed while statuses remain unchanged. Check labels, keyboard operation, focus visibility, announcements, and narrow-screen layout.
* **Manual persistence and recovery:** Reload after saved changes. Use developer tools to place malformed JSON and an unsupported version under `local-task-manager`; verify recovery/incompatibility states preserve the value until confirmed reset. Storage read/write/remove exceptions are covered with the fake `Storage` tests.
* **Manual two-tab behavior:** Open the app in two same-origin tabs, change data in one, and verify the other shows a newer-data notice and refuses the corresponding write when the external change is detected. Reload latest data and verify the unsaved-change warning when the stale tab has unpersisted work. The documented compare/write race remains possible and is not a passing guarantee.

No production application code is included in this design document.
