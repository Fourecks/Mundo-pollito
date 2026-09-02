import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldMobileHeader = `<div className="flex items-center gap-1">
              <button
                onClick={handleCopyNote}
                className="p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg"
                title="Copiar"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setNoteToDelete(selectedNote || null)}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>`;

const newMobileHeader = `<div className="flex items-center gap-1">
              {saveStatus === 'saving' && <span className="text-[10px] text-sky-500 flex items-center gap-1"><CloudLightning className="w-3 h-3"/> Guardando</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/></span>}
              <button onClick={() => { onUpdateNote({ ...selectedNote!, is_favorite: !selectedNote?.is_favorite }); }} className={\`p-1.5 rounded-lg \${selectedNote?.is_favorite ? 'text-amber-500' : 'text-stone-400'}\`}><Star className="w-4 h-4" fill={selectedNote?.is_favorite ? "currentColor" : "none"} /></button>
              <button onClick={() => setNoteToDelete(selectedNote || null)} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>`;

content = content.replace(oldMobileHeader, newMobileHeader);

const oldMobileEditorBody = `<div className="flex-grow flex flex-col p-4 overflow-y-auto">`;

const newMobileEditorBody = `<div className="px-2 py-1.5 border-b border-stone-200/60 dark:border-stone-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-stone-50/30 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300">
              <button onClick={() => applyRichCommand('bold')} className="p-1.5 rounded"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('italic')} className="p-1.5 rounded"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h2>')} className="p-1.5 rounded"><Heading2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('insertUnorderedList')} className="p-1.5 rounded"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const calloutHtml = \`<div class="p-3 my-2 bg-sky-50 dark:bg-sky-900/20 border-l-2 border-sky-500 rounded-r flex gap-2"><div class="text-sky-500 text-xs font-bold">💡</div><div class="text-xs text-stone-800 dark:text-stone-200 flex-grow">Nota...</div></div><p><br></p>\`;
                applyRichCommand('insertHTML', calloutHtml);
              }} className="p-1.5 rounded text-sky-500"><AlertCircle className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-grow flex flex-col p-4 overflow-y-auto">`;

content = content.replace(oldMobileEditorBody, newMobileEditorBody);

fs.writeFileSync('components/NotesSection.tsx', content);
