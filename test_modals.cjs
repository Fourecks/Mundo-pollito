const fs = require('fs');
const files = ['components/ProjectsWorkspace.tsx', 'components/MobileTasks.tsx'];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  if (code.includes('animate-in')) {
    console.log(file + ' still has animate-in');
  }
}
