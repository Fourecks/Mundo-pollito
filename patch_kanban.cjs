const fs = require('fs');
const file = 'components/ProjectsWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const dragFunctions = `
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        e.dataTransfer.setData('taskId', taskId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        const taskIdStr = e.dataTransfer.getData('taskId');
        if (taskIdStr) {
            updateTodo(parseInt(taskIdStr, 10), { kanban_column: col });
        }
    };

    const renderKanban = () => {`;

content = content.replace('    const renderKanban = () => {', dragFunctions);

content = content.replace(
    /<div key=\{col\} className="flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-\[\#111\] rounded-lg border border-gray-200 dark:border-gray-800 h-full max-h-full overflow-hidden">/g,
    `<div key={col} className="flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 h-full max-h-full overflow-hidden" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col)}>`
);

content = content.replace(
    /<div key=\{todo\.id\} onClick=\{\(\) => onEditTodo && onEditTodo\(todo\)\} className="bg-white dark:bg-\[\#1c1c1c\] p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700\/60 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">/g,
    `<div key={todo.id} onClick={() => onEditTodo && onEditTodo(todo)} draggable onDragStart={(e) => handleDragStart(e, todo.id)} className="bg-white dark:bg-[#1c1c1c] p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/60 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">`
);

fs.writeFileSync(file, content);
