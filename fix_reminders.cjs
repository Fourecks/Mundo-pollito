const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /flatAllTodos\.forEach\(\(todo: Todo\) => \{[\s\S]*?\}\);/g;

const replacement = `flatAllTodos.forEach((todo: Todo) => {
              if (todo.completed) return;
              if (!todo.reminder_at) return;
              const reminderKey = \`\${todo.id}_\${todo.reminder_at}\`;
              if (notifiedTaskIdsRef.current.has(reminderKey)) return;
              const reminderTime = new Date(todo.reminder_at);
              if (isNaN(reminderTime.getTime())) return;
              const rYear = reminderTime.getFullYear();
              const rMonth = reminderTime.getMonth() + 1;
              const rDay = reminderTime.getDate();
              const rHour = reminderTime.getHours();
              const rMinute = reminderTime.getMinutes();
              const isToday = (
                  rYear === currentYear &&
                  rMonth === currentMonth &&
                  rDay === currentDay
              );
              if (isToday && rHour === currentHour && Math.abs(rMinute - currentMinute) <= 1) {
                  notifiedTaskIdsRef.current.add(reminderKey);
                  sendPushNotification({
                      title: \`⏰ Recordatorio de tarea\`,
                      message: \`Es hora de: "\${todo.text}"\`,
                      eventType: 'taskReminders'
                  }, uiSettings?.pushPreferences);
              }
          });`;

code = code.replace(regex, replacement);
fs.writeFileSync('App.tsx', code);
