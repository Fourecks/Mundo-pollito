const fs = require('fs');
let code = fs.readFileSync('components/TodaysAgenda.tsx', 'utf8');

const oldStr = `             <div
                id="main-daily-goal-container"
               className={\`rounded-xl p-2.5 mb-2.5 border transition-all duration-300 shadow-sm \${
                 isGoalCompleted 
                   ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                   : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
               }\`}
             >
                {/* Header with Badge & Status */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className={\`p-1 rounded-md flex items-center justify-center \${
                          isGoalCompleted 
                             ? 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-xs' 
                             : 'bg-amber-500 text-white dark:bg-amber-600 shadow-xs'
                        }\`}>
                            <Target className="w-3.5 h-3.5" />
                        </span>
                        <span className={\`text-[11px] font-bold uppercase tracking-wider \${
                          isGoalCompleted 
                             ? 'text-emerald-700 dark:text-emerald-300' 
                             : 'text-amber-800 dark:text-amber-300'
                        }\`}>
                            Meta Principal del Día
                        </span>
                    </div>`;

const newStr = `             <div
                id="main-daily-goal-container"
               className={\`rounded-lg p-3 mb-3 border transition-all duration-200 \${
                 isGoalCompleted 
                   ? 'bg-gray-50/50 border-transparent dark:bg-gray-800/30'
                   : 'bg-white dark:bg-[#111] shadow-sm border-gray-200 dark:border-gray-800'
               }\`}
             >
                {/* Header with Badge & Status */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 opacity-80">
                        <Target className={\`w-3.5 h-3.5 \${isGoalCompleted ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}\`} />
                        <span className={\`text-[10px] font-medium tracking-wide uppercase \${isGoalCompleted ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}\`}>
                            Objetivo del Día
                        </span>
                    </div>`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('components/TodaysAgenda.tsx', code);
