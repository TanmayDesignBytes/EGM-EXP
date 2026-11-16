# Local Task Manager with Prerequisites

* **Author:** Tanmay Pasalkar
* **Date:** 2026-11-03

## Overview

This experiment is a small, single-user task manager built with React and TypeScript. It keeps data in one browser with localStorage and has no backend or authentication. Its main hypothesis is that a simple task list can support useful prerequisite workflows when dependency rules are explicit, blocked status is derived, and invalid changes are rejected with clear explanations.

The app supports creating, editing, deleting, completing, filtering, and sorting tasks. It also demonstrates dependency validation, safe deletion of referenced tasks, recovery from storage problems, and basic awareness of changes from other browser tabs.

## Analysis

### Task model and views

Each task has a unique ID, a required title that is trimmed and non-empty, an optional description, an `active` or `completed` status, an array of prerequisite task IDs, a creation timestamp, and a last-modified timestamp. Timestamps use a consistent UTC representation. Any edit to a task, including dependency-reference cleanup caused by deletion, updates its `updatedAt` value; creation sets both timestamps.

The app has three filters: All, Active, and Completed. Active includes every incomplete task, including blocked ones. Each filter shows the count for its category. When the selected filter excludes tasks, show how many tasks are hidden by that filter. Show an appropriate empty state when no tasks match. Sort newest first by creation time; break timestamp ties by task ID in ascending order. Filtering only changes the view and never changes stored tasks or dependencies.

Blocked is derived from task status and dependencies; it is never stored. An active task is blocked when at least one of its direct prerequisites is incomplete. Show a Blocked indicator and identify the incomplete prerequisites by task title. No separate blocked status or filter is needed.

### Dependency rules and task changes

Dependencies mean that a task’s prerequisites must be completed first. A task may have multiple prerequisites. Every dependency must reference an existing task, must not refer to the task itself, and must not create a cycle. Dependency lists contain no duplicate IDs. A completed task must have only completed prerequisites.

A task cannot be completed until all prerequisites are complete. Explain rejected completion attempts and name the incomplete prerequisites. Users may edit a completed task’s title or description without changing its status. They may change its dependencies only when every resulting prerequisite is completed. Reject self-dependencies, cycles, and other invalid changes with a clear reason. Failed validation leaves task data and status unchanged.

A completed task cannot be reopened while any completed task directly depends on it. The explanation identifies the completed dependent tasks that must be reopened first. The app does not automatically reopen, complete, or cascade status changes.

Deleting a task with dependents requires confirmation. The dialog identifies all direct dependents, gives their count, and explains that their references to the task will be removed and they may become unblocked. The user can confirm or cancel. Cancel changes nothing. Confirmed deletion and removal of references happen as one domain operation; dependent task statuses do not change. If no tasks depend on the selected task, deletion needs no confirmation.

All task changes go through a centralized domain layer that validates rules before applying a mutation. This keeps dependency behavior consistent across the UI and persistence paths.

### Persistence, recovery, and browser tabs

Persist tasks under one stable localStorage key in an envelope containing `schemaVersion: 1` and `tasks`. If no saved value exists, initialize an empty task list. Validate the entire saved dataset before using it, including field types and required values, unique IDs, dependency references, absence of self-links and duplicate references, cycle prevention, and completion invariants. Recompute blocked state from the validated tasks.

If JSON parsing or dataset validation fails, show a recovery state and preserve the original stored value. If the schema version is unsupported, show an incompatibility state and preserve the stored value. Provide an explicit, confirmed reset action for corrupted or incompatible data when storage is accessible. Do not migrate data in this experiment. Future incompatible persisted-format changes must use a higher schema version; the stable storage key remains unchanged.

If localStorage cannot be read, show a storage-unavailable state rather than treating the dataset as empty. If saving fails, keep the current in-memory state, clearly show that it is not persisted, and allow the user to retry. Keep persistence and recovery handling separate from domain validation and React UI components.

Use the browser `storage` event to detect when another tab changes the stored dataset. Notify the user that newer data is available and prevent the stale tab from silently overwriting it. Provide a Reload Latest Data action. If local edits are unsaved, warn that reloading will discard them. Do not automatically merge or synchronize changes. localStorage does not provide fully atomic cross-tab transactions, so this conflict detection reduces silent overwrites but cannot eliminate every race condition.

