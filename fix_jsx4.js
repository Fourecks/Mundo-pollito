import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const startStr = '{/* Note Editor Inputs */}';
const endStr = `        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 dark:text-stone-500 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
              <FileText className="w-6 h-6" />
            </div>`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);
if (startIdx === -1 || endIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const newBlock = `{/* Note Editor Inputs */}
            <div className="flex-grow overflow-hidden flex">
              <div className="flex-grow flex flex-col p-6 overflow-y-auto max-w-4xl w-full mx-auto relative">
                <input
                  type="text"
                  value={activeNoteTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Título de la nota..."
                  className="text-2xl font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none mb-4 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onPaste={handlePaste}
                  onBlur={handleBlurSave}
                  data-placeholder="Comienza a escribir tu nota aquí..."
                  className="note-editor-content flex-grow w-full bg-transparent focus:outline-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 dark:empty:before:text-stone-600 empty:before:pointer-events-none"
                />
                {slashMenuOpen && (
                  <div 
                    className="fixed z-50 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 py-2 flex flex-col"
                    style={{ top: slashMenuPos.top + 10, left: slashMenuPos.left }}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bloques</div>
                    <button onClick={() => { applyRichCommand('formatBlock', '<h1>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Heading1 className="w-4 h-4"/> Heading 1</button>
                    <button onClick={() => { applyRichCommand('formatBlock', '<h2>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Heading2 className="w-4 h-4"/> Heading 2</button>
                    <button onClick={() => { applyRichCommand('insertUnorderedList'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><List className="w-4 h-4"/> Lista</button>
                    <button onClick={() => { applyRichCommand('formatBlock', '<pre>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Terminal className="w-4 h-4"/> Código</button>
                    <button onClick={() => { 
                        const calloutHtml = \`<div class="p-4 my-4 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg flex gap-3"><div class="text-sky-500 font-bold">💡</div><div class="text-sm text-stone-800 dark:text-stone-200 flex-grow">Idea...</div></div><p><br></p>\`;
                      applyRichCommand('insertHTML', calloutHtml); setSlashMenuOpen(false); 
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Callout</button>
                    <div className="px-3 py-1 mt-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-t border-stone-100 dark:border-stone-700 pt-2">Plantillas</div>
                    <button onClick={() => {
                      const template = \`<h1>Acta de Reunión</h1><p><strong>Fecha:</strong> \${new Date().toLocaleDateString()}</p><h2>Asistentes</h2><ul><li></li></ul><h2>Agenda</h2><ol><li></li></ol><h2>Decisiones & Tareas</h2><ul><li></li></ul>\`;
                      applyRichCommand('insertHTML', template); setSlashMenuOpen(false);
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><FileText className="w-4 h-4"/> Acta de Reunión</button>
                    <button onClick={() => {
                      const template = \`<h1>Nota Diaria</h1><p><strong>Fecha:</strong> \${new Date().toLocaleDateString()}</p><h2>Top 3 Tareas de Hoy</h2><ol><li></li><li></li><li></li></ol><h2>Reflexiones</h2><p><br></p><h2>Notas Aleatorias</h2><ul><li></li></ul>\`;
                      applyRichCommand('insertHTML', template); setSlashMenuOpen(false);
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><FileText className="w-4 h-4"/> Nota Diaria</button>
                  </div>
                )}
              </div>
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
                  {/* Backlinks */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Menciones (Backlinks)</h4>
                    <div className="space-y-1">
                      {notes.filter(n => n.id !== selectedNote.id && (n.content?.includes(\`[[\${selectedNote.title}]]\`) || n.title?.includes(selectedNote.title))).length > 0 ? 
                        notes.filter(n => n.id !== selectedNote.id && (n.content?.includes(\`[[\${selectedNote.title}]]\`) || n.title?.includes(selectedNote.title))).map(bn => (
                          <button key={bn.id} onClick={() => { setSelectedNoteId(bn.id); if (bn.folder_id) setSelectedFolderId(bn.folder_id); }} className="w-full text-left text-xs truncate hover:text-sky-500 transition-colors text-stone-500">
                            • {bn.title}
                          </button>
                        )) : (
                        <span className="text-[10px] italic">No hay enlaces a esta nota</span>
                      )}
                    </div>
                  </div>
                  {/* Note Link */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Compartir</h4>
                    <button onClick={() => {
                      navigator.clipboard.writeText(\`[[\${selectedNote.title}]]\`);
                      alert('Enlace interno copiado al portapapeles');
                    }} className="flex items-center gap-2 px-2 py-1.5 bg-stone-200/50 dark:bg-stone-800/50 rounded-lg w-full justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors mb-2">
                      <Link className="w-3.5 h-3.5"/> Copiar Link de Nota
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
`;

fs.writeFileSync('components/NotesSection.tsx', before + newBlock + after);
