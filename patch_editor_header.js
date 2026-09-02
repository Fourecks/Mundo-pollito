import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldBreadcrumb = `<div className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                  {selectedFolder?.name} / <span className="text-stone-600 dark:text-stone-300 font-semibold">{activeNoteTitle || 'Sin título'}</span>
                </div>`;

const newBreadcrumb = `<div className="text-[11px] font-medium text-stone-400 dark:text-stone-500 flex items-center gap-2">
                  <span>{currentView === 'folder' ? selectedFolder?.name : currentView.toUpperCase()} / <span className="text-stone-600 dark:text-stone-300 font-semibold">{activeNoteTitle || 'Sin título'}</span></span>
                  {saveStatus === 'saving' && <span className="text-sky-500 flex items-center gap-1"><CloudLightning className="w-3 h-3"/> Guardando...</span>}
                  {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Guardado</span>}
                </div>`;

content = content.replace(oldBreadcrumb, newBreadcrumb);

const oldActions = `<button
                  onClick={() => setNoteToDelete(selectedNote)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Eliminar nota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>`;

const newActions = `<button
                  onClick={() => {
                     const isFav = !selectedNote?.is_favorite;
                     onUpdateNote({ ...selectedNote!, is_favorite: isFav });
                  }}
                  className={\`p-1.5 rounded-lg transition-colors \${selectedNote?.is_favorite ? 'text-amber-500 hover:bg-amber-50' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}\`}
                  title={selectedNote?.is_favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                  <Star className="w-4 h-4" fill={selectedNote?.is_favorite ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                     const isPinned = !selectedNote?.is_pinned;
                     onUpdateNote({ ...selectedNote!, is_pinned: isPinned });
                  }}
                  className={\`p-1.5 rounded-lg transition-colors \${selectedNote?.is_pinned ? 'text-rose-500 hover:bg-rose-50' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}\`}
                  title={selectedNote?.is_pinned ? "Desfijar" : "Fijar"}
                >
                  <Pin className="w-4 h-4" fill={selectedNote?.is_pinned ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                     if (selectedNote?.deleted_at) {
                       onUpdateNote({ ...selectedNote!, deleted_at: null });
                     } else if (selectedNote?.is_archived) {
                       onUpdateNote({ ...selectedNote!, is_archived: false });
                     } else {
                       onUpdateNote({ ...selectedNote!, is_archived: true });
                     }
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title={selectedNote?.deleted_at ? "Restaurar" : (selectedNote?.is_archived ? "Desarchivar" : "Archivar")}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (selectedNote?.deleted_at) {
                      setNoteToDelete(selectedNote); // permanently delete
                    } else {
                      onUpdateNote({ ...selectedNote!, deleted_at: new Date().toISOString() }); // move to trash
                      setSelectedNoteId(null);
                    }
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title={selectedNote?.deleted_at ? "Eliminar permanentemente" : "Mover a papelera"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>`;

content = content.replace(oldActions, newActions);

fs.writeFileSync('components/NotesSection.tsx', content);
