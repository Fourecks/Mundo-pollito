import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const target = `{/* Note Editor Inputs */}
            <div className="flex-grow flex flex-col p-6 overflow-y-auto max-w-4xl w-full mx-auto">`;

content = content.replace(target, `{/* Note Editor Inputs */}
            <div className="flex-grow overflow-hidden flex">
              <div className="flex-grow flex flex-col p-6 overflow-y-auto max-w-4xl w-full mx-auto">`);

fs.writeFileSync('components/NotesSection.tsx', content);
