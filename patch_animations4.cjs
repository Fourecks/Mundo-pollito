const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// Use framer-motion layout to avoid flicker
const oldMotionDiv = `<motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden pb-8 font-sans"
                            onClick={e => e.stopPropagation()}
                        >`;

const newMotionDiv = `<motion.div 
                            layout
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden pb-8 font-sans"
                            onClick={e => e.stopPropagation()}
                        >`;

code = code.replace(oldMotionDiv, newMotionDiv);
fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
