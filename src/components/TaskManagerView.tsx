import { useState, type FormEvent } from 'react';
import {
  getDirectDependents, getIncompletePrerequisites, getTaskListView, isTaskBlocked,
  type Task, type TaskFilter, type TaskInput,
} from '../domain/tasks';
import type { AppState } from '../app/appReducer';

interface ViewProps {
  state: AppState;
  onCreate(input: TaskInput): string | undefined;
  onEdit(id: string, input: TaskInput): string | undefined;
  onComplete(id: string): string | undefined;
  onReopen(id: string): string | undefined;
  onDelete(id: string): string | undefined;
  onRetry(): void;
  onReload(): void;
  onReset(): void;
  onFilterChange(filter: TaskFilter): void;
}

interface FormProps {
  tasks: Task[];
  task?: Task;
  onSubmit(input: TaskInput): string | undefined;
  onCancel?: () => void;
}

function TaskForm({ tasks, task, onSubmit, onCancel }: FormProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dependencies, setDependencies] = useState<string[]>(task?.dependencies ?? []);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = onSubmit({ title, description: description || undefined, dependencies });
    if (message) setError(message);
    else {
      setError('');
      if (!task) {
        setTitle('');
        setDescription('');
        setDependencies([]);
      }
    }
  }

  function toggleDependency(id: string) {
    setDependencies((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <label className="field-label" htmlFor={task ? `edit-title-${task.id}` : 'new-title'}>Title</label>
      <input
        id={task ? `edit-title-${task.id}` : 'new-title'}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs to get done?"
        required
      />
      <label className="field-label" htmlFor={task ? `edit-description-${task.id}` : 'new-description'}>Description <span>Optional</span></label>
      <textarea
        id={task ? `edit-description-${task.id}` : 'new-description'}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Add a little context"
        rows={2}
      />
      <fieldset className="dependency-picker">
        <legend>Prerequisites <span>Complete these first</span></legend>
        {tasks.filter((candidate) => candidate.id !== task?.id).length === 0 ? (
          <p className="subtle-text">Create another task to add a prerequisite.</p>
        ) : (
          <div className="dependency-options">
            {tasks.filter((candidate) => candidate.id !== task?.id).map((candidate) => (
              <label className="check-option" key={candidate.id}>
                <input type="checkbox" checked={dependencies.includes(candidate.id)} onChange={() => toggleDependency(candidate.id)} />
                <span>{candidate.title}</span>
                {candidate.status === 'completed' && <small>Done</small>}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit">{task ? 'Save changes' : 'Add task'}</button>
        {onCancel && <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function TaskCard({
  task, tasks, editing, onEdit, onComplete, onReopen, onDelete,
}: {
  task: Task; tasks: Task[]; editing: boolean; onEdit(): void; onComplete(): string | undefined;
  onReopen(): string | undefined; onDelete(): string | undefined;
}) {
  const [error, setError] = useState('');
  const dependents = getDirectDependents(tasks, task.id);
  const incomplete = getIncompletePrerequisites(tasks, task);
  const byId = new Map(tasks.map((item) => [item.id, item]));
  const run = (callback: () => string | undefined) => {
    const message = callback();
    setError(message ?? '');
  };

  return (
    <li className={`task-card${isTaskBlocked(tasks, task) ? ' task-card-blocked' : ''}`}>
      <div className="task-card-top">
        <div>
          <div className="task-title-line">
            <h3>{task.title}</h3>
            {isTaskBlocked(tasks, task) && <span className="badge badge-blocked">Blocked</span>}
            {task.status === 'completed' && <span className="badge badge-done">Completed</span>}
          </div>
          {task.description && <p className="task-description">{task.description}</p>}
        </div>
        <time dateTime={task.createdAt} title={`Created ${new Date(task.createdAt).toLocaleString()}`}>
          {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </time>
      </div>

      {task.dependencies.length > 0 && (
        <div className="prerequisite-summary">
          <span className="summary-label">Prerequisites</span>
          {incomplete.length > 0 ? (
            <p className="blocked-reason">Waiting on {incomplete.map((item) => item.title).join(', ')}</p>
          ) : (
            <p>{task.dependencies.map((id) => byId.get(id)?.title ?? 'Unknown task').join(', ')}</p>
          )}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="task-actions">
        {task.status === 'active'
          ? <button className="button button-small button-primary" onClick={() => run(onComplete)}>Mark complete</button>
          : <button className="button button-small" onClick={() => run(onReopen)}>Reopen</button>}
        <button className="button button-small button-quiet" onClick={onEdit}>Edit</button>
        <button className="button button-small button-danger-quiet" onClick={() => run(onDelete)}>Delete</button>
        {dependents.length > 0 && <span className="dependent-note">{dependents.length} dependent{dependents.length === 1 ? '' : 's'}</span>}
      </div>
      {editing && <div className="inline-edit">Editing this task above.</div>}
    </li>
  );
}

export default function TaskManagerView(props: ViewProps) {
  const { state } = props;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const view = getTaskListView(state.tasks, state.activeFilter);
  const pendingDelete = state.tasks.find((task) => task.id === pendingDeleteId);
  const pendingDependents = pendingDelete ? getDirectDependents(state.tasks, pendingDelete.id) : [];

  if (state.loadStatus === 'loading') {
    return <main className="app-shell"><p className="loading-state" role="status">Loading your tasks…</p></main>;
  }

  if (state.loadStatus === 'recovery-required' || state.loadStatus === 'incompatible' || state.loadStatus === 'unavailable') {
    const unavailable = state.loadStatus === 'unavailable';
    return (
      <main className="app-shell">
        <header className="page-heading"><p className="eyebrow">LOCAL TASK MANAGER</p><h1>We couldn’t open your tasks</h1></header>
        {state.conflictStatus === 'newer-data' && (
          <section className="notice notice-conflict" role="alert">
            <div><strong>Saved data changed in another tab.</strong><p>Reload it before trying to reset this copy.</p></div>
            <button className="button button-small" onClick={() => {
              if (state.taskRevision !== state.persistedRevision && !window.confirm('Reload the latest data? Your unsaved changes in this tab will be discarded.')) return;
              props.onReload();
            }}>Reload latest data</button>
          </section>
        )}
        <section className="recovery-panel" aria-labelledby="recovery-title">
          <div className="recovery-icon" aria-hidden="true">!</div>
          <div>
            <h2 id="recovery-title">{unavailable ? 'Storage is unavailable' : state.loadStatus === 'incompatible' ? 'This saved format is not supported' : 'Saved data needs recovery'}</h2>
            <p>{state.loadMessage}</p>
            {!unavailable && <p>Your saved value is preserved until you confirm a reset.</p>}
            {!unavailable && (
              <button className="button button-danger" onClick={() => {
                if (window.confirm('Reset saved data? This will permanently remove the current saved value and start with an empty task list.')) props.onReset();
              }}>Reset saved data</button>
            )}
          </div>
        </section>
      </main>
    );
  }

  const filters: { id: TaskFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' },
  ];

  return (
    <main className="app-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">LOCAL TASK MANAGER</p>
          <h1>Make progress, <em>one thing at a time.</em></h1>
          <p className="page-intro">Keep tasks clear, and let prerequisites set the pace.</p>
        </div>
        <div className={`save-indicator save-${state.saveStatus}`} role="status" aria-live="polite">
          <span className="save-dot" />
          {state.saveStatus === 'idle' ? 'Loading' : state.saveStatus === 'saving' ? 'Saving' : state.saveStatus === 'saved' ? 'Saved locally' : 'Not saved'}
        </div>
      </header>

      {state.conflictStatus === 'newer-data' && (
        <section className="notice notice-conflict" role="alert">
          <div><strong>Newer data is available.</strong><p>This tab keeps its current tasks. Reload to use the latest saved version.</p></div>
          <button className="button button-small" onClick={() => {
            if (state.taskRevision !== state.persistedRevision && !window.confirm('Reload the latest data? Your unsaved changes in this tab will be discarded.')) return;
            props.onReload();
          }}>Reload latest data</button>
        </section>
      )}

      {state.saveStatus === 'not-persisted' && (
        <section className="notice notice-error" role="alert">
          <div><strong>Your latest changes are not persisted.</strong><p>{state.saveError ?? 'Storage did not accept the changes.'}</p></div>
          {state.conflictStatus === 'clear'
            ? <button className="button button-small" onClick={props.onRetry}>Retry save</button>
            : <span className="notice-hint">Reload the latest data to resolve the conflict.</span>}
        </section>
      )}

      <div className="content-grid">
        <aside className="composer-panel">
          {editingTaskId ? (
            <>
              <div className="section-heading"><span className="section-kicker">EDIT TASK</span><h2>Update the details</h2></div>
              {(() => {
                const editingTask = state.tasks.find((task) => task.id === editingTaskId);
                if (!editingTask) return null;
                return <TaskForm key={editingTask.id} tasks={state.tasks} task={editingTask} onSubmit={(input) => {
                  const error = props.onEdit(editingTask.id, input);
                  if (!error) setEditingTaskId(null);
                  return error;
                }} onCancel={() => setEditingTaskId(null)} />;
              })()}
            </>
          ) : (
            <>
              <div className="section-heading"><span className="section-kicker">NEW TASK</span><h2>What’s next?</h2></div>
              <TaskForm tasks={state.tasks} onSubmit={props.onCreate} />
            </>
          )}
          <div className="tiny-note"><span aria-hidden="true">↳</span> Prerequisites keep blocked work visible until it’s ready.</div>
        </aside>

        <section className="list-panel" aria-labelledby="tasks-heading">
          <div className="list-heading">
            <div><span className="section-kicker">YOUR WORK</span><h2 id="tasks-heading">Tasks <span className="total-count">{state.tasks.length}</span></h2></div>
            <div className="filter-tabs" role="group" aria-label="Filter tasks">
              {filters.map((filter) => (
                <button
                  className={`filter-tab${state.activeFilter === filter.id ? ' filter-tab-active' : ''}`}
                  aria-pressed={state.activeFilter === filter.id}
                  key={filter.id}
                  onClick={() => props.onFilterChange(filter.id)}
                >{filter.label}<span>{view.counts[filter.id]}</span></button>
              ))}
            </div>
          </div>

          {view.hiddenCount > 0 && <p className="hidden-count">{view.hiddenCount} task{view.hiddenCount === 1 ? '' : 's'} hidden by current filter.</p>}
          {view.tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-mark" aria-hidden="true">✳</div>
              <h3>{state.tasks.length === 0 ? 'A clear start.' : `No ${state.activeFilter} tasks right now.`}</h3>
              <p>{state.tasks.length === 0 ? 'Add a task to begin shaping your workflow.' : 'Try another filter to see the rest of your tasks.'}</p>
            </div>
          ) : (
            <ul className="task-list">
              {view.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  tasks={state.tasks}
                  editing={editingTaskId === task.id}
                  onEdit={() => setEditingTaskId(task.id)}
                  onComplete={() => props.onComplete(task.id)}
                  onReopen={() => props.onReopen(task.id)}
                  onDelete={() => {
                    const dependents = getDirectDependents(state.tasks, task.id);
                    if (dependents.length > 0) {
                      setPendingDeleteId(task.id);
                      setDeleteError('');
                      return undefined;
                    }
                    return props.onDelete(task.id);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {pendingDelete && (
        <div className="dialog-backdrop">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <span className="dialog-kicker">CONFIRM DELETION</span>
            <h2 id="delete-title">Delete “{pendingDelete.title}”?</h2>
            <p id="delete-description">This task will be deleted and its prerequisite references will be removed from {pendingDependents.length} directly dependent task{pendingDependents.length === 1 ? '' : 's'}. Some may become unblocked. Their completion status will stay the same.</p>
            <ul className="dependent-list">{pendingDependents.map((dependent) => <li key={dependent.id}>{dependent.title}</li>)}</ul>
            {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
            <div className="form-actions">
              <button className="button button-danger" onClick={() => {
                const error = props.onDelete(pendingDelete.id);
                if (error) setDeleteError(error);
                else setPendingDeleteId(null);
              }}>Delete task</button>
              <button className="button button-quiet" onClick={() => setPendingDeleteId(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
