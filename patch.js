const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf-8');
const search = `{activeTab === 'habits' && (
                    <div className="h-full flex flex-col"> 
                        <div className="h-full pt-8">
                            <HabitTracker 
                                habits={habits} 
                                records={habitRecords} 
                                onOpenHabitCreator={onOpenHabitCreator}
                                onOpenHabitEditor={onOpenHabitEditor}
                                onDeleteHabit={handleDeleteHabit} 
                                onToggleRecord={handleToggleHabitRecord}
                            />
                        </div>
                    </div>
                )}`;
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes("{activeTab === 'habits' && ("));
const end = lines.findIndex((l, i) => i > start && l.includes(")}"));
console.log(start, end);
const targetLines = lines.slice(start, end + 1).join('\n');
console.log(JSON.stringify(targetLines));
