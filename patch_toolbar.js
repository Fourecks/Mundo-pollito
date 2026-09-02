import fs from 'fs';

let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const oldToolbarStart = `{/* Rich Formatting Toolbar */}`;
const oldToolbarEnd = `{/* Note Editor Inputs */}`;

const startIndex = content.indexOf(oldToolbarStart);
const endIndex = content.indexOf(oldToolbarEnd);

const newToolbar = `{/* Rich Formatting Toolbar */}
            <div className="px-4 py-1.5 border-b border-stone-200/60 dark:border-stone-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-stone-50/30 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300">
              <button onClick={() => applyRichCommand('bold')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('italic')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cursiva"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('underline')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Subrayado"><UnderlineIcon className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('strikeThrough')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('formatBlock', '<h1>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 1"><Heading1 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h2>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 2"><Heading2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h3>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 3"><Heading3 className="w-3.5 h-3.5" /></button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista con viñetas"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></button>
              
              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('formatBlock', '<blockquote>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cita"><Quote className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<pre>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Bloque de código"><Terminal className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const url = prompt('Ingrese URL del enlace:');
                if (url) applyRichCommand('createLink', url);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Enlace"><Link className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const url = prompt('Ingrese URL de la imagen:');
                if (url) applyRichCommand('insertImage', url);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Imagen"><ImageIcon className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const tableHtml = \`<table class="min-w-full divide-y divide-stone-300 dark:divide-stone-700 my-4 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  <thead class="bg-stone-50 dark:bg-stone-900"><tr><th class="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">Header 1</th><th class="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">Header 2</th></tr></thead>
                  <tbody class="divide-y divide-stone-200 dark:divide-stone-800"><tr><td class="px-3 py-2 text-sm">Data 1</td><td class="px-3 py-2 text-sm">Data 2</td></tr></tbody>
                </table><p><br></p>\`;
                applyRichCommand('insertHTML', tableHtml);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Tabla"><TableIcon className="w-3.5 h-3.5" /></button>
              
              <button onClick={() => {
                const calloutHtml = \`<div class="p-4 my-4 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg flex gap-3">
                  <div class="text-sky-500 font-bold">💡</div>
                  <div class="text-sm text-stone-800 dark:text-stone-200 flex-grow">Llamado de atención / Idea...</div>
                </div><p><br></p>\`;
                applyRichCommand('insertHTML', calloutHtml);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Callout (Idea/Nota)"><AlertCircle className="w-3.5 h-3.5" /></button>
              
              <button onClick={() => applyRichCommand('insertHorizontalRule')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Línea divisoria"><Minus className="w-3.5 h-3.5" /></button>
            </div>
            
            `;

content = content.substring(0, startIndex) + newToolbar + content.substring(endIndex);

fs.writeFileSync('components/NotesSection.tsx', content);
