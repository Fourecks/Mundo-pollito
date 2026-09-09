const fs = require('fs');
const code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf8');
const renderKanbanStart = code.indexOf('const renderKanban = () => {');
const end = code.indexOf('const renderProjectHeader = () => {');
console.log(code.substring(renderKanbanStart, renderKanbanStart + 500));
