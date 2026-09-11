const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// The Modal component definition in ProjectsWorkspace.tsx
const oldModalDef = `const Modal = ({ isOpen, onClose, title, children, showBackButton, onBack }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, showBackButton?: boolean, onBack?: () => void }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[90000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-[#111114] border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200 text-zinc-900 dark:text-zinc-100" 
                onClick={(e) => e.stopPropagation()}
            >`;

const newModalDef = `const Modal = ({ isOpen, onClose, title, children, showBackButton, onBack }: { isOpen: boolean, onClose: () => void, title: React.ReactNode, children: React.ReactNode, showBackButton?: boolean, onBack?: () => void }) => {
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
                    >`;

code = code.replace(oldModalDef, newModalDef);

const oldModalEnd = `                    </div>
                </div>
                <div className="overflow-y-auto p-5 shrink">
                    {children}
                </div>
            </div>
        </div>
    );
};`;

const newModalEnd = `                    </div>
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

code = code.replace(oldModalEnd, newModalEnd);

fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
