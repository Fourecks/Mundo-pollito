const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf8');

const startIndex = code.indexOf('    const renderTeam = () => {');
const endIndexStr = '    const renderActivity = () => {';
const endIndex = code.indexOf(endIndexStr);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find start or end index.");
    process.exit(1);
}

const newTeam = `    const renderTeam = () => {
        if (!activeProject) return null;
        
        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Equipo del Proyecto</h2>
                        <p className="text-sm text-gray-500 mt-1">Gestiona los miembros y el chat grupal.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.open('https://meet.google.com/new', '_blank')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                            <Video className="w-4 h-4" /> Meet
                        </button>
                        <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4" /> Invitar
                        </button>
                    </div>
                </div>

                {isInviteModalOpen && (
                    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Invitar al equipo</h3>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre de usuario o correo..." 
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none transition-all"
                                />
                            </div>
                            <button className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50" disabled={!inviteEmail}>
                                Enviar Invitación
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Miembros</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-black font-bold text-xs">
                                        YO
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">Tú (Propietario)</p>
                                        <p className="text-xs text-gray-500">Admin</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Chat Grupal</h3>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col h-[400px] shadow-sm">
                            <div className="flex-1 p-4 flex flex-col justify-end bg-gray-50/50 dark:bg-[#0a0a0a]/50">
                                <div className="text-center text-sm text-gray-500 my-auto">
                                    No hay mensajes recientes en el proyecto.
                                </div>
                            </div>
                            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Escribe un mensaje al equipo..." className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none transition-all" />
                                    <button className="bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-black p-2 rounded-lg transition-colors">
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

`;

code = code.substring(0, startIndex) + newTeam + code.substring(endIndex);
fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
