const fs = require('fs');
let code = fs.readFileSync('components/TodoListModule.tsx', 'utf-8');

code = code.replace(/onOpenProjectCreator \|\| \(\(\) => onAddProject\('Nuevo Proyecto', null, null\)\)/g, "onOpenProjectCreator || (() => {})");

fs.writeFileSync('components/TodoListModule.tsx', code);
console.log("Fixed TodoListModule project creation");
