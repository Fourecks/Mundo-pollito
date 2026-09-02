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
            </button>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">`;

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
              onClick={handleCreateNote}
              className="p-1 rounded-lg text-stone-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Nueva Nota"
            >
              <FilePlus className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
            <span className="text-[10px] text-stone-400 font-semibold">{filteredNotes.length} nota{filteredNotes.length !== 1 && 's'}</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="text-[10px] bg-transparent text-stone-500 font-medium focus:outline-none cursor-pointer"
            >
              <option value="updated">Actualizado</option>
              <option value="created">Creado</option>
              <option value="title-asc">A-Z</option>
              <option value="title-desc">Z-A</option>
            </select>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">`;

content = content.replace(listHeaderOld, listHeaderNew);

fs.writeFileSync('components/NotesSection.tsx', content);
