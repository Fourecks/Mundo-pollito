const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

const quickAddStateOld = `    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);`;
const quickAddStateNew = `    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddActiveSheet, setQuickAddActiveSheet] = useState<'main' | 'expense' | 'time'>('main');`;

code = code.replace(quickAddStateOld, quickAddStateNew);

const closeQuickAddOld = `onClick={() => setIsQuickAddOpen(false)}`;
// We want to make sure closing the modal also resets the sheet:
// onClick={() => { setIsQuickAddOpen(false); setTimeout(() => setQuickAddActiveSheet('main'), 300); }}
code = code.replace(/onClick=\{\(\) => setIsQuickAddOpen\(false\)\}/g, `onClick={() => { setIsQuickAddOpen(false); setTimeout(() => setQuickAddActiveSheet('main'), 300); }}`);

const formGastoOld = `                                {/* 4. Gasto */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setIsExpenseModalOpen(true);
                                    }}
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
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setIsTimeModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <span>Tiempo</span>
                                </button>
                            </div>
                        </motion.div>`;

const formGastoNew = `                                {/* 4. Gasto */}
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
                                    const desc = formData.get('description') as string;
                                    const amountStr = formData.get('amount') as string;
                                    const cat = formData.get('category') as string;
                                    const date = formData.get('date') as string;
                                    
                                    if (desc && amountStr && !isNaN(Number(amountStr))) {
                                        const newExp = {
                                            id: crypto.randomUUID(),
                                            project_id: activeProject.id,
                                            description: desc,
                                            amount: Number(amountStr),
                                            date: date || new Date().toISOString().split('T')[0],
                                            category: (cat || 'Other') as any,
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
                                    const desc = formData.get('description') as string;
                                    const minsStr = formData.get('minutes') as string;
                                    const date = formData.get('date') as string;
                                    
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

                        </motion.div>`;

// Need to also wrap the <div className="px-4 space-y-1"> in an AnimatePresence/motion div
const mainSheetStartOld = `<div className="px-4 space-y-1">`;
const mainSheetStartNew = `<AnimatePresence mode="wait">
                            {quickAddActiveSheet === 'main' && (
                            <motion.div 
                                key="main-sheet"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="px-4 space-y-1"
                            >`;

code = code.replace(formGastoOld, formGastoNew);
code = code.replace(mainSheetStartOld, mainSheetStartNew);

fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
