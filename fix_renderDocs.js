import fs from 'fs';

const file = 'components/ProjectsWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStart = content.indexOf('const renderDocs = () => {');
const targetEnd = content.indexOf('const renderChat = () => {');

if (targetStart !== -1 && targetEnd !== -1) {
  const replacement = `    const renderDocs = () => {
        if (!activeProject) return null;
        return (
            <div className="w-full h-full relative overflow-hidden bg-white dark:bg-[#111]">
                <NotesSection
                    folders={folders}
                    notes={notes}
                    onAddFolder={onAddFolder}
                    onUpdateFolder={onUpdateFolder}
                    onDeleteFolder={onDeleteFolder}
                    onAddNote={onAddNote}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                    projectId={activeProject.id}
                />
            </div>
        );
    };

    `;
  content = content.substring(0, targetStart) + replacement + content.substring(targetEnd);
  fs.writeFileSync(file, content);
  console.log('Replaced renderDocs successfully');
} else {
  console.log('Could not find renderDocs or renderChat');
}
