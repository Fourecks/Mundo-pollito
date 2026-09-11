const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// I replaced quickAddRegex with newQuickAdd. Let's see what was matched.
// The regex was: /<AnimatePresence>[\s\S]*?\{isQuickAddOpen && \([\s\S]*?<div className="fixed inset-0 z-\[100020\] flex items-end justify-center">[\s\S]*?<\/AnimatePresence>/
// Let's replace the whole file from the beginning of <AnimatePresence> {isQuickAddOpen to the end.

// Since the file is messed up, I will just write a script to find the start and end and replace it correctly.
const quickAddStartStr = '<AnimatePresence>\n                {isQuickAddOpen && (';
// Find its position.
const startIndex = code.indexOf(quickAddStartStr);
if (startIndex !== -1) {
    // Find the NEXT <ProjectNoteEditorModal in the code.
    const projectNoteIndex = code.indexOf('{/* MODAL EDITOR ENRIQUECIDO DE NOTAS DEL PROYECTO */}', startIndex);
    if (projectNoteIndex !== -1) {
        // The stuff in between is the quickAdd modal.
        const originalCode = code.substring(startIndex, projectNoteIndex);
        
        // I want to replace the WHOLE chunk with the new quick add code.
        const newCode = `<AnimatePresence>
                {isQuickAddOpen && (
                    <div className="fixed inset-0 z-[100020] flex items-end justify-center">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
                            onClick={() => { setIsQuickAddOpen(false); setTimeout(() => setQuickAddActiveSheet('main'), 300); }} 
                        />
                        <motion.div 
                            layout
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden pb-8 font-sans"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-center py-3.5 cursor-pointer" onClick={() => { setIsQuickAddOpen(false); setTimeout(() => setQuickAddActiveSheet('main'), 300); }}>
                                <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                            </div>
                            <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Agregar al proyecto
                                </span>
                            </div>

                            <AnimatePresence mode="wait">
                            {quickAddActiveSheet === 'main' && (
                            <motion.div 
                                key="main-sheet"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="px-4 space-y-1"
                            >
                                {/* 1. Nueva tarea */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setKanbanAddModalCol(null);
                                        setShowQuickAddTaskModal(true);
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <CheckSquare className="w-4 h-4" />
                                    </div>
                                    <span>Nueva tarea</span>
                                </button>
                                {/* 2. Nota */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        handleCreateProjectNote();
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <span>Nota</span>
                                </button>
                                {/* 3. Archivo */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setActiveTab('docs');
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <Paperclip className="w-4 h-4" />
                                    </div>
                                    <span>Archivo</span>
                                </button>
                                {/* 4. Gasto */}
                                <button
                                    type="button"
                                    onClick={() => setQuickAddActiveSheet('expense')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                    <span>Gasto</span>
                                </button>
                                {/* 5. Registrar tiempo */}
                                <button
                                    type="button"
                                    onClick={() => setQuickAddActiveSheet('time')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <span>Tiempo</span>
                                </button>
                            </motion.div>
                            )}

                            {quickAddActiveSheet === 'expense' && (
                            <motion.div
                                key="expense-sheet"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="px-4 space-y-3 pb-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <button onClick={() => setQuickAddActiveSheet('main')} className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Registrar Gasto</h3>
                                </div>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!activeProject) return;
                                    const formData = new FormData(e.currentTarget);
                                    const desc = formData.get('description');
                                    const amountStr = formData.get('amount');
                                    const cat = formData.get('category');
                                    const date = formData.get('date');
                                    
                                    if (desc && amountStr && !isNaN(Number(amountStr))) {
                                        const newExp = {
                                            id: crypto.randomUUID(),
                                            project_id: activeProject.id,
                                            description: desc,
                                            amount: Number(amountStr),
                                            date: date || new Date().toISOString().split('T')[0],
                                            category: (cat || 'Other'),
                                            created_at: new Date().toISOString(),
                                            created_by: currentUserEmail || 'usuario@local.com',
                                            created_by_name: currentUserName
                                        };
                                        const updated = [...(activeProject.expenses || []), newExp];
                                        updateProject(activeProject.id, { expenses: updated });
                                        setIsQuickAddOpen(false);
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }
                                }} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                        <input name="description" type="text" required placeholder="Ej. Dominio anual" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monto ($)</label>
                                            <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                                        <select name="category" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm">
                                            <option value="Software">Software & SaaS</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Services">Servicios Profesionales</option>
                                            <option value="Hardware">Equipamiento</option>
                                            <option value="Other">Otros</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">Guardar Gasto</button>
                                </form>
                            </motion.div>
                            )}

                            {quickAddActiveSheet === 'time' && (
                            <motion.div
                                key="time-sheet"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="px-4 space-y-3 pb-4"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <button onClick={() => setQuickAddActiveSheet('main')} className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Registrar Tiempo</h3>
                                </div>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!activeProject) return;
                                    const formData = new FormData(e.currentTarget);
                                    const desc = formData.get('description');
                                    const minsStr = formData.get('minutes');
                                    const date = formData.get('date');
                                    
                                    if (desc && minsStr && !isNaN(Number(minsStr))) {
                                        const newTime = {
                                            id: crypto.randomUUID(),
                                            project_id: activeProject.id,
                                            description: desc,
                                            minutes: Number(minsStr),
                                            date: date || new Date().toISOString().split('T')[0],
                                            created_at: new Date().toISOString(),
                                            created_by: currentUserEmail || 'usuario@local.com',
                                            created_by_name: currentUserName
                                        };
                                        const updated = [...(activeProject.time_entries || []), newTime];
                                        updateProject(activeProject.id, { time_entries: updated });
                                        setIsQuickAddOpen(false);
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }
                                }} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">¿En qué trabajaste?</label>
                                        <input name="description" type="text" required placeholder="Ej. Diseño de base de datos" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Minutos</label>
                                            <input name="minutes" type="number" step="1" required placeholder="60" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">Guardar Tiempo</button>
                                </form>
                            </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            `;
            
        code = code.substring(0, startIndex) + newCode + code.substring(projectNoteIndex);
        fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
        console.log('Fixed correctly');
    }
}
