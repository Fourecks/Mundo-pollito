const fs = require('fs');
const file = 'components/ProjectsWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Icons
content = content.replace(
    "import { Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical } from 'lucide-react';",
    "import { Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2 } from 'lucide-react';"
);

// 2. Add State
content = content.replace(
    "const [docModal, setDocModal] = useState<{ isOpen: boolean, doc: ProjectDoc | null }>({ isOpen: false, doc: null });",
    "const [docModal, setDocModal] = useState<{ isOpen: boolean, doc: ProjectDoc | null }>({ isOpen: false, doc: null });\n    const [activeSprintId, setActiveSprintId] = useState<string | null>(null);\n    const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);"
);

// 3. Update activeTab to reset subviews
content = content.replace(
    "setActiveTab(tab);",
    "setActiveTab(tab); setActiveSprintId(null); setActiveMilestoneId(null);"
);

// 4. Update activeProject selection to reset subviews
content = content.replace(
    "onSelectProject(p.id);",
    "onSelectProject(p.id); setActiveSprintId(null); setActiveMilestoneId(null);"
);

// 5. Replace renderSprints
const renderSprintsCode = `
    const renderSprints = () => {
        if (!activeProject) return null;
        const sprints = activeProject.sprints || [];
        
        if (activeSprintId) {
            const sprint = sprints.find(s => s.id === activeSprintId);
            if (!sprint) {
                setActiveSprintId(null);
                return null;
            }
            const sprintTasks = allTodos.filter(t => t.sprint_id === sprint.id && t.project_id === activeProject.id);
            const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
            const completedPoints = sprintTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.story_points || 0), 0);
            const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
            const completedTasks = sprintTasks.filter(t => t.completed).length;

            return (
                <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                    <button onClick={() => setActiveSprintId(null)} className="mb-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver a Sprints
                    </button>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{sprint.name}</h2>
                                <span className={\`text-xs px-2 py-0.5 rounded-sm font-medium border \${
                                    sprint.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : 
                                    sprint.status === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400' : 
                                    'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                }\`}>
                                    {sprint.status === 'active' ? 'En Curso' : sprint.status === 'completed' ? 'Completado' : 'Planificación'}
                                </span>
                            </div>
                            {sprint.goal && <p className="text-gray-600 dark:text-gray-400">{sprint.goal}</p>}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {sprint.start_date ? format(parseISO(sprint.start_date), 'd MMM', { locale: es }) : '?'} - {sprint.end_date ? format(parseISO(sprint.end_date), 'd MMM yyyy', { locale: es }) : '?'}</span>
                            </div>
                        </div>
                        <button onClick={() => setSprintModal({ isOpen: true, sprint })} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Editar
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Progreso</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{progress}%</div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: \`\${progress}%\` }} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Story Points</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedPoints} <span className="text-lg text-gray-400 font-medium">/ {totalPoints}</span></div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tareas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400 font-medium">/ {sprintTasks.length}</span></div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tareas del Sprint</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.target as any).elements.taskName;
                            if (input.value.trim()) {
                                addTodo(input.value.trim(), { sprint_id: sprint.id, project_id: activeProject.id });
                                input.value = '';
                            }
                        }} className="mb-4 flex gap-2">
                            <input name="taskName" type="text" placeholder="Añadir una tarea a este sprint..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Añadir</button>
                        </form>
                        <div className="space-y-2">
                            {sprintTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg group hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateTodo(task.id, { completed: !task.completed })} className={\`w-5 h-5 rounded flex items-center justify-center border \${task.completed ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}\`}>
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={\`text-sm font-medium \${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}\`}>{task.text}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {task.story_points != null && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                                                {task.story_points} SP
                                            </span>
                                        )}
                                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                                    </div>
                                </div>
                            ))}
                            {sprintTasks.length === 0 && <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 text-sm">No hay tareas en este sprint todavía.</div>}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gestión de Sprints</h2>
                    <button onClick={() => setSprintModal({ isOpen: true, sprint: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Sprint
                    </button>
                </div>
                {sprints.length === 0 ? renderEmptyState('No hay sprints', 'Organiza el trabajo en iteraciones de tiempo fijo (por ejemplo, ciclos de 2 semanas).') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sprints.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(sprint => (
                            <div key={sprint.id} onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                setActiveSprintId(sprint.id);
                            }} className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3 group relative cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                <button onClick={(e) => { e.stopPropagation(); setSprintModal({ isOpen: true, sprint }); }} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <div className="flex items-center justify-between pr-8">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{sprint.name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={\`text-xs px-2 py-0.5 rounded-sm font-medium border \${
                                        sprint.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : 
                                        sprint.status === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400' : 
                                        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                    }\`}>
                                        {sprint.status === 'active' ? 'En Curso' : sprint.status === 'completed' ? 'Completado' : 'Planificación'}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {sprint.start_date ? format(parseISO(sprint.start_date), 'd MMM', { locale: es }) : '?'} - {sprint.end_date ? format(parseISO(sprint.end_date), 'd MMM yyyy', { locale: es }) : '?'}
                                    </span>
                                </div>
                                {sprint.goal && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">{sprint.goal}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };`;

content = content.replace(
    /const renderSprints = \(\) => \{[\s\S]*?\};\n\n    const renderRoadmap =/g,
    `${renderSprintsCode}\n\n    const renderRoadmap =`
);

