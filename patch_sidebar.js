import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldSidebarStart = `      {/* 1. FOLDERS SIDEBAR */}`;
const oldSidebarEnd = `      {/* 2. NOTES LIST SIDEBAR */}`;

const startIndex = content.indexOf(oldSidebarStart);
const endIndex = content.indexOf(oldSidebarEnd);

const newSidebar = `      {/* 1. FOLDERS SIDEBAR */}
      {showFolders && (
        <div className="w-56 lg:w-64 flex-shrink-0 flex flex-col border-r border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 h-full">
          <div className="p-3 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300">Navigation</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFolders(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
                title="Hide sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
            
            {/* Main Views */}
            <div className="space-y-0.5">
              {[
                { id: 'all', label: 'Todas las notas', icon: FileText, color: 'text-stone-500' },
                { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-blue-500' },
                { id: 'favorites', label: 'Favoritos', icon: Star, color: 'text-amber-500' },
                { id: 'recent', label: 'Recientes', icon: Clock, color: 'text-emerald-500' },
                { id: 'pinned', label: 'Fijadas', icon: Pin, color: 'text-rose-500' },
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => { setCurrentView(view.id as NoteView); setSelectedFolderId(null); }}
                  className={\`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all \${
                    currentView === view.id
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }\`}
                >
                  <view.icon className={\`w-4 h-4 \${view.color}\`} />
                  {view.label}
                </button>
              ))}
            </div>

            {/* Folders */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Carpetas</span>
                <button onClick={handleCreateFolder} className="text-stone-400 hover:text-sky-500 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    {editingFolderId === folder.id ? (
                      <div className="p-1 flex items-center gap-1 bg-white dark:bg-stone-800 rounded border border-sky-400">
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={handleSaveRenameFolder}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameFolder();
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                          autoFocus
                          className="flex-grow px-1 py-0.5 bg-transparent text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none min-w-0"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCurrentView('folder'); setSelectedFolderId(folder.id); }}
                        className={\`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-medium transition-all \${
                          currentView === 'folder' && selectedFolderId === folder.id
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                        }\`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FolderIconLucide className={\`w-3.5 h-3.5 flex-shrink-0 \${currentView === 'folder' && selectedFolderId === folder.id ? 'text-sky-500' : 'text-stone-400'}\`} />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folder); }}
                            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            title="Renombrar"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                            className="p-1 text-stone-400 hover:text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
                {folders.length === 0 && (
                  <div className="px-2 py-2 text-xs text-stone-400 italic">Sin carpetas</div>
                )}
              </div>
            </div>

            {/* Trash & Archive */}
            <div className="space-y-0.5 pt-2 border-t border-stone-200/50 dark:border-stone-800">
               <button
                  onClick={() => { setCurrentView('archived'); setSelectedFolderId(null); }}
                  className={\`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all \${
                    currentView === 'archived'
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }\`}
                >
                  <Archive className="w-4 h-4 text-stone-400" />
                  Archivadas
                </button>
                <button
                  onClick={() => { setCurrentView('trash'); setSelectedFolderId(null); }}
                  className={\`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all \${
                    currentView === 'trash'
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }\`}
                >
                  <Trash2 className="w-4 h-4 text-stone-400" />
                  Papelera
                </button>
            </div>

          </div>
        </div>
      )}

`;

content = content.substring(0, startIndex) + newSidebar + content.substring(endIndex);

fs.writeFileSync('components/NotesSection.tsx', content);
