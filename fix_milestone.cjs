const fs = require('fs');
const file = 'components/ProjectsWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const totalTasks = msTasks\.length;\n            const completedTasks = msTasks\.filter\(t => t\.completed\)\.length;\n            const progress = totalTasks > 0 \? Math\.round\(\(completedTasks \/ totalTasks\) \* 100\) : 0;/,
    `const totalPoints = msTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
            const completedPoints = msTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.story_points || 0), 0);
            const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
            const completedTasks = msTasks.filter(t => t.completed).length;
            const totalTasks = msTasks.length;`
);

content = content.replace(
    /<div className="grid grid-cols-2 gap-4 mb-8">/,
    `<div className="grid grid-cols-3 gap-4 mb-8">`
);

content = content.replace(
    /Progreso de Tareas/,
    `Progreso`
);

content = content.replace(
    /<div className="bg-white dark:bg-\[\#111\] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">\s*<div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" \/> Tareas Completadas<\/div>\s*<div className="text-3xl font-bold text-gray-900 dark:text-white">\{completedTasks\} <span className="text-lg text-gray-400 font-medium">\/ \{totalTasks\}<\/span><\/div>\s*<\/div>/,
    `<div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Story Points</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedPoints} <span className="text-lg text-gray-400 font-medium">/ {totalPoints}</span></div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tareas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400 font-medium">/ {totalTasks}</span></div>
                        </div>`
);

content = content.replace(
    /const input = \(e\.target as any\)\.elements\.taskName;\n                            if \(input\.value\.trim\(\)\) \{\n                                addTodo\(input\.value\.trim\(\), \{ milestone_id: ms\.id, project_id: activeProject\.id \}\);\n                                input\.value = '';\n                            \}/,
    `const input = (e.target as any).elements.taskName;
                            const spInput = (e.target as any).elements.storyPoints;
                            if (input.value.trim()) {
                                const sp = spInput.value ? parseInt(spInput.value) : null;
                                addTodo(input.value.trim(), { milestone_id: ms.id, project_id: activeProject.id, story_points: sp });
                                input.value = '';
                                spInput.value = '';
                            }`
);

content = content.replace(
    /<input name="taskName" type="text" placeholder="Añadir una tarea a este hito\.\.\." className="flex-1 bg-white dark:bg-\[\#111\] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" \/>/,
    `<input name="taskName" type="text" placeholder="Añadir una tarea a este hito..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <input name="storyPoints" type="number" min="0" max="100" placeholder="SP (ej. 3)" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />`
);

content = content.replace(
    /<div className="flex items-center gap-3">\s*\{task\.assignee && <span className="text-xs text-gray-500">\{task\.assignee\}<\/span>\}\s*<\/div>/g,
    `<div className="flex items-center gap-3">
                                        {task.story_points != null && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                                                {task.story_points} SP
                                            </span>
                                        )}
                                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                                    </div>`
);

fs.writeFileSync(file, content, 'utf8');
