import type { Task, TaskFilter } from '../domain/tasks';

export type LoadStatus = 'loading' | 'ready' | 'recovery-required' | 'incompatible' | 'unavailable';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'not-persisted';
export type ConflictStatus = 'clear' | 'newer-data';

export interface LoadFailure {
  status: Exclude<LoadStatus, 'loading' | 'ready'>;
  message: string;
  rawValue: string | null;
}

export interface AppState {
  tasks: Task[];
  activeFilter: TaskFilter;
  loadStatus: LoadStatus;
  saveStatus: SaveStatus;
  conflictStatus: ConflictStatus;
  taskRevision: number;
  persistedRevision: number;
  loadMessage?: string;
  saveError?: string;
}

export type AppAction =
  | { type: 'LOAD_SUCCEEDED'; tasks: Task[]; rawValue: string | null }
  | { type: 'LOAD_FAILED'; outcome: LoadFailure }
  | { type: 'MUTATION_ACCEPTED'; tasks: Task[]; revision: number }
  | { type: 'SAVE_SUCCEEDED'; revision: number }
  | { type: 'SAVE_FAILED'; revision: number; reason: string }
  | { type: 'RETRY_SAVE'; revision: number }
  | { type: 'EXTERNAL_CHANGE'; newValue: string | null }
  | { type: 'RELOAD_SUCCEEDED'; tasks: Task[]; rawValue: string | null }
  | { type: 'RELOAD_FAILED'; outcome: LoadFailure }
  | { type: 'FILTER_CHANGED'; filter: TaskFilter }
  | { type: 'RESET_SUCCEEDED'; revision: number }
  | { type: 'RESET_FAILED'; reason: string };

export const initialAppState: AppState = {
  tasks: [], activeFilter: 'all', loadStatus: 'loading', saveStatus: 'idle',
  conflictStatus: 'clear', taskRevision: 0, persistedRevision: 0,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_SUCCEEDED':
      return {
        ...state, tasks: action.tasks, loadStatus: 'ready', saveStatus: 'saved',
        conflictStatus: 'clear', taskRevision: 0, persistedRevision: 0,
        loadMessage: undefined, saveError: undefined,
      };
    case 'LOAD_FAILED':
      return {
        ...state, loadStatus: action.outcome.status, loadMessage: action.outcome.message,
        saveStatus: 'idle', conflictStatus: 'clear',
      };
    case 'MUTATION_ACCEPTED':
      return {
        ...state, tasks: action.tasks, taskRevision: action.revision, loadStatus: 'ready',
        saveStatus: 'saving', saveError: undefined,
      };
    case 'SAVE_SUCCEEDED':
      if (action.revision !== state.taskRevision) return state;
      return { ...state, persistedRevision: action.revision, saveStatus: 'saved', saveError: undefined };
    case 'SAVE_FAILED':
      if (action.revision !== state.taskRevision) return state;
      return { ...state, saveStatus: 'not-persisted', saveError: action.reason };
    case 'RETRY_SAVE':
      if (action.revision !== state.taskRevision) return state;
      return { ...state, saveStatus: 'saving', saveError: undefined };
    case 'EXTERNAL_CHANGE':
      return { ...state, conflictStatus: 'newer-data' };
    case 'RELOAD_SUCCEEDED': {
      const revision = state.taskRevision + 1;
      return {
        ...state, tasks: action.tasks, taskRevision: revision, persistedRevision: revision,
        loadStatus: 'ready', saveStatus: 'saved', conflictStatus: 'clear',
        loadMessage: undefined, saveError: undefined,
      };
    }
    case 'RELOAD_FAILED':
      return {
        ...state, loadStatus: action.outcome.status, loadMessage: action.outcome.message,
      };
    case 'FILTER_CHANGED':
      return { ...state, activeFilter: action.filter };
    case 'RESET_SUCCEEDED':
      return {
        ...state, tasks: [], taskRevision: action.revision, persistedRevision: action.revision,
        loadStatus: 'ready', saveStatus: 'saved', conflictStatus: 'clear',
        loadMessage: undefined, saveError: undefined,
      };
    case 'RESET_FAILED':
      return { ...state, loadMessage: action.reason };
  }
}
