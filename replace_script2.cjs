const fs = require('fs');
const file = 'components/ProjectsWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Sprint Detail inline form
content = content.replace(
    /addTodo\(input\.value\.trim\(\), \{ sprint_id: sprint\.id, project_id: activeProject\.id \}\);/,
    "const spInput = (e.target as any).elements.storyPoints;\n                                const sp = spInput.value ? parseInt(spInput.value) : null;\n                                addTodo(input.value.trim(), { sprint_id: sprint.id, project_id: activeProject.id, story_points: sp });\n                                spInput.value = '';"
);

content = content.replace(
    /<input name="taskName" type="text" placeholder="Añadir una tarea a este sprint..." className="flex-1 bg-white dark:bg-\[\#111\] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" \/>/,
    '<input name="taskName" type="text" placeholder="Añadir una tarea a este sprint..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />\n                            <input name="storyPoints" type="number" min="0" max="100" placeholder="SP (ej. 3)" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />'
);

fs.writeFileSync(file, content, 'utf8');
