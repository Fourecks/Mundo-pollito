import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const detailsEnd = `                  {/* Note Link */}
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

const newDetailsEnd = `                  {/* Backlinks */}
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
        ) : (`;

content = content.replace(detailsEnd, newDetailsEnd);

fs.writeFileSync('components/NotesSection.tsx', content);
