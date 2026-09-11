const fs = require('fs');
let code = fs.readFileSync('components/MobileTasks.tsx', 'utf-8');

const oldModalDef = `const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">`;

const newModalDef = `const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                        onClick={onClose} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white dark:bg-[#1c1c1e] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" 
                        onClick={e => e.stopPropagation()}
                    >
                <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">`;

code = code.replace(oldModalDef, newModalDef);

const oldModalEnd = `                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};`;

const newModalEnd = `                </div>
                <div className="p-5">
                    {children}
                </div>
            </motion.div>
        </div>
        )}
        </AnimatePresence>
    );
};`;

code = code.replace(oldModalEnd, newModalEnd);
fs.writeFileSync('components/MobileTasks.tsx', code);
