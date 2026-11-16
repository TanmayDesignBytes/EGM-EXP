export interface TaskStorageEvent {
  key: string | null;
  newValue: string | null;
}

export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: TaskStorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: TaskStorageEvent) => void): void;
}

export function subscribeToStorageChanges(
  target: StorageEventTarget,
  key: string,
  onChange: (newValue: string | null) => void,
): () => void {
  const listener = (event: TaskStorageEvent) => {
    if (event.key === key) onChange(event.newValue);
  };
  target.addEventListener('storage', listener);
  return () => target.removeEventListener('storage', listener);
}
