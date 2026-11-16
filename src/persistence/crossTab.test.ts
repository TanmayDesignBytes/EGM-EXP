import { describe, expect, it } from 'vitest';
import { subscribeToStorageChanges, type StorageEventTarget, type TaskStorageEvent } from './crossTab';

class FakeEventTarget implements StorageEventTarget {
  listeners = new Set<(event: TaskStorageEvent) => void>();
  addEventListener(_type: 'storage', listener: (event: TaskStorageEvent) => void): void { this.listeners.add(listener); }
  removeEventListener(_type: 'storage', listener: (event: TaskStorageEvent) => void): void { this.listeners.delete(listener); }
  fire(event: TaskStorageEvent): void { for (const listener of this.listeners) listener(event); }
}

describe('cross-tab storage subscription', () => {
  it('handles matching key changes and removals, ignores other keys, and cleans up', () => {
    const target = new FakeEventTarget();
    const received: (string | null)[] = [];
    const unsubscribe = subscribeToStorageChanges(target, 'local-task-manager', (value) => received.push(value));
    expect(target.listeners.size).toBe(1);
    target.fire({ key: 'other-key', newValue: 'ignored' });
    target.fire({ key: 'local-task-manager', newValue: '{"schemaVersion":1}' });
    target.fire({ key: 'local-task-manager', newValue: null });
    expect(received).toEqual(['{"schemaVersion":1}', null]);
    unsubscribe();
    expect(target.listeners.size).toBe(0);
    target.fire({ key: 'local-task-manager', newValue: 'after cleanup' });
    expect(received).toHaveLength(2);
  });
});
