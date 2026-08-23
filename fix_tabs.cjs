const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

let newHeader = `
    const renderProjectHeader = () => {
        return (
            <div className="bg-gray-100 dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                {/* Browser-like Tabs */}
                <div className="flex items-center overflow-x-auto no-scrollbar pt-2 px-2 gap-1 bg-gray-200 dark:bg-black">
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onSelectProject(p.id)}
                            className={\`relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 max-w-[200px] \${
                                activeProjectId === p.id 
                                    ? 'bg-white dark:bg-[#121212] text-gray-900 dark:text-white border-t border-x border-gray-200 dark:border-gray-800 z-10' 
                                    : 'bg-transparent text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-900 hover:text-gray-700 dark:hover:text-gray-300'
                            }\`}
                        >
                            <span className="truncate">{p.name}</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => {
                            if (onOpenProjectEditor) onOpenProjectEditor(null as any);
                            else setIsCreateProjectModalOpen(true);
                        }}
                        className="p-2 ml-1 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-800 rounded-t-lg transition-colors"
                        title="Nuevo Proyecto"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Active Project Title Bar (Minimalist) */}
                {activeProject && (
                    <div className="px-6 py-3 bg-white dark:bg-[#121212] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                                {activeProject.name}
                            </h2>
                            {onOpenProjectEditor && (
                                <button
                                    onClick={() => onOpenProjectEditor(activeProject)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs">
                            {/* Tabs mapped inside header if any */}
                            {renderTabs()}
                        </div>
                    </div>
                )}
                {!activeProject && projects.length === 0 && (
                    <div className="px-6 py-4 bg-white dark:bg-[#121212] flex items-center justify-center text-gray-500 text-sm">
                        No hay proyectos. Crea uno nuevo.
                    </div>
                )}
            </div>
        );
    };
`;

const regex = /const renderProjectHeader = \(\) => \{[\s\S]*?return \([\s\S]*?\};\s+const renderTabs = \(\) => \{/;
code = code.replace(regex, newHeader + "\n\n    const renderTabs = () => {");
fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
console.log("Tabs updated!");