The interface should be accessible and responsive. Error and confirmation messages should be understandable and actionable. Keep this local app small: no database, backend, authentication, state-management library, migration framework, synchronization framework, search, priorities, due dates, or categories.

### Review findings and response

The first six-lens review identified gaps in dependency invariants, blocked-task explanations, filter behavior, deletion effects, centralized validation, and storage failure handling. The author clarified those behaviors before this brief was finalized. The final review identified cross-tab overwrites as a remaining risk; the concept now includes storage-event detection, a reload path, and an explicit limitation that localStorage cannot guarantee atomic cross-tab updates.

Reviewers also challenged whether dependency workflows and storage recovery add too much complexity for a small task list. They remain in scope because this is an experiment in those behaviors. The design avoids a generalized workflow engine, automatic merging, migrations, and remote telemetry. Reviewers found no existing project code to reuse; the workspace has no application scaffold.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Create, edit, delete, complete, filter, and sort tasks.
  * Enforce prerequisite completion, dependency edit rules, cycle prevention, and completed-task reopen restrictions.
  * Derive blocked status and explain which incomplete prerequisites cause it.
  * Remove dependency references atomically when deleting a task, with confirmation when dependents exist.
  * Persist and validate a versioned dataset in localStorage, with explicit recovery for malformed, unsupported, unavailable, and failed-save states.
  * Detect external localStorage changes from other tabs, prevent silent stale overwrites, and let the user reload the latest data without automatic merging.
  * Keep domain validation, persistence, cross-tab conflict handling, and UI responsibilities separate.
  * Provide an accessible, responsive interface.

* **Out-of-Scope Non-Goals:**
  * Backend services, accounts, authentication, shared or cloud storage.
  * Automatic cross-tab synchronization or merging, and a guarantee of fully atomic cross-tab updates.
  * Data migrations, backups, export/import, or elaborate recovery tooling.
  * Search, priorities, due dates, categories, or a separate Blocked filter.
  * Automatic status cascades when dependencies change or tasks are deleted.
  * Distributed tracing or server-side telemetry.
  * General-purpose workflow engines, databases, or state-management frameworks.

## Alternatives Weighed

* **Store blocked as a task status:** Rejected during ideation because blocked state follows from completion and prerequisite data. Storing it separately could let it become stale.
* **Automatically reopen or complete dependent tasks:** Rejected during ideation because implicit cascades obscure the cause of status changes. Invalid operations instead explain what the user must change.
* **Delete a prerequisite without explaining the effect:** Rejected during ideation after review highlighted that dependents may become unblocked. Confirm deletion when direct dependents exist and state the effect.
* **Merge concurrent tab changes:** Rejected during ideation because localStorage has no fully atomic cross-tab transaction, and merge behavior adds complexity beyond the experiment. Detect conflicts and require explicit reload instead.
* **Add schema migrations now:** Rejected during ideation because this is an initial experiment with no existing data format to migrate. Version the envelope, preserve unsupported data, and defer migrations.
* **Add a backend or synchronization service:** Rejected during ideation because the goal is a local, single-user experiment.

## Key Decisions & Staging for Next Steps

* Keep the dependency graph as a core experiment requirement and enforce its invariants in a centralized domain layer.
* Treat blocked state as derived; validate the whole graph both on load and before mutations.
* Use one stable localStorage key and a `schemaVersion: 1` envelope. Do not migrate data in this scope. Increment the schema version for incompatible future changes and preserve data the app cannot read.
* Use a separate persistence boundary for storage states, retry, reset, and cross-tab notifications. Keep storage and conflict transitions out of individual UI components.
* A detected external change must block silent stale writes and offer an explicit reload path. Warn before discarding unsaved local changes. Do not imply this removes all cross-tab races.
* Update `updatedAt` when dependency cleanup changes a dependent task.
* Carry these decisions into `egm-draft`. Detailed component structure, exact storage key name, UI layout, and verification strategy can be settled in the formal design without changing the agreed product behavior.
