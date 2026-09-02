import fs from 'fs';
const lines = fs.readFileSync('components/NotesSection.tsx', 'utf-8').split('\n');
const idx = lines.findIndex(l => l.includes('onKeyDown={(e) => {'));
console.log(lines.slice(idx - 2, idx + 20).join('\n'));
