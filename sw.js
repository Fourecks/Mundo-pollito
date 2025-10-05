// sw.js

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.title || "Recordatorio de Tarea";
  const options = {
    body: data.body,
    icon: '/favicon.ico', // Puedes cambiar esto por un icono de tu app
    badge: '/favicon.ico', // Icono para Android
    tag: data.tag || 'simple-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Esta parte se puede expandir para que al hacer clic
  // en la notificación, se abra la app en la tarea específica.
  event.waitUntil(
    clients.openWindow('/')
  );
});
