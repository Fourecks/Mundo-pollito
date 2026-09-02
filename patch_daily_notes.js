import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const listHeaderOld = `<div className="relative flex-grow">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-lg text-xs border border-transparent focus:border-stone-300 dark:focus:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreateNote}
              className="p-1 rounded-lg text-stone-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Nueva Nota"
            >
              <FilePlus className="w-4 h-4" />
            </button>`;

const listHeaderNew = `<div className="relative flex-grow">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-lg text-xs border border-transparent focus:border-stone-300 dark:focus:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none"
              />
            </div>
            <button
              onClick={async () => {
                 const dailyTitle = \`Diario: \${new Date().toLocaleDateString()}\`;
                 const existing = notes.find(n => n.title === dailyTitle);
                 if (existing) {
                   setSelectedNoteId(existing.id);
                   if (existing.folder_id) setSelectedFolderId(existing.folder_id);
                 } else {
                   const note = await onAddNote(null);
                   if (note) {
                     const template = \`<p><strong>Diario del \${new Date().toLocaleDateString()}</strong></p><h2>Top 3 Tareas de Hoy</h2><ol><li></li><li></li><li></li></ol><h2>Reflexiones</h2><p><br></p>\`;
                     onUpdateNote({ ...note, title: dailyTitle, content: template });
                   }
                 }
              }}
              className="p-1 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              title="Nota Diaria"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleCreateNote}
              className="p-1 rounded-lg text-stone-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Nueva Nota"
            >
              <FilePlus className="w-4 h-4" />
            </button>`;

content = content.replace(listHeaderOld, listHeaderNew);

fs.writeFileSync('components/NotesSection.tsx', content);
