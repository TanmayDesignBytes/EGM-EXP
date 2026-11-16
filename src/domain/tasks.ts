export type TaskStatus = 'active' | 'completed';
export type TaskFilter = 'all' | 'active' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  dependencies: string[];
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export interface TaskListView {
  tasks: Task[];
  counts: Record<TaskFilter, number>;
  hiddenCount: number;
}

export function isValidUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function asTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' && task.id.trim().length > 0 &&
    typeof task.title === 'string' && task.title.length > 0 && task.title.trim() === task.title &&
    (task.description === undefined || typeof task.description === 'string') &&
    (task.status === 'active' || task.status === 'completed') &&
    Array.isArray(task.dependencies) && task.dependencies.every((id) => typeof id === 'string') &&
    isValidUtcTimestamp(task.createdAt) && isValidUtcTimestamp(task.updatedAt)
  );
}

export function validateTaskDataset(value: unknown): Result<Task[]> {
  if (!Array.isArray(value)) return { ok: false, reason: 'The task data must be a list.' };
  if (!value.every(asTask)) {
    return { ok: false, reason: 'A task has invalid fields, an invalid ID, or an invalid timestamp.' };
  }

  const tasks = value as Task[];
  const byId = new Map<string, Task>();
  for (const task of tasks) {
    if (byId.has(task.id)) return { ok: false, reason: `Task ID “${task.id}” is duplicated.` };
    byId.set(task.id, task);
  }

  for (const task of tasks) {
    const seen = new Set<string>();
    for (const dependencyId of task.dependencies) {
      if (dependencyId === task.id) return { ok: false, reason: `Task “${task.title}” cannot depend on itself.` };
      if (seen.has(dependencyId)) return { ok: false, reason: `Task “${task.title}” has a duplicate prerequisite.` };
      seen.add(dependencyId);
      const prerequisite = byId.get(dependencyId);
      if (!prerequisite) return { ok: false, reason: `Task “${task.title}” refers to a missing prerequisite.` };
      if (task.status === 'completed' && prerequisite.status !== 'completed') {
        return { ok: false, reason: `Completed task “${task.title}” has incomplete prerequisite “${prerequisite.title}”.` };
      }
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    const task = byId.get(id)!;
    for (const dependencyId of task.dependencies) {
      if (!visit(dependencyId)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const task of tasks) {
    if (!visit(task.id)) return { ok: false, reason: 'The task dependencies contain a circular relationship.' };
  }

  return { ok: true, value: tasks };
}

function validCurrent(tasks: Task[]): string | undefined {
  const result = validateTaskDataset(tasks);
  return result.ok ? undefined : result.reason;
}

function cleanInput(input: TaskInput): Result<TaskInput> {
  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    return { ok: false, reason: 'Enter a task title.' };
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    return { ok: false, reason: 'The description must be text.' };
  }
  if (!Array.isArray(input.dependencies) || !input.dependencies.every((id) => typeof id === 'string')) {
    return { ok: false, reason: 'Choose valid prerequisites.' };
  }
  if (new Set(input.dependencies).size !== input.dependencies.length) {
    return { ok: false, reason: 'A prerequisite can only be selected once.' };
  }
  return {
    ok: true,
    value: { title: input.title.trim(), description: input.description, dependencies: [...input.dependencies] },
  };
}

export function createTask(
  tasks: Task[], input: TaskInput, id: string, now: string,
): Result<Task[]> {
  const currentError = validCurrent(tasks);
  if (currentError) return { ok: false, reason: currentError };
  const cleaned = cleanInput(input);
  if (!cleaned.ok) return cleaned;
  if (typeof id !== 'string' || id.trim().length === 0 || tasks.some((task) => task.id === id)) {
    return { ok: false, reason: 'A valid unique task ID is required.' };
  }
  if (!isValidUtcTimestamp(now)) return { ok: false, reason: 'A valid UTC timestamp is required.' };

  const task: Task = {
    id, title: cleaned.value.title, status: 'active', dependencies: cleaned.value.dependencies,
    createdAt: now, updatedAt: now,
    ...(cleaned.value.description !== undefined ? { description: cleaned.value.description } : {}),
  };
  const result = validateTaskDataset([...tasks, task]);
  return result.ok ? result : { ok: false, reason: result.reason };
}

export function editTask(tasks: Task[], id: string, input: TaskInput, now: string): Result<Task[]> {
  const currentError = validCurrent(tasks);
  if (currentError) return { ok: false, reason: currentError };
  const existing = tasks.find((task) => task.id === id);
  if (!existing) return { ok: false, reason: 'The task no longer exists.' };
  const cleaned = cleanInput(input);
  if (!cleaned.ok) return cleaned;
  if (!isValidUtcTimestamp(now)) return { ok: false, reason: 'A valid UTC timestamp is required.' };
  const updated: Task = {
    ...existing,
    title: cleaned.value.title,
    dependencies: cleaned.value.dependencies,
    updatedAt: now,
    description: cleaned.value.description,
  };
  if (updated.status === 'completed') {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const incomplete = updated.dependencies
      .map((dependencyId) => byId.get(dependencyId))
      .filter((prerequisite): prerequisite is Task => prerequisite !== undefined && prerequisite.status !== 'completed');
    if (incomplete.length) {
      return { ok: false, reason: `A completed task can only use completed prerequisites. Incomplete: ${incomplete.map((item) => item.title).join(', ')}.` };
    }
  }
  const result = validateTaskDataset(tasks.map((task) => task.id === id ? updated : task));
  return result.ok ? result : { ok: false, reason: result.reason };
}

export function getDirectDependents(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.dependencies.includes(id));
}

export function getIncompletePrerequisites(tasks: Task[], task: Task): Task[] {
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));
  return task.dependencies
    .map((dependencyId) => byId.get(dependencyId))
    .filter((prerequisite): prerequisite is Task => prerequisite !== undefined && prerequisite.status !== 'completed');
}

