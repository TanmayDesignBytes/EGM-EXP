import { describe, expect, it } from 'vitest';
import { loadTasks, resetStoredTasks, saveTasks, STORAGE_KEY, type StoragePort } from './taskStorage';
import type { Task } from '../domain/tasks';

class MemoryStorage implements StoragePort {
  value: string | null = null;
  failGet = false;
  failSet = false;
  failRemove = false;
  getItem(key: string): string | null {
    if (this.failGet) throw new Error('read denied');
    return key === STORAGE_KEY ? this.value : null;
  }
  setItem(key: string, value: string): void {
    if (this.failSet) throw new Error('quota exceeded');
    if (key === STORAGE_KEY) this.value = value;
  }
  removeItem(key: string): void {
    if (this.failRemove) throw new Error('remove denied');
    if (key === STORAGE_KEY) this.value = null;
  }
}

const task: Task = {
  id: 'a', title: 'Task A', status: 'active', dependencies: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('taskStorage', () => {
  it('loads an empty value and a valid version 1 envelope', () => {
    const storage = new MemoryStorage();
    expect(loadTasks(storage)).toMatchObject({ ok: true, tasks: [], rawValue: null });
    storage.value = JSON.stringify({ schemaVersion: 1, tasks: [task] });
    expect(loadTasks(storage)).toMatchObject({ ok: true, tasks: [task], rawValue: storage.value });
  });

  it('preserves malformed, unsupported, and invalid stored values for recovery', () => {
    const storage = new MemoryStorage();
    storage.value = '{';
    expect(loadTasks(storage)).toMatchObject({ ok: false, status: 'recovery-required', rawValue: '{' });
    storage.value = JSON.stringify({ schemaVersion: 2, tasks: [] });
    expect(loadTasks(storage)).toMatchObject({ ok: false, status: 'incompatible', rawValue: storage.value });
    storage.value = JSON.stringify({ schemaVersion: 1, tasks: [{ ...task, dependencies: ['missing'] }] });
    expect(loadTasks(storage)).toMatchObject({ ok: false, status: 'recovery-required', rawValue: storage.value });
  });

  it('reports storage acquisition and read errors instead of assuming empty data', () => {
    expect(loadTasks(undefined, () => { throw new Error('property blocked'); })).toMatchObject({
      ok: false, status: 'unavailable', message: 'Browser storage is unavailable: property blocked',
    });
    const storage = new MemoryStorage();
    storage.failGet = true;
    expect(loadTasks(storage)).toMatchObject({ ok: false, status: 'unavailable' });
  });

  it('compares before writing and reports write failures while retaining memory data at the caller', () => {
    const storage = new MemoryStorage();
    const saved = saveTasks([task], null, storage);
    expect(saved).toMatchObject({ ok: true });
    expect(JSON.parse(storage.value!).tasks).toEqual([task]);
    expect(saveTasks([task], null, storage)).toMatchObject({ ok: false, kind: 'conflict' });
    storage.failSet = true;
    expect(saveTasks([task], storage.value, storage)).toMatchObject({ ok: false, kind: 'failed' });
    storage.failSet = false;
    expect(saveTasks([task], storage.value, storage)).toMatchObject({ ok: true });
    expect(saveTasks([{ ...task, dependencies: ['missing'] }], storage.value, storage)).toMatchObject({ ok: false, kind: 'failed' });
  });

  it('checks expected data and reports reset success or failure', () => {
    const storage = new MemoryStorage();
    storage.value = 'corrupt';
    expect(resetStoredTasks(null, storage)).toMatchObject({ ok: false, kind: 'conflict' });
    expect(resetStoredTasks('corrupt', storage)).toEqual({ ok: true, rawValue: null });
    storage.value = 'corrupt';
    storage.failRemove = true;
    expect(resetStoredTasks('corrupt', storage)).toMatchObject({ ok: false, kind: 'failed' });
    expect(storage.value).toBe('corrupt');
  });
});
