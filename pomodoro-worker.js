// pomodoro-worker.js -> now a Service Worker

let timerId = null;
let targetTime = 0;
let remainingTimeAtPause = 0;
let currentMode = 'work';
let isActive = false;

// Function to send a message to all connected clients (browser tabs)
function postToClients(message) {
    self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
    }).then((clients) => {
        if (clients && clients.length) {
            clients.forEach((client) => {
                client.postMessage(message);
            });
        }
    });
}

// The main timer loop function, resilient to suspension
function tick() {
    if (!isActive) return;

    const remaining = targetTime - Date.now();
    
    if (remaining <= 0) {
        // Timer finished
        postToClients({ type: 'tick', timeLeft: 0 });
        
        const message = currentMode === 'work' 
            ? "¡Tiempo de descanso! Buen trabajo." 
            : "¡De vuelta al trabajo! Tú puedes.";

        // Use the Service Worker's ability to show system notifications
        self.registration.showNotification("Pomodoro Terminado", {
            body: message,
            icon: "https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito-icon-192.png",
            vibrate: [200, 100, 200], // Vibrate pattern
        });
        
        // Notify clients that the timer phase is complete
        postToClients({ type: 'completed', mode: currentMode });
        
        if (timerId) clearTimeout(timerId);
        timerId = null;
        isActive = false;
        remainingTimeAtPause = 0;
        targetTime = 0;

    } else {
        // Timer is still running, post an update and schedule the next tick
        postToClients({ type: 'tick', timeLeft: Math.round(remaining / 1000) });
        timerId = setTimeout(tick, 1000); // Check again in a second
    }
}

self.addEventListener('message', (event) => {
    const { type, timeLeft, mode } = event.data;

    switch (type) {
        case 'start':
            // Set the target timestamp for when the timer should end
            targetTime = Date.now() + (remainingTimeAtPause > 0 ? remainingTimeAtPause : timeLeft * 1000);
            remainingTimeAtPause = 0;
            currentMode = mode;
            isActive = true;
            if (timerId) clearTimeout(timerId);
            tick(); // Start the timer loop
            break;

        case 'pause':
            if (timerId) clearTimeout(timerId);
            timerId = null;
            isActive = false;
            // Store the remaining time when paused
            if (targetTime > 0) {
               remainingTimeAtPause = targetTime - Date.now();
            }
            break;

        case 'reset':
            if (timerId) clearTimeout(timerId);
            timerId = null;
            isActive = false;
            remainingTimeAtPause = 0;
            targetTime = 0;
            break;
    }
});

// Standard service worker lifecycle events
// These ensure the service worker activates quickly and takes control of the page
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