export function completeTask(tasks: Task[], id: string, now: string): Result<Task[]> {
  const currentError = validCurrent(tasks);
  if (currentError) return { ok: false, reason: currentError };
  const task = tasks.find((candidate) => candidate.id === id);
  if (!task) return { ok: false, reason: 'The task no longer exists.' };
  if (task.status === 'completed') return { ok: false, reason: 'This task is already completed.' };
  const blockedBy = getIncompletePrerequisites(tasks, task);
  if (blockedBy.length) return { ok: false, reason: `Complete these prerequisites first: ${blockedBy.map((item) => item.title).join(', ')}.` };
  if (!isValidUtcTimestamp(now)) return { ok: false, reason: 'A valid UTC timestamp is required.' };
  const result = validateTaskDataset(tasks.map((candidate) => candidate.id === id
    ? { ...candidate, status: 'completed' as const, updatedAt: now }
    : candidate));
  return result.ok ? result : { ok: false, reason: result.reason };
}

export function reopenTask(tasks: Task[], id: string, now: string): Result<Task[]> {
  const currentError = validCurrent(tasks);
  if (currentError) return { ok: false, reason: currentError };
  const task = tasks.find((candidate) => candidate.id === id);
  if (!task) return { ok: false, reason: 'The task no longer exists.' };
  if (task.status === 'active') return { ok: false, reason: 'This task is already active.' };
  const completedDependents = getDirectDependents(tasks, id).filter((dependent) => dependent.status === 'completed');
  if (completedDependents.length) {
    return { ok: false, reason: `Reopen these completed dependent tasks first: ${completedDependents.map((item) => item.title).join(', ')}.` };
  }
  if (!isValidUtcTimestamp(now)) return { ok: false, reason: 'A valid UTC timestamp is required.' };
  const result = validateTaskDataset(tasks.map((candidate) => candidate.id === id
    ? { ...candidate, status: 'active' as const, updatedAt: now }
    : candidate));
  return result.ok ? result : { ok: false, reason: result.reason };
}

export function deleteTask(tasks: Task[], id: string, now: string): Result<Task[]> {
  const currentError = validCurrent(tasks);
  if (currentError) return { ok: false, reason: currentError };
  if (!tasks.some((task) => task.id === id)) return { ok: false, reason: 'The task no longer exists.' };
  if (!isValidUtcTimestamp(now)) return { ok: false, reason: 'A valid UTC timestamp is required.' };
  const result = validateTaskDataset(tasks
    .filter((task) => task.id !== id)
    .map((task) => task.dependencies.includes(id)
      ? { ...task, dependencies: task.dependencies.filter((dependencyId) => dependencyId !== id), updatedAt: now }
      : task));
  return result.ok ? result : { ok: false, reason: result.reason };
}

export function isTaskBlocked(tasks: Task[], task: Task): boolean {
  return task.status === 'active' && getIncompletePrerequisites(tasks, task).length > 0;
}

export function getTaskListView(tasks: Task[], filter: TaskFilter): TaskListView {
  const sorted = [...tasks].sort((a, b) =>
    (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? 1 : -1) ||
    (a.id === b.id ? 0 : a.id < b.id ? -1 : 1));
  const visible = sorted.filter((task) => filter === 'all' || task.status === filter);
  return {
    tasks: visible,
    counts: {
      all: tasks.length,
      active: tasks.filter((task) => task.status === 'active').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    },
    hiddenCount: tasks.length - visible.length,
  };
}
