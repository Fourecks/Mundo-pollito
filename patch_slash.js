import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

// Add onKeyDown to editor
const oldEditorDiv = `className="note-editor-content flex-grow w-full bg-transparent focus:outline-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 dark:empty:before:text-stone-600 empty:before:pointer-events-none"`;

const newEditorDiv = `onKeyDown={(e) => {
                  if (e.key === '/') {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                       const range = selection.getRangeAt(0);
                       const rect = range.getBoundingClientRect();
                       setSlashMenuPos({ top: rect.bottom, left: rect.left });
                       setSlashMenuOpen(true);
                    }
                  } else if (slashMenuOpen && e.key === 'Escape') {
                    setSlashMenuOpen(false);
                  }
                }}
                className="note-editor-content flex-grow w-full bg-transparent focus:outline-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 dark:empty:before:text-stone-600 empty:before:pointer-events-none relative"`;

content = content.replace(oldEditorDiv, newEditorDiv);

// Add the Slash Menu JSX
const oldEnd = `</>
        ) : (`;

const slashMenuJSX = `{slashMenuOpen && (
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
              </div>
            )}
            </>
        ) : (`;

content = content.replace(oldEnd, slashMenuJSX);

fs.writeFileSync('components/NotesSection.tsx', content);
