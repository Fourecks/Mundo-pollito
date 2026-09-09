const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf8');

const targetState = `    const [mobileKanbanColumn, setMobileKanbanColumn] = useState<string>('');`;
const newState = targetState + `\n    const [touchStartX, setTouchStartX] = useState<number | null>(null);`;
code = code.replace(targetState, newState);

const targetDiv = `<div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#080808] space-y-3 pb-24">`;
const newDiv = `<div 
                    className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#080808] space-y-3 pb-24"
                    onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                        if (touchStartX === null) return;
                        const diff = touchStartX - e.changedTouches[0].clientX;
                        const currentIndex = columns.indexOf(activeMobileCol);
                        if (diff > 50 && currentIndex < columns.length - 1) {
                            setMobileKanbanColumn(columns[currentIndex + 1]);
                        } else if (diff < -50 && currentIndex > 0) {
                            setMobileKanbanColumn(columns[currentIndex - 1]);
                        }
                        setTouchStartX(null);
                    }}
                >`;

code = code.replace(targetDiv, newDiv);
fs.writeFileSync('components/ProjectsWorkspace.tsx', code);
console.log("Success");
