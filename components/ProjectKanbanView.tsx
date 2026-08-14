import React, { useState } from 'react';
import { Todo, Project, Priority } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import ConfirmationModal from './ConfirmationModal';

interface ProjectKanbanViewProps {
  project: Project;
  projectTasks: Todo[];
  allProjects: Project[];
  toggleTodo: (id: number) => void;
  toggleSubtask: (taskId: number, subtaskId: number) => void;
  deleteTodo: (id: number) => void;
  updateTodo: (todo: Todo) => void;
  onEditTodo: (todo: Todo) => void;
  onBack: () => void;
  onOpenProjectEditor?: (project: Project) => void;
  onUpdateProject: (projectId: number, name: string, emoji: string | null, color: string | null, kanban_columns?: string[]) => Promise<void>;
  addTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean }) => Promise<void>;
}

const DEFAULT_COLUMNS = ['Por hacer', 'En progreso', 'Completado'];

const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  project,
  projectTasks,
  toggleTodo,
  deleteTodo,
  updateTodo,
  onEditTodo,
  onBack,
  onOpenProjectEditor,
  onUpdateProject,
  addTodo
}) => {
  const columns = project.kanban_columns && project.kanban_columns.length > 0 
    ? project.kanban_columns 
    : DEFAULT_COLUMNS;

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const [newTaskInputColumn, setNewTaskInputColumn] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Helper to determine task's current column
  const getTaskColumn = (task: Todo): string => {
    if (task.kanban_column && columns.includes(task.kanban_column)) {
      return task.kanban_column;
    }
    if (task.completed) {
      return columns[columns.length - 1]; // Last column (Completado)
    }
    return columns[0]; // First column (Por hacer)
  };

  const tasksByColumn: Record<string, Todo[]> = {};
  columns.forEach(col => { tasksByColumn[col] = []; });

  projectTasks.forEach(task => {
    const col = getTaskColumn(task);
    if (tasksByColumn[col]) {
      tasksByColumn[col].push(task);
    } else {
      tasksByColumn[columns[0]].push(task);
    }
  });

  const handleMoveTask = (task: Todo, targetColumn: string) => {
    const isLastColumn = targetColumn === columns[columns.length - 1];
    const isCompleted = isLastColumn ? true : (targetColumn === columns[0] ? false : task.completed);
    
    const updated: Todo = {
      ...task,
      kanban_column: targetColumn,
      completed: isCompleted
    };
    updateTodo(updated);
  };

  const handleAddColumn = async () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (columns.includes(trimmed)) return;

    const newCols = [...columns, trimmed];
    await onUpdateProject(project.id, project.name, project.emoji || null, project.color || null, newCols);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleRenameColumn = async (index: number) => {
    const trimmed = editingColumnName.trim();
    if (!trimmed || trimmed === columns[index]) {
      setEditingColumnIndex(null);
      return;
    }

    const oldName = columns[index];
    const newCols = [...columns];
    newCols[index] = trimmed;

    // Update tasks in old column name
    projectTasks.forEach(task => {
      if (getTaskColumn(task) === oldName) {
        updateTodo({ ...task, kanban_column: trimmed });
      }
    });

    await onUpdateProject(project.id, project.name, project.emoji || null, project.color || null, newCols);
    setEditingColumnIndex(null);
    setEditingColumnName('');
  };

  const handleDeleteColumnConfirm = async () => {
    if (!columnToDelete) return;
    if (columns.length <= 1) return;

    const remainingCols = columns.filter(c => c !== columnToDelete);
    const fallbackCol = remainingCols[0];

    // Reassign tasks from deleted column
    projectTasks.forEach(task => {
      if (getTaskColumn(task) === columnToDelete) {
        updateTodo({ ...task, kanban_column: fallbackCol });
      }
    });

    await onUpdateProject(project.id, project.name, project.emoji || null, project.color || null, remainingCols);
    setColumnToDelete(null);
  };

  const handleCreateTaskInColumn = async (columnName: string) => {
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    await addTodo(trimmed, { projectId: project.id });
    
    // Find newly added todo or assign kanban_column
    setTimeout(() => {
      const added = projectTasks.find(t => t.text === trimmed && !t.kanban_column);
      if (added) {
        const isLastCol = columnName === columns[columns.length - 1];
        updateTodo({ ...added, kanban_column: columnName, completed: isLastCol });
      }
    }, 150);

    setNewTaskText('');
    setNewTaskInputColumn(null);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    setDragOverColumn(columnName);
  };

  const handleDrop = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;

    const task = projectTasks.find(t => t.id === draggedTaskId);
    if (task) {
      handleMoveTask(task, columnName);
    }
    setDraggedTaskId(null);
  };

  const completedCount = projectTasks.filter(t => t.completed).length;
  const progressPercent = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Header Bar */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            title="Volver"
          >
            <ChevronLeftIcon />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            {project.emoji && <span className="text-xl flex-shrink-0">{project.emoji}</span>}
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {project.name}
            </h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
              {completedCount}/{projectTasks.length} ({progressPercent}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Tablero
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Lista
            </button>
          </div>

          {onOpenProjectEditor && (
            <button
              onClick={() => onOpenProjectEditor(project)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            >
              Editar
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
          <div className="flex items-start gap-4 h-full min-w-max pb-2">
            {columns.map((col, index) => {
              const tasks = tasksByColumn[col] || [];
              const isOver = dragOverColumn === col;

              return (
                <div
                  key={col}
                  onDragOver={(e) => handleDragOver(e, col)}
                  onDrop={(e) => handleDrop(e, col)}
                  className={`w-72 sm:w-80 flex-shrink-0 bg-slate-100/80 dark:bg-slate-900/80 border ${
                    isOver ? 'border-slate-400 dark:border-slate-500 bg-slate-200/60 dark:bg-slate-800/60' : 'border-slate-200 dark:border-slate-800'
                  } rounded-xl flex flex-col max-h-full transition-colors`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    {editingColumnIndex === index ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editingColumnName || ''}
                          onChange={(e) => setEditingColumnName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameColumn(index)}
                          autoFocus
                          className="w-full px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-hidden"
                        />
                        <button
                          onClick={() => handleRenameColumn(index)}
                          className="px-2 py-1 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 
                            className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline"
                            onClick={() => {
                              setEditingColumnIndex(index);
                              setEditingColumnName(col);
                            }}
                          >
                            {col}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {tasks.length}
                          </span>
                        </div>

                        {columns.length > 1 && (
                          <button
                            onClick={() => setColumnToDelete(col)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                            title="Eliminar columna"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Task List in Column */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar min-h-[100px]">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTodo(task.id)}
                            className="mt-0.5 h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p 
                              onClick={() => onEditTodo(task)}
                              className={`text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-slate-900 dark:hover:text-white leading-snug ${
                                task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {task.text}
                            </p>

                            {/* Badges & Meta */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {/* Priority */}
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                task.priority === 'high'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/30'
                                  : task.priority === 'medium'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/30'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}>
                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>

                              {/* Due Date */}
                              {task.due_date && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                  {task.due_date}
                                </span>
                              )}

                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Menu */}
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => deleteTodo(task.id)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                              title="Eliminar tarea"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Move column select */}
                        {columns.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">Mover:</span>
                            <select
                              value={col}
                              onChange={(e) => handleMoveTask(task, e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] px-1.5 py-0.5 focus:outline-hidden"
                            >
                              {columns.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}

                    {tasks.length === 0 && (
                      <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
                        Sin tareas en esta columna
                      </p>
                    )}
                  </div>

                  {/* Add task in column button/input */}
                  <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800">
                    {newTaskInputColumn === col ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Nombre de la tarea..."
                          value={newTaskText || ''}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateTaskInColumn(col)}
                          autoFocus
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setNewTaskInputColumn(null); setNewTaskText(''); }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleCreateTaskInColumn(col)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setNewTaskInputColumn(col); setNewTaskText(''); }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Añadir tarea</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Column Button */}
            <div className="w-72 sm:w-80 flex-shrink-0">
              {isAddingColumn ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Nueva Columna</h4>
                  <input
                    type="text"
                    placeholder="Ej. En revisión"
                    value={newColumnName || ''}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => { setIsAddingColumn(false); setNewColumnName(''); }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddColumn}
                      className="px-3 py-1 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="w-full py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center gap-2 transition-colors bg-white/40 dark:bg-slate-900/40"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Añadir Columna</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Flat List View alternative */
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {projectTasks.length > 0 ? (
            projectTasks.map(task => (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTodo(task.id)}
                    className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
                  />
                  <span
                    onClick={() => onEditTodo(task)}
                    className={`text-xs font-medium cursor-pointer ${
                      task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {task.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {getTaskColumn(task)}
                  </span>
                  <button
                    onClick={() => deleteTodo(task.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-12">
              Este proyecto no tiene tareas. ¡Añade una!
            </p>
          )}
        </div>
      )}

      {/* Delete Column Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!columnToDelete}
        onClose={() => setColumnToDelete(null)}
        onConfirm={handleDeleteColumnConfirm}
        title="Eliminar Columna"
        message={`¿Seguro que deseas eliminar la columna "${columnToDelete}"? Las tareas de esta columna se moverán a "${columns.filter(c => c !== columnToDelete)[0] || 'Por hacer'}".`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ProjectKanbanView;
