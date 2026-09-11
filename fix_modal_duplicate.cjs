const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// There seem to be multiple Modal definitions in ProjectsWorkspace.tsx, let's find the first one
// and make sure it has AnimatePresence

const modalRegex = /const Modal = \(\{ isOpen, onClose, title, children, showBackButton, onBack \}: \{ isOpen: boolean, onClose: \(\) => void, title: (string|React\.ReactNode), children: React\.ReactNode, showBackButton\?: boolean, onBack\?: \(\) => void \}\) => \{[\s\S]*?if \(!isOpen\) return null;[\s\S]*?<div[\s\S]*?animate-in[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\};/;

const newModalCode = `const Modal = ({ isOpen, onClose, title, children, showBackButton, onBack }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, showBackButton?: boolean, onBack?: () => void }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[90000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white dark:bg-[#111114] border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden text-zinc-900 dark:text-zinc-100" 
                        onClick={(e) => e.stopPropagation()}
                    >
                {/* Mobile drag / handle indicator */}
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 sm:hidden shrink-0" />

                <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        {showBackButton && (
                            <button
                                onClick={onBack || onClose}
                                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                title="Volver atrás"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        {typeof title === 'string' ? <h3 className="font-bold text-[15px]">{title}</h3> : title}
                    </div>
                    {!showBackButton && (
                        <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="overflow-y-auto p-5 shrink">
                    {children}
                </div>
            </motion.div>
        </div>
        )}
        </AnimatePresence>
    );
};`;

code = code.replace(modalRegex, newModalCode);
fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
