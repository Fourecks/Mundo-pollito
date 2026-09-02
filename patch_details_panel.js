import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const actionsEnd = `<Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rich Formatting Toolbar */}`;

const newActionsEnd = `<Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={\`p-1.5 rounded-lg transition-colors \${showDetails ? 'text-sky-500 bg-sky-50' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}\`}
                  title="Detalles de la nota"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rich Formatting Toolbar */}`;

content = content.replace(actionsEnd, newActionsEnd);

const editorWrapperStart = `{/* Note Editor Inputs */}
            <div className="flex-grow flex flex-col p-6 lg:p-10 overflow-y-auto">`;

const editorWrapperNew = `{/* Note Editor Inputs */}
            <div className="flex-grow overflow-hidden flex">
              <div className="flex-grow flex flex-col p-6 lg:p-10 overflow-y-auto">`;

content = content.replace(editorWrapperStart, editorWrapperNew);

const editorWrapperEnd = `</>
        ) : (`;

const editorWrapperNewEnd = `</div>
              {/* DETAILS PANEL */}
              {showDetails && (
                <div className="w-64 flex-shrink-0 border-l border-stone-200/70 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-xs text-stone-600 dark:text-stone-400">
                  {/* Table of Contents */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Tabla de Contenidos</h4>
                    {toc.length > 0 ? (
                      <div className="space-y-1.5">
                        {toc.map((h, i) => (
                          <div key={i} className={\`truncate hover:text-sky-500 cursor-pointer transition-colors \${h.level === 1 ? 'pl-0 font-semibold' : h.level === 2 ? 'pl-2' : 'pl-4'}\`}>
                            {h.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] italic">Sin encabezados</span>
                    )}
                  </div>
                  {/* Metadata */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Detalles</h4>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between"><span>Modificada:</span> <span>{new Date(selectedNote.updated_at).toLocaleDateString()}</span></div>
                       <div className="flex items-center justify-between"><span>Palabras:</span> <span>{cleanToPlainText(activeNoteContent).split(/\\s+/).filter(w => w.length>0).length}</span></div>
                    </div>
                  </div>
                  {/* Tags */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags?.map(tag => (
                        <span key={tag} className="bg-stone-200 dark:bg-stone-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          #{tag}
                          <button onClick={() => {
                             const newTags = (selectedNote.tags || []).filter(t => t !== tag);
                             onUpdateNote({ ...selectedNote, tags: newTags });
                          }} className="hover:text-red-500"><X className="w-2.5 h-2.5"/></button>
                        </span>
                      ))}
                      <button onClick={() => {
                         const tag = prompt('Nueva etiqueta:');
                         if (tag && tag.trim()) {
                            const newTags = [...(selectedNote.tags || []), tag.trim().replace(/^#/, '')];
                            onUpdateNote({ ...selectedNote, tags: newTags });
                         }
                      }} className="bg-transparent border border-dashed border-stone-300 dark:border-stone-700 hover:border-sky-500 px-2 py-0.5 rounded-full hover:text-sky-500 transition-colors">
                        + tag
                      </button>
                    </div>
                  </div>
                  {/* Note Link */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Compartir</h4>
                    <button onClick={() => {
                       navigator.clipboard.writeText(\`[[\${selectedNote.title}]]\`);
                       alert('Enlace interno copiado al portapapeles');
                    }} className="flex items-center gap-2 px-2 py-1.5 bg-stone-200/50 dark:bg-stone-800/50 rounded-lg w-full justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors">
                      <Link className="w-3.5 h-3.5"/> Copiar Link de Nota
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (`;

content = content.replace(editorWrapperEnd, editorWrapperNewEnd);

fs.writeFileSync('components/NotesSection.tsx', content);
