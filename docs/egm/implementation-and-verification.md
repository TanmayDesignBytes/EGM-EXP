# Application architecture and verification

## Approved architecture and implemented behavior

The app follows the user's approved React + TypeScript + Vite design. It has no backend, account system, database, state-management library, component framework, or automatic cross-tab merge.

The approved 18-file application plan is present:

```text
package.json                 package-lock.json            .gitignore
index.html                   tsconfig.json                vite.config.ts
src/main.tsx                 src/App.tsx                  src/styles.css
src/app/appReducer.ts        src/app/appReducer.test.ts
src/domain/tasks.ts          src/domain/tasks.test.ts
src/persistence/taskStorage.ts       src/persistence/taskStorage.test.ts
src/persistence/crossTab.ts         src/persistence/crossTab.test.ts
src/components/TaskManagerView.tsx
```

The publication documentation added under `docs/` is separate from those 18 application-plan files.

```text
React event handler
      |
      v
Pure task-domain mutation -----> accepted task snapshot
      |                                  |
      | rejection                        v
      +--------------------------> localStorage helper
                                         |
                    result tagged with task revision
                                         v
                                   useReducer
                                         |
                                         v
                                  React view

Other tab --storage event--> cross-tab helper --> conflict action
```

| Area | Implemented responsibility | Source files |
|---|---|---|
| Browser entry and app coordination | Mounts React; initializes the reducer; loads tasks; invokes domain functions and persistence outside the reducer; tracks the last raw storage value; subscribes to storage changes | [`src/main.tsx`](../../src/main.tsx), [`src/App.tsx`](../../src/App.tsx) |
| Application state | Coordinates tasks, filter, load/save/conflict statuses, task revision, and persisted revision; ignores stale save results | [`src/app/appReducer.ts`](../../src/app/appReducer.ts) |
| Domain | Validates datasets and task edits; handles completion, reopening, deletion cleanup, derived blocked state, filters/counts, and ordering | [`src/domain/tasks.ts`](../../src/domain/tasks.ts) |
| Persistence | Reads and writes `{ schemaVersion: 1, tasks }` at `local-task-manager`; validates the whole dataset; returns recovery/error/conflict outcomes; resets only after confirmation through the UI | [`src/persistence/taskStorage.ts`](../../src/persistence/taskStorage.ts) |
| Cross-tab listener | Filters `storage` events by key; exposes a minimal event-target interface that accepts `window` in the app and a fake target in Node tests | [`src/persistence/crossTab.ts`](../../src/persistence/crossTab.ts) |
| View and styling | Renders task forms, dependency checkboxes, task cards, filters, counts, notices, deletion/recovery prompts, and responsive styles | [`src/components/TaskManagerView.tsx`](../../src/components/TaskManagerView.tsx), [`src/styles.css`](../../src/styles.css) |

## Task and dependency rules

Each task contains an ID, trimmed non-empty title, optional description, `active` or `completed` status, prerequisite IDs, and UTC creation/update timestamps. Domain operations return a new dataset or a rejection reason; they do not mutate the current task list.

- Prerequisite references must exist and be unique. Self-dependencies and cycles are rejected.
- A task cannot be completed until all direct prerequisites are complete. The explanation names the incomplete prerequisites.
- Completed tasks can have title/description changes without reopening. Their dependencies can change only if all resulting prerequisites are complete.
- A completed task cannot be reopened while any completed task directly depends on it.
- Deletion removes direct dependency references in the same domain result, updates affected dependents' `updatedAt`, and preserves their statuses. The UI confirms when direct dependents exist.
- Blocked is derived for active tasks with incomplete prerequisites; it is not serialized. Active filtering includes blocked and unblocked tasks.
- Sorting is creation time descending, then ID ascending. Filtering does not mutate stored relationships.

## Reducer and persistence transitions

The reducer is pure. Its status sets are `loading | ready | recovery-required | incompatible | unavailable`, `idle | saving | saved | not-persisted`, and `clear | newer-data`. An accepted mutation increments `taskRevision` and enters `saving`; only a matching result changes the persisted revision/status. Reset and reload replace the dataset and advance the revision, so an older save result is ignored. A failed write leaves the in-memory task list available and offers retry.

The version-1 envelope uses the stable key `local-task-manager`. Missing data initializes an empty list. Malformed JSON or invalid task graphs show recovery; unsupported versions show incompatibility. The stored raw value is retained until explicit confirmed reset. Access to `window.localStorage` and its read/write/remove operations are caught and surfaced.

## Cross-tab scope and limit

