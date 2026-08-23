const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// Replace fullscreen view to use createPortal
let newFullscreen = `
                    {/* FULLSCREEN HUDDLE VIEW */}
                    {isHuddleActive && isHuddleFullScreen && typeof document !== 'undefined' && createPortal(
                        <div className="fixed inset-0 bg-slate-950 text-white z-[100000] flex flex-col p-6 select-none animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}`;

code = code.replace(/\{\/\* FULLSCREEN HUDDLE VIEW \*\/\}\s+\{isHuddleActive && isHuddleFullScreen && \(\s+<div className="fixed inset-0 bg-slate-950 text-white z-\[100000\] flex flex-col p-6 select-none animate-in fade-in zoom-in-95 duration-200">\s+\{\/\* Header \*\/\}/, newFullscreen);

// Find the end of fullscreen view and add `), document.body)`
// Fullscreen view ends before: {/* 2. MAIN CHAT AREA */} or {/* MAIN CHAT AREA */}
let endFullscreenSearch = `                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}`;
let replaceEndFullscreen = endFullscreenSearch.replace(")}", "), document.body)}");
code = code.replace(endFullscreenSearch, replaceEndFullscreen);

fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
console.log("Portal for Fullscreen done.");
