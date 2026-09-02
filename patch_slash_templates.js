import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldSlash = `<button onClick={() => { 
                   const calloutHtml = \`<div class="p-4 my-4 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg flex gap-3"><div class="text-sky-500 font-bold">💡</div><div class="text-sm text-stone-800 dark:text-stone-200 flex-grow">Idea...</div></div><p><br></p>\`;
                   applyRichCommand('insertHTML', calloutHtml); setSlashMenuOpen(false); 
                }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Callout</button>
              </div>`;

const newSlash = `<button onClick={() => { 
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
              </div>`;

content = content.replace(oldSlash, newSlash);
fs.writeFileSync('components/NotesSection.tsx', content);
