const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');
if (code.includes('quickAddActiveSheet')) {
    console.log('quickAddActiveSheet found');
} else {
    console.log('quickAddActiveSheet NOT found');
}
