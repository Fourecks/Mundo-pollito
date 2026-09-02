import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const sidebarEnd = `            {/* Trash & Archive */}`;

const tagsSection = `            {/* Tags */}
            {allTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mt-4 mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Etiquetas</span>
              </div>
              <div className="flex flex-wrap gap-1 px-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={\`text-[10px] px-2 py-0.5 rounded-full transition-colors \${selectedTag === tag ? 'bg-sky-500 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700'}\`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
            )}

`;

content = content.replace(sidebarEnd, tagsSection + sidebarEnd);

// Add Sort dropdown in the notes list header
const listHeaderOld = `          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/80 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-2">`;

const listHeaderNew = `          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/80 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 flex items-center gap-2">`;

content = content.replace(listHeaderOld, listHeaderNew);

fs.writeFileSync('components/NotesSection.tsx', content);
