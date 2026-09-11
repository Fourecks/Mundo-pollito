const fs = require('fs');
let code = fs.readFileSync('components/MobileTaskDrawer.tsx', 'utf-8');

// We want to add layout to all framer-motion elements to avoid flicker during changes

const oldSheetContent = `<motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white dark:bg-[#111114] w-full max-w-xl rounded-t-[28px] border-t border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-sans"
                        onClick={e => e.stopPropagation()}
                    >`;

const newSheetContent = `<motion.div 
                        layout
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white dark:bg-[#111114] w-full max-w-xl rounded-t-[28px] border-t border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden font-sans"
                        onClick={e => e.stopPropagation()}
                    >`;

code = code.replace(oldSheetContent, newSheetContent);
fs.writeFileSync('components/MobileTaskDrawer.tsx', code);
