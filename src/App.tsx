import { useCallback, useEffect, useReducer, useRef } from 'react';
import { appReducer, initialAppState } from './app/appReducer';
import {
  completeTask, createTask, deleteTask, editTask, reopenTask, type Result, type Task, type TaskInput,
} from './domain/tasks';
import { subscribeToStorageChanges, type StorageEventTarget } from './persistence/crossTab';
import { loadTasks, resetStoredTasks, saveTasks, STORAGE_KEY } from './persistence/taskStorage';
import TaskManagerView from './components/TaskManagerView';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const lastKnownRaw = useRef<string | null>(null);

  useEffect(() => {
    const outcome = loadTasks();
    lastKnownRaw.current = outcome.rawValue;
    if (outcome.ok) dispatch({ type: 'LOAD_SUCCEEDED', tasks: outcome.tasks, rawValue: outcome.rawValue });
    else dispatch({
      type: 'LOAD_FAILED',
      outcome: { status: outcome.status, message: outcome.message, rawValue: outcome.rawValue },
    });
  }, []);

  useEffect(() => subscribeToStorageChanges(
    window as unknown as StorageEventTarget,
    STORAGE_KEY,
    (newValue) => dispatch({ type: 'EXTERNAL_CHANGE', newValue }),
  ), []);

  const persist = useCallback((tasks: Task[], revision: number) => {
    const outcome = saveTasks(tasks, lastKnownRaw.current);
    if (outcome.ok) {
      lastKnownRaw.current = outcome.rawValue;
      dispatch({ type: 'SAVE_SUCCEEDED', revision });
      return;
    }
    if (outcome.kind === 'conflict') dispatch({ type: 'EXTERNAL_CHANGE', newValue: outcome.currentValue ?? null });
    dispatch({ type: 'SAVE_FAILED', revision, reason: outcome.message });
  }, []);

  const accept = useCallback((result: Result<Task[]>, revision: number): string | undefined => {
    if (!result.ok) return result.reason;
    dispatch({ type: 'MUTATION_ACCEPTED', tasks: result.value, revision });
    persist(result.value, revision);
    return undefined;
  }, [persist]);

  const onCreate = useCallback((input: TaskInput) => {
    const result = createTask(state.tasks, input, crypto.randomUUID(), new Date().toISOString());
    return accept(result, state.taskRevision + 1);
  }, [accept, state.tasks, state.taskRevision]);

  const onEdit = useCallback((id: string, input: TaskInput) =>
    accept(editTask(state.tasks, id, input, new Date().toISOString()), state.taskRevision + 1),
  [accept, state.tasks, state.taskRevision]);

  const onComplete = useCallback((id: string) =>
    accept(completeTask(state.tasks, id, new Date().toISOString()), state.taskRevision + 1),
  [accept, state.tasks, state.taskRevision]);

  const onReopen = useCallback((id: string) =>
    accept(reopenTask(state.tasks, id, new Date().toISOString()), state.taskRevision + 1),
  [accept, state.tasks, state.taskRevision]);

  const onDelete = useCallback((id: string) =>
    accept(deleteTask(state.tasks, id, new Date().toISOString()), state.taskRevision + 1),
  [accept, state.tasks, state.taskRevision]);

  const onRetry = useCallback(() => {
    dispatch({ type: 'RETRY_SAVE', revision: state.taskRevision });
    persist(state.tasks, state.taskRevision);
  }, [persist, state.taskRevision, state.tasks]);

  const onReload = useCallback(() => {
    const outcome = loadTasks();
    lastKnownRaw.current = outcome.rawValue;
    if (outcome.ok) dispatch({ type: 'RELOAD_SUCCEEDED', tasks: outcome.tasks, rawValue: outcome.rawValue });
    else dispatch({
      type: 'RELOAD_FAILED',
      outcome: { status: outcome.status, message: outcome.message, rawValue: outcome.rawValue },
    });
  }, []);

  const onReset = useCallback(() => {
    const outcome = resetStoredTasks(lastKnownRaw.current);
    if (outcome.ok) {
      lastKnownRaw.current = null;
      dispatch({ type: 'RESET_SUCCEEDED', revision: state.taskRevision + 1 });
    } else {
      if (outcome.kind === 'conflict') dispatch({ type: 'EXTERNAL_CHANGE', newValue: outcome.currentValue ?? null });
      dispatch({ type: 'RESET_FAILED', reason: outcome.message });
    }
  }, [state.taskRevision]);

  return (
    <TaskManagerView
      state={state}
      onCreate={onCreate}
      onEdit={onEdit}
      onComplete={onComplete}
      onReopen={onReopen}
      onDelete={onDelete}
      onRetry={onRetry}
      onReload={onReload}
      onReset={onReset}
      onFilterChange={(filter) => dispatch({ type: 'FILTER_CHANGED', filter })}
    />
  );
}
