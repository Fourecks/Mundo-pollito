// sw.js

// Este evento se dispara cuando el service worker recibe una notificación push del servidor.
self.addEventListener('push', function(event) {
  // Intentamos parsear los datos de la notificación. Si no hay datos, mostramos un mensaje por defecto.
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || "Recordatorio de Pollito";
  const options = {
    body: data.body || '¡Tienes una tarea pendiente!',
    icon: '/favicon.ico', // Icono que aparece en la notificación (puedes cambiarlo)
    badge: '/favicon.ico', // Icono para la barra de notificaciones de Android
    tag: data.tag || 'recordatorio-general', // Agrupa notificaciones similares
    renotify: true, // Vibra o suena aunque ya haya una notificación con el mismo tag
  };

  // Le decimos al navegador que muestre la notificación con el título y las opciones definidas.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Este evento se dispara cuando el usuario hace clic en la notificación.
self.addEventListener('notificationclick', function(event) {
  // Cerramos la notificación en la que se hizo clic.
  event.notification.close();
  
  // Le decimos al navegador que abra la aplicación.
  // Esto se puede mejorar para que abra la tarea específica si la URL se pasa en los datos del push.
  event.waitUntil(
    clients.openWindow('/')
  );
});
