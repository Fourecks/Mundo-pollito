const fs = require('fs');
let code = fs.readFileSync('components/MobileTasks.tsx', 'utf-8');

const oldCode = `                    onEditTask={(_, text, options) => {
                        if (activeEditingTask && onUpdateTodo) {
                             const updatedTask = { ...activeEditingTask, text, ...options };
                             onUpdateTodo(updatedTask);
                        }
                    }}`;

const newCode = `                    onEditTask={(_, text, options) => {
                        if (activeEditingTask && onUpdateTodo) {
                             const updatedTask = { 
                                 ...activeEditingTask, 
                                 text,
                                 due_date: options.dueDate !== undefined ? options.dueDate : activeEditingTask.due_date,
                                 end_date: options.endDate !== undefined ? options.endDate : activeEditingTask.end_date,
                                 start_time: options.startTime !== undefined ? options.startTime : activeEditingTask.start_time,
                                 end_time: options.endTime !== undefined ? options.endTime : activeEditingTask.end_time,
                                 recurrence: options.recurrence !== undefined ? options.recurrence : activeEditingTask.recurrence,
                                 reminder_offset: options.reminder_offset !== undefined ? options.reminder_offset : activeEditingTask.reminder_offset,
                                 notes: options.notes !== undefined ? options.notes : activeEditingTask.notes,
                                 subtasks: options.subtasks !== undefined ? options.subtasks : activeEditingTask.subtasks,
                                 priority: options.priority !== undefined ? options.priority : activeEditingTask.priority,
                                 project_id: options.projectId !== undefined ? options.projectId : activeEditingTask.project_id,
                                 assignee: options.assignee !== undefined ? options.assignee : activeEditingTask.assignee
                             };
                             onUpdateTodo(updatedTask);
                        }
                    }}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('components/MobileTasks.tsx', code);
