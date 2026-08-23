const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

let newBar = `
                                {/* 3. HUDDLE ACTIVE AUDIO/VIDEO BAR (PiP mode) */}
                                {isHuddleActive && !isHuddleFullScreen && typeof document !== 'undefined' && createPortal(
                                    <div className="fixed bottom-24 right-4 z-[90000] w-[400px] max-w-[90vw] rounded-2xl shadow-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 text-white p-4 animate-in fade-in slide-in-from-bottom-8">
                                        <div className="flex flex-col gap-4">`;

code = code.replace(/\{\/\* 3\. HUDDLE ACTIVE AUDIO\/VIDEO BAR \*\/\}\s+\{isHuddleActive && \(\s+<div className="bg-gradient-to-r from-slate-900 via-\[\#1e293b\] to-slate-900 text-white p-4 shrink-0 shadow-lg border-b border-slate-800">\s+<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">/, newBar);

let endBarSearch = `                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}`;
let replaceEndBar = endBarSearch.replace(")}", "), document.body)}");
code = code.replace(endBarSearch, replaceEndBar);

fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
console.log("Portal for PiP Bar done.");
