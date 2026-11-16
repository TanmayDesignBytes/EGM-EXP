import { describe, expect, it } from 'vitest';
import {
  completeTask, createTask, deleteTask, editTask, getTaskListView, getDirectDependents,
  isTaskBlocked, reopenTask, validateTaskDataset, type Task,
} from './tasks';

const t0 = '2026-01-01T00:00:00.000Z';
const t1 = '2026-01-02T00:00:00.000Z';
const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id, title: `Task ${id}`, status: 'active', dependencies: [], createdAt: t0, updatedAt: t0, ...overrides,
});

describe('task domain', () => {
  it('trims titles on creation and rejects blank titles, IDs, and timestamps', () => {
    expect(createTask([], { title: '  Write brief  ', dependencies: [] }, 'new', t0)).toMatchObject({
      ok: true, value: [{ id: 'new', title: 'Write brief', status: 'active' }],
    });
    expect(createTask([], { title: '   ', dependencies: [] }, 'new', t0).ok).toBe(false);
    expect(createTask([], { title: 'Valid', dependencies: [] }, '  ', t0).ok).toBe(false);
    expect(createTask([], { title: 'Valid', dependencies: [] }, 'new', 'not a date').ok).toBe(false);
  });

  it('validates IDs, timestamps, references, duplicate dependencies, and cycles across a dataset', () => {
    expect(validateTaskDataset([task('x'), task('x')]).ok).toBe(false);
    expect(validateTaskDataset([{ ...task('x'), createdAt: 'yesterday' }]).ok).toBe(false);
    expect(validateTaskDataset([task('x', { dependencies: ['missing'] })]).ok).toBe(false);
    expect(validateTaskDataset([task('x', { dependencies: ['x'] })]).ok).toBe(false);
    expect(validateTaskDataset([task('x', { dependencies: ['y'] }), task('y', { dependencies: ['x'] })])).toMatchObject({
      ok: false, reason: 'The task dependencies contain a circular relationship.',
    });
    expect(validateTaskDataset([task('x', { dependencies: ['y', 'y'] }), task('y')]).ok).toBe(false);
    expect(validateTaskDataset([
      task('x', { status: 'completed', dependencies: ['y'] }), task('y', { title: 'Still open' }),
    ])).toMatchObject({ ok: false, reason: 'Completed task “Task x” has incomplete prerequisite “Still open”.' });
  });

  it('supports multiple prerequisites and explains blocked completion', () => {
    const tasks = [task('a', { title: 'Design' }), task('b', { title: 'Review' }), task('c', { dependencies: ['a', 'b'] })];
    expect(isTaskBlocked(tasks, tasks[2]!)).toBe(true);
    expect(completeTask(tasks, 'c', t1)).toMatchObject({ ok: false, reason: 'Complete these prerequisites first: Design, Review.' });
    const ready = tasks.map((item) => item.id === 'a' || item.id === 'b' ? { ...item, status: 'completed' as const } : item);
    expect(completeTask(ready, 'c', t1)).toMatchObject({ ok: true });
  });

  it('allows title and description edits on completed tasks but rejects incomplete prerequisites', () => {
    const tasks = [task('a', { status: 'completed' }), task('b', { status: 'completed', dependencies: ['a'] })];
    expect(editTask(tasks, 'b', { title: '  Updated  ', description: 'notes', dependencies: ['a'] }, t1)).toMatchObject({
      ok: true, value: [{ id: 'a' }, { id: 'b', title: 'Updated', description: 'notes', status: 'completed' }],
    });
    expect(editTask(tasks, 'b', { title: 'Updated', dependencies: [] }, 'bad').ok).toBe(false);
    const activePrerequisite = [task('a'), { ...tasks[1]!, dependencies: [] }];
    expect(editTask(activePrerequisite, 'b', { title: 'Completed', dependencies: ['a'] }, t1)).toMatchObject({
      ok: false, reason: 'A completed task can only use completed prerequisites. Incomplete: Task a.',
    });
  });

  it('rejects cycles introduced through edits without mutating input', () => {
    const tasks = [task('a'), task('b', { dependencies: ['a'] })];
    const result = editTask(tasks, 'a', { title: 'Task a', dependencies: ['b'] }, t1);
    expect(result.ok).toBe(false);
    expect(tasks[0]!.dependencies).toEqual([]);
  });

  it('prevents reopening while a completed dependent exists and names that dependent', () => {
    const tasks = [task('a', { status: 'completed' }), task('b', { status: 'completed', dependencies: ['a'], title: 'Ship release' })];
    expect(reopenTask(tasks, 'a', t1)).toMatchObject({ ok: false, reason: 'Reopen these completed dependent tasks first: Ship release.' });
    expect(reopenTask(tasks, 'b', t1).ok).toBe(true);
  });

  it('deletes a prerequisite atomically, cleans references, updates dependent timestamps, and preserves statuses', () => {
    const tasks = [
      task('a', { status: 'completed' }),
      task('b', { dependencies: ['a'], status: 'active' }),
      task('c', { dependencies: ['a'], status: 'completed' }),
    ];
    expect(getDirectDependents(tasks, 'a')).toHaveLength(2);
    const result = deleteTask(tasks, 'a', t1);
    expect(result).toMatchObject({ ok: true, value: [
      { id: 'b', dependencies: [], status: 'active', updatedAt: t1 },
      { id: 'c', dependencies: [], status: 'completed', updatedAt: t1 },
    ] });
    expect(tasks[1]!.dependencies).toEqual(['a']);
    expect(deleteTask(tasks, 'a', 'bad').ok).toBe(false);
  });

  it('filters without mutating and sorts newest first with ID ascending tie-break', () => {
    const tasks = [
      task('c', { createdAt: t1 }), task('a', { createdAt: t1 }), task('b', { status: 'completed', createdAt: t0 }),
    ];
    const view = getTaskListView(tasks, 'active');
    expect(view.tasks.map((item) => item.id)).toEqual(['a', 'c']);
    expect(view.counts).toEqual({ all: 3, active: 2, completed: 1 });
    expect(view.hiddenCount).toBe(1);
    expect(tasks.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
