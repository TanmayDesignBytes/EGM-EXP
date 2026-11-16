import { describe, expect, it } from 'vitest';
import { appReducer, initialAppState, type AppState } from './appReducer';
import type { Task } from '../domain/tasks';

const task: Task = {
  id: 'a', title: 'A', status: 'active', dependencies: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const readyState: AppState = {
  ...initialAppState, tasks: [task], loadStatus: 'ready', saveStatus: 'saved',
};

describe('appReducer', () => {
  it('loads data and marks a mutation as saving', () => {
    const loaded = appReducer(initialAppState, { type: 'LOAD_SUCCEEDED', tasks: [task], rawValue: null });
    expect(loaded).toMatchObject({ tasks: [task], loadStatus: 'ready', saveStatus: 'saved' });
    expect(appReducer(loaded, { type: 'MUTATION_ACCEPTED', tasks: [], revision: 1 })).toMatchObject({
      tasks: [], taskRevision: 1, saveStatus: 'saving',
    });
  });

  it('keeps memory data on failed save and accepts retry outcomes only for current revision', () => {
    const changed = appReducer(readyState, { type: 'MUTATION_ACCEPTED', tasks: [task], revision: 1 });
    const failed = appReducer(changed, { type: 'SAVE_FAILED', revision: 1, reason: 'Quota exceeded.' });
    expect(failed).toMatchObject({ tasks: [task], saveStatus: 'not-persisted', saveError: 'Quota exceeded.' });
    const retrying = appReducer(failed, { type: 'RETRY_SAVE', revision: 1 });
    expect(retrying.saveStatus).toBe('saving');
    expect(appReducer(retrying, { type: 'SAVE_SUCCEEDED', revision: 1 })).toMatchObject({
      saveStatus: 'saved', persistedRevision: 1,
    });
    expect(appReducer(failed, { type: 'SAVE_SUCCEEDED', revision: 0 })).toBe(failed);
  });

  it('sets conflict without replacing local data and replaces data on reload with a new revision', () => {
    const changed = appReducer(readyState, { type: 'MUTATION_ACCEPTED', tasks: [task], revision: 1 });
    const conflict = appReducer(changed, { type: 'EXTERNAL_CHANGE', newValue: '{"newer":true}' });
    expect(conflict).toMatchObject({ tasks: [task], conflictStatus: 'newer-data' });
    const reloaded = appReducer(conflict, { type: 'RELOAD_SUCCEEDED', tasks: [], rawValue: 'null' });
    expect(reloaded).toMatchObject({ tasks: [], taskRevision: 2, persistedRevision: 2, saveStatus: 'saved', conflictStatus: 'clear' });
    expect(appReducer(reloaded, { type: 'SAVE_FAILED', revision: 1, reason: 'late' })).toBe(reloaded);
  });

  it('ignores save results from earlier datasets after reload or reset', () => {
    const changed = appReducer(readyState, { type: 'MUTATION_ACCEPTED', tasks: [task], revision: 1 });
    const reloaded = appReducer(changed, { type: 'RELOAD_SUCCEEDED', tasks: [], rawValue: null });
    expect(appReducer(reloaded, { type: 'SAVE_SUCCEEDED', revision: 1 })).toBe(reloaded);
    expect(appReducer(reloaded, { type: 'SAVE_FAILED', revision: 1, reason: 'late error' })).toBe(reloaded);
    const reset = appReducer(changed, { type: 'RESET_SUCCEEDED', revision: 2 });
    expect(appReducer(reset, { type: 'SAVE_SUCCEEDED', revision: 1 })).toBe(reset);
    expect(appReducer(reset, { type: 'SAVE_FAILED', revision: 1, reason: 'late error' })).toBe(reset);
  });

  it('records load recovery outcomes and leaves tasks intact on reload failure', () => {
    const failed = appReducer(initialAppState, {
      type: 'LOAD_FAILED', outcome: { status: 'recovery-required', message: 'Invalid data.', rawValue: '{' },
    });
    expect(failed).toMatchObject({ loadStatus: 'recovery-required', loadMessage: 'Invalid data.' });
    expect(appReducer(readyState, {
      type: 'RELOAD_FAILED', outcome: { status: 'unavailable', message: 'Storage unavailable.', rawValue: null },
    })).toMatchObject({ tasks: [task], loadStatus: 'unavailable' });
  });
});