// 6. Replace renderRoadmap
const renderRoadmapCode = `
    const renderRoadmap = () => {
        if (!activeProject) return null;
        const milestones = activeProject.milestones || [];
        
        if (activeMilestoneId) {
            const ms = milestones.find(m => m.id === activeMilestoneId);
            if (!ms) {
                setActiveMilestoneId(null);
                return null;
            }
            
            const msTasks = allTodos.filter(t => t.milestone_id === ms.id && t.project_id === activeProject.id);
            const totalTasks = msTasks.length;
            const completedTasks = msTasks.filter(t => t.completed).length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const msDate = (ms as any).date || ms.target_date;
            const msTitle = (ms as any).title || ms.name;
            
            return (
                <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                    <button onClick={() => setActiveMilestoneId(null)} className="mb-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver a la Hoja de Ruta
                    </button>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{msTitle}</h2>
                                <span className={\`text-xs px-2 py-0.5 rounded-sm font-medium border \${ms.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'}\`}>
                                    {ms.status === 'completed' ? 'Completado' : 'Pendiente'}
                                </span>
                            </div>
                            {ms.description && <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{ms.description}</p>}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {msDate ? format(parseISO(msDate), 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}</span>
                            </div>
                        </div>
                        <button onClick={() => setMilestoneModal({ isOpen: true, milestone: ms })} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Editar
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Progreso de Tareas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{progress}%</div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: \`\${progress}%\` }} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tareas Completadas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400 font-medium">/ {totalTasks}</span></div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tareas del Hito</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.target as any).elements.taskName;
                            if (input.value.trim()) {
                                addTodo(input.value.trim(), { milestone_id: ms.id, project_id: activeProject.id });
                                input.value = '';
                            }
                        }} className="mb-4 flex gap-2">
                            <input name="taskName" type="text" placeholder="Añadir una tarea a este hito..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Añadir</button>
                        </form>
                        <div className="space-y-2">
                            {msTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg group hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateTodo(task.id, { completed: !task.completed })} className={\`w-5 h-5 rounded flex items-center justify-center border \${task.completed ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}\`}>
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={\`text-sm font-medium \${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}\`}>{task.text}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                                    </div>
                                </div>
                            ))}
                            {msTasks.length === 0 && <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 text-sm">No hay tareas en este hito todavía.</div>}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hoja de Ruta (Hitos)</h2>
                    <button onClick={() => setMilestoneModal({ isOpen: true, milestone: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Hito
                    </button>
                </div>
                {milestones.length === 0 ? renderEmptyState('No hay hitos', 'Define los puntos clave o fechas importantes de este proyecto.') : (
                    <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6 py-2">
                        {milestones.sort((a,b) => {
                            const d1 = (a as any).date || a.target_date;
                            const d2 = (b as any).date || b.target_date;
                            return new Date(d1).getTime() - new Date(d2).getTime();
                        }).map(ms => {
                            const msDate = (ms as any).date || ms.target_date;
                            const msTitle = (ms as any).title || ms.name;
                            return (
                                <div key={ms.id} onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    setActiveMilestoneId(ms.id);
                                }} className="relative group cursor-pointer">
                                    <div className={\`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white dark:border-[#050505] mt-1.5 \${ms.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}\`} />
                                    <div className="bg-white dark:bg-[#111] p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-2 relative hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                        <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setMilestoneModal({ isOpen: true, milestone: ms }); }} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><Edit2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 pr-12">
                                            <h3 className={\`text-base font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors \${ms.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}\`}>{msTitle}</h3>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {msDate ? format(parseISO(msDate), 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}</span>
                                        </div>
                                        {ms.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ms.description}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };`;

content = content.replace(
    /const renderRoadmap = \(\) => \{[\s\S]*?\};\n\n    const renderDocs =/g,
    `${renderRoadmapCode}\n\n    const renderDocs =`
);

// We need to fix the Milestone edit/create logic as it was using title and date
content = content.replace(
    "const title = formData.get('title') as string;",
    "const name = formData.get('title') as string; const title = name;"
);

content = content.replace(
    "const date = formData.get('date') as string;",
    "const target_date = formData.get('date') as string; const date = target_date;"
);

content = content.replace(
    "updated = updated.map(m => m.id === milestoneModal.milestone!.id ? { ...m, title, description, date, status } : m);",
    "updated = updated.map(m => m.id === milestoneModal.milestone!.id ? { ...m, name, title, description, target_date, date, status } : m);"
);

content = content.replace(
    "updated = [...updated, { id: crypto.randomUUID(), project_id: activeProject.id, title, description, date, status, created_at: new Date().toISOString() }];",
    "updated = [...updated, { id: crypto.randomUUID(), project_id: activeProject.id, name, title, description, target_date, date, status, created_at: new Date().toISOString() } as any];"
);

content = content.replace(
    "defaultValue={milestoneModal.milestone?.title}",
    "defaultValue={(milestoneModal.milestone as any)?.title || milestoneModal.milestone?.name}"
);

content = content.replace(
    "defaultValue={milestoneModal.milestone?.date ? new Date(milestoneModal.milestone.date).toISOString().split('T')[0] : ''}",
    "defaultValue={((milestoneModal.milestone as any)?.date || milestoneModal.milestone?.target_date) ? new Date(((milestoneModal.milestone as any)?.date || milestoneModal.milestone?.target_date)).toISOString().split('T')[0] : ''}"
);

fs.writeFileSync(file, content, 'utf8');