The app listens for `storage` events and compares current raw storage with its last-known value before saving. A detected difference marks newer data and refuses the corresponding write; the user can reload, with a warning when local changes are unsaved. The read and subsequent write are separate operations. Another tab can write between them, so this is best-effort conflict detection, not an atomic cross-tab transaction or a full consistency guarantee.

## Verification code and latest results

The project has four Vitest files:

| Test file | Test count | Main behavior exercised |
|---|---:|---|
| [`src/domain/tasks.test.ts`](../../src/domain/tasks.test.ts) | 8 | IDs/timestamps/title validation, references and cycles, blocked completion, completed-task edits, reopening, atomic deletion cleanup, filtering/counts/sorting |
| [`src/app/appReducer.test.ts`](../../src/app/appReducer.test.ts) | 5 | Load/mutation transitions, failed save and retry, conflict, reload/reset revision invalidation, stale save results |
| [`src/persistence/taskStorage.test.ts`](../../src/persistence/taskStorage.test.ts) | 5 | Empty/valid/malformed/unsupported data, invalid datasets, storage access/read/write/remove failures, compare-before-write, retry, reset |
| [`src/persistence/crossTab.test.ts`](../../src/persistence/crossTab.test.ts) | 1 | Event target registration, matching changes/removals, ignored keys, listener cleanup |
| **Total** | **19** | |

The automated checks were rerun for this screenshot-evidence pass on 2026-11-16 (local time):

| Command | Result |
|---|---|
| `npm test` | Passed: 4 files, 19 tests |
| `npm run build` | Passed: `tsc --noEmit` and Vite 7.3.7 production build |
| `npm audit` | Passed: zero vulnerabilities |

The first sandboxed `npm audit` attempt could not reach `registry.npmjs.org`; a network-enabled rerun completed and reported zero vulnerabilities. The test and build commands succeeded in the workspace. No command-output screenshot could be saved with the available local screenshot tools.

The installed lockfile resolved React/React DOM 19.3.1, TypeScript 5.9.3, Vite 7.3.7, `@vitejs/plugin-react` 5.2.0, and Vitest 5.1.0. Vitest stayed the planned test dependency; its major-version change was made after the first audit flagged the earlier test-tooling tree.

The Vitest suites use Node and an injected fake event target; they do not simulate React rendering or real browser storage events. `npm audit` output is a point-in-time dependency result, not a permanent guarantee.

## Manual browser verification status

The design calls for manual checks of task CRUD, dependency explanations, completion/reopening rules, deletion confirmation and cleanup, filter/empty states, reload persistence, malformed/unsupported-data recovery, save retry, two-tab conflicts, keyboard interaction, and narrow-screen layout. **This full checklist has not been confirmed complete.**

What is evidenced:

- During this pass, Vite started successfully at `http://127.0.0.1:5175/`. Ports 5173 and 5174 were already occupied, so Vite selected 5175. A separate clean Chrome tab used that server.
- In that tab, the `Design UI` task was created, then `Build UI` was created with `Design UI` selected as a prerequisite. The rendered list showed `Build UI` as **Blocked** and named `Design UI` as the incomplete prerequisite. This verifies only this narrow browser smoke scenario.
- An isolated headless Chrome session submitted both tasks through the app form and saved [`04-task-manager.png`](../evidence/screenshots/04-task-manager.png). The capture shows Build UI blocked on Design UI. It is a narrow browser interaction, not a complete manual test. Four browser captures are saved; terminal captures 05 and 06 are blocked because no safe terminal-window export was available. See [`docs/evidence/README.md`](../evidence/README.md).
- The user previously reported a selected prerequisite checkbox becoming unchecked after refresh. Code tracing found the new-task composer keeps unsaved form values locally and clears them after submission; editing an existing task initializes dependencies from its saved task. The original live localStorage value and exact user action sequence were not observed, so the report does not establish whether that specific incident was expected draft reset or a defect.
- No complete manual browser checklist, storage-recovery run, two-tab test, or browser-session log is available. Do not infer those outcomes from the screenshot or automated tests.

The app uses semantic labels, status/alert regions, focus-visible styling, and responsive CSS breakpoints. Those source-level choices do not substitute for keyboard, screen-reader, or viewport testing.

## Resolved dependency security finding during implementation

The initial Vitest 3.2.7 dependency tree produced an npm audit result of three advisories (one moderate and two critical) in development test tooling. The planned Vitest dependency was upgraded to 5.1.0; no new dependency category was added. The subsequent install and latest audit reported zero vulnerabilities. This history is included so the final zero-vulnerability result is not mistaken for the first install result.
