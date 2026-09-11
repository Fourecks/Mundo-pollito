const fs = require('fs');
const code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');
const regex = /<AnimatePresence>[\s\S]*?\{isQuickAddOpen && \(/g;
const matches = [...code.matchAll(regex)];
console.log("Matches:", matches.length);
for (const m of matches) {
    console.log("Match index:", m.index);
}
