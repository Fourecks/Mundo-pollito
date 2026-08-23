import { PushNotificationPreferences } from '../types';
import { supabase } from '../supabaseClient';

export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  projectMembers: true,
  taskReminders: true,
  channelMentions: true,
};

export type NotificationEventType = 'projectMembers' | 'taskReminders' | 'channelMentions' | 'general';

export interface PushNotificationPayload {
  title: string;
  message: string;
  eventType?: NotificationEventType;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Synchronize user notification preferences with OneSignal Tags.
 * OneSignal Web SDK v16 uses OneSignal.User.addTags({ ... })
 */
export async function syncPreferencesToOneSignal(
  preferences: PushNotificationPreferences
): Promise<{ success: boolean; tags: Record<string, string>; error?: string }> {
  const tags: Record<string, string> = {
    notify_project_members: preferences.projectMembers ? 'true' : 'false',
    notify_task_reminders: preferences.taskReminders ? 'true' : 'false',
    notify_channel_mentions: preferences.channelMentions ? 'true' : 'false',
    updated_at: new Date().toISOString(),
  };

  try {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal?.User) {
      if (typeof OneSignal.User.addTags === 'function') {
        await OneSignal.User.addTags(tags);
      } else if (typeof OneSignal.User.addTag === 'function') {
        for (const [key, value] of Object.entries(tags)) {
          await OneSignal.User.addTag(key, value);
        }
      }
      return { success: true, tags };
    }
    return { success: true, tags };
  } catch (err: any) {
    console.debug('OneSignal tag synchronization note:', err?.message || err);
    return { success: false, tags, error: err?.message || 'Error al sincronizar con OneSignal' };
  }
}

/**
 * Read active tags from OneSignal User if available.
 */
export async function getOneSignalUserTags(): Promise<Record<string, string> | null> {
  try {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal?.User && typeof OneSignal.User.getTags === 'function') {
      return await OneSignal.User.getTags();
    }
  } catch (err) {
    console.debug('Could not get OneSignal user tags:', err);
  }
  return null;
}

/**
 * Check if a specific notification type is allowed based on user preferences.
 */
export function isEventNotificationAllowed(
  eventType: NotificationEventType,
  preferences?: PushNotificationPreferences
): boolean {
  const current = preferences || DEFAULT_PUSH_PREFERENCES;
  if (eventType === 'projectMembers') return !!current.projectMembers;
  if (eventType === 'taskReminders') return !!current.taskReminders;
  if (eventType === 'channelMentions') return !!current.channelMentions;
  return true; // General is always allowed
}

/**
 * Send a push notification through Supabase Edge Function (OneSignal)
 * with event-type filtering and local fallback.
 */
export async function sendPushNotification(
  payload: PushNotificationPayload,
  preferences?: PushNotificationPreferences
): Promise<{ sent: boolean; reason?: string }> {
  const { title, message, eventType = 'general' } = payload;

  // Check event preference
  if (!isEventNotificationAllowed(eventType, preferences)) {
    return { sent: false, reason: `Notificaciones de ${eventType} desactivadas por el usuario` };
  }

  try {
    const { error } = await supabase.functions.invoke('send-pushalert-notification', {
      body: {
        title,
        message,
        event_type: eventType,
        url: payload.url || window.location.href,
        data: payload.data || {},
      },
    });

    if (error) {
      console.debug('Supabase push notification invoke note:', error.message);
    }

    // Also trigger browser Notification API if available & permitted as immediate feedback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (notifErr) {
        // Safe ignore in restricted iframe
      }
    }

    return { sent: true };
  } catch (err: any) {
    console.debug('Push notification send notice:', err?.message || err);
    return { sent: false, reason: err?.message || 'Error al enviar notificación' };
  }
}

/**
 * Trigger an instant sample notification for the requested event type.
 */
export async function sendSampleNotificationForEvent(
  eventType: NotificationEventType,
  preferences?: PushNotificationPreferences
): Promise<{ sent: boolean; title: string; message: string; reason?: string }> {
  let title = '¡Notificación de Prueba! 🔔';
  let message = 'Tus notificaciones de OneSignal están configuradas correctamente.';

  switch (eventType) {
    case 'projectMembers':
      title = '👥 Nuevo miembro en el proyecto';
      message = 'Ana Gómez se ha unido como colaboradora al proyecto "Rediseño Web".';
      break;
    case 'taskReminders':
      title = '⏰ Recordatorio de Tarea';
      message = 'Tu tarea "Revisar entrega de sprint" vence en 15 minutos.';
      break;
    case 'channelMentions':
      title = '💬 @Mención en canal #general';
      message = 'Carlos te mencionó: "@tu_usuario ¿puedes revisar el nuevo documento adjunto?"';
      break;
    case 'general':
    default:
      title = '🔔 Notificación de Prueba OneSignal';
      message = '¡Tus preferencias de notificación están activadas y sincronizadas!';
      break;
  }

  const result = await sendPushNotification({ title, message, eventType }, preferences);
  return { ...result, title, message };
}
