import { validateTaskDataset, type Task } from '../domain/tasks';

export const STORAGE_KEY = 'local-task-manager';
export const SCHEMA_VERSION = 1;

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadOutcome =
  | { ok: true; tasks: Task[]; rawValue: string | null }
  | { ok: false; status: 'recovery-required' | 'incompatible' | 'unavailable'; message: string; rawValue: string | null };

export type SaveOutcome =
  | { ok: true; rawValue: string }
  | { ok: false; kind: 'conflict' | 'unavailable' | 'failed'; message: string; currentValue?: string | null };

export type ResetOutcome =
  | { ok: true; rawValue: null }
  | { ok: false; kind: 'conflict' | 'unavailable' | 'failed'; message: string; currentValue?: string | null };

type StorageAccessor = () => StoragePort;

function resolveStorage(storage?: StoragePort, accessor: StorageAccessor = () => window.localStorage): StoragePort {
  if (storage) return storage;
  return accessor();
}

function storageUnavailableMessage(error: unknown): string {
  return error instanceof Error ? `Browser storage is unavailable: ${error.message}` : 'Browser storage is unavailable.';
}

export function loadTasks(storage?: StoragePort, accessor?: StorageAccessor): LoadOutcome {
  let rawValue: string | null = null;
  try {
    rawValue = resolveStorage(storage, accessor).getItem(STORAGE_KEY);
  } catch (error) {
    return { ok: false, status: 'unavailable', message: storageUnavailableMessage(error), rawValue: null };
  }
  if (rawValue === null) return { ok: true, tasks: [], rawValue: null };

  let envelope: unknown;
  try {
    envelope = JSON.parse(rawValue) as unknown;
  } catch {
    return { ok: false, status: 'recovery-required', message: 'Saved task data is not valid JSON. Reset it to start with an empty list.', rawValue };
  }
  if (typeof envelope !== 'object' || envelope === null || !('schemaVersion' in envelope)) {
    return { ok: false, status: 'recovery-required', message: 'Saved task data does not have the expected format. Reset it to start with an empty list.', rawValue };
  }
  const record = envelope as { schemaVersion?: unknown; tasks?: unknown };
  if (record.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, status: 'incompatible', message: `Saved task data uses unsupported schema version ${String(record.schemaVersion)}. Reset it to start with an empty list.`, rawValue };
  }
  if (!Array.isArray(record.tasks)) {
    return { ok: false, status: 'recovery-required', message: 'Saved task data has an invalid task list. Reset it to start with an empty list.', rawValue };
  }
  const validation = validateTaskDataset(record.tasks);
  if (!validation.ok) {
    return { ok: false, status: 'recovery-required', message: `Saved task data is invalid: ${validation.reason} Reset it to start with an empty list.`, rawValue };
  }
  return { ok: true, tasks: validation.value, rawValue };
}

type WriteCheck =
  | { ok: true; storage: StoragePort }
  | { ok: false; kind: 'conflict' | 'unavailable'; message: string; currentValue?: string | null };

function readForWrite(storage: StoragePort, expectedRaw: string | null): WriteCheck {
  try {
    const currentValue = storage.getItem(STORAGE_KEY);
    if (currentValue !== expectedRaw) {
      return { ok: false, kind: 'conflict', currentValue, message: 'Saved data changed in another tab. Reload the latest data before saving.' };
    }
    return { ok: true, storage };
  } catch (error) {
    return { ok: false, kind: 'unavailable', message: storageUnavailableMessage(error) };
  }
}

export function saveTasks(
  tasks: Task[], expectedRaw: string | null, storage?: StoragePort, accessor?: StorageAccessor,
): SaveOutcome {
  const validation = validateTaskDataset(tasks);
  if (!validation.ok) return { ok: false, kind: 'failed', message: `Invalid task data was not saved: ${validation.reason}` };
  let target: StoragePort;
  try {
    target = resolveStorage(storage, accessor);
  } catch (error) {
    return { ok: false, kind: 'unavailable', message: storageUnavailableMessage(error) };
  }
  const comparison = readForWrite(target, expectedRaw);
  if (!comparison.ok) return comparison;
  const rawValue = JSON.stringify({ schemaVersion: SCHEMA_VERSION, tasks: validation.value });
  try {
    comparison.storage.setItem(STORAGE_KEY, rawValue);
    return { ok: true, rawValue };
  } catch (error) {
    return { ok: false, kind: 'failed', message: error instanceof Error ? `Changes were not saved: ${error.message}` : 'Changes were not saved.' };
  }
}

export function resetStoredTasks(
  expectedRaw: string | null, storage?: StoragePort, accessor?: StorageAccessor,
): ResetOutcome {
  let target: StoragePort;
  try {
    target = resolveStorage(storage, accessor);
  } catch (error) {
    return { ok: false, kind: 'unavailable', message: storageUnavailableMessage(error) };
  }
  const comparison = readForWrite(target, expectedRaw);
  if (!comparison.ok) return comparison;
  try {
    comparison.storage.removeItem(STORAGE_KEY);
    return { ok: true, rawValue: null };
  } catch (error) {
    return { ok: false, kind: 'failed', message: error instanceof Error ? `Reset did not complete: ${error.message}` : 'Reset did not complete.' };
  }
}
