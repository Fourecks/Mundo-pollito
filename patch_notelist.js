import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldHeaderStart = `      {/* 2. NOTES LIST SIDEBAR */}
      {showNotesList && selectedFolder && (`;

const newHeaderStart = `      {/* 2. NOTES LIST SIDEBAR */}
      {showNotesList && (`;

content = content.replace(oldHeaderStart, newHeaderStart);

// Let's also update the condition where it checks if selectedFolder is needed to render notes list
content = content.replace(
  `{filteredNotes.length === 0 && (
              <div className="p-6 text-center text-xs text-stone-400">
                No hay notas en esta carpeta.
              </div>
            )}`,
  `{filteredNotes.length === 0 && (
              <div className="p-6 text-center text-xs text-stone-400">
                No hay notas aquí.
              </div>
            )}`
);

fs.writeFileSync('components/NotesSection.tsx', content);
